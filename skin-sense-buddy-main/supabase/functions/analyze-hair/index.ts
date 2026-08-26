import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { normalizeAnalysis, qualityScoreFromCaptureInfo } from "../_shared/scanContract.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  let activeScanId: string | null = null;
  let activeSupabaseClient: ReturnType<typeof createClient> | null = null;
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
    activeSupabaseClient = supabaseClient;

    // Get user from auth header
    const authHeader = req.headers.get('Authorization') || '';
    const accessToken = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!accessToken) {
      throw new Error('Unauthorized');
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(accessToken);

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { scanId, imageUrl, multiAngleUrls, calibration, preview = false, analysisScope = 'hair', scanMode = 'hair' } = await req.json();
    activeScanId = typeof scanId === 'string' ? scanId : null;
    const normalizedScope = analysisScope === 'scalp' || analysisScope === 'full' ? analysisScope : 'hair';
    const isPreview = preview === true;

    console.log('Analyzing hair scan:', scanId, 'for user:', user.id);

    // Fetch user profile for personalization
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Fetch scan details
    const { data: scan } = await supabaseClient
      .from('scans')
      .select('*')
      .eq('id', scanId)
      .single();

    if (!scan || scan.user_id !== user.id) {
      throw new Error('Scan not found or unauthorized');
    }

    const captureInfo = scan.capture_info || (scan.image_metadata && typeof scan.image_metadata === 'object' ? scan.image_metadata.scan_capture : null);
    const qualityScore = qualityScoreFromCaptureInfo(captureInfo);
    const qualityRows = Array.isArray(captureInfo?.quality_scores) ? captureInfo.quality_scores : [];
    const qualityRejected = qualityRows.some((row: Record<string, unknown>) => {
      const scanQuality = row?.scan_quality;
      return scanQuality && typeof scanQuality === 'object' && (scanQuality as Record<string, unknown>).status === 'retake';
    });
    if (qualityRejected) {
      throw new Error('Image quality is below the reliable analysis threshold. Please retake the flagged view.');
    }

    // Update scan status to analyzing
    await supabaseClient
      .from('scans')
      .update({ status: 'analyzing' })
      .eq('id', scanId);

    const startTime = Date.now();

    // Call the configured OpenAI-compatible provider for hair analysis.
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') || Deno.env.get('AI_INTEGRATIONS_OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured');
    }
    const OPENAI_BASE_URL = (
      Deno.env.get('OPENAI_BASE_URL') ||
      Deno.env.get('AI_INTEGRATIONS_OPENAI_BASE_URL') ||
      'https://api.openai.com/v1'
    ).replace(/\/+$/, '');
    const OPENAI_MODEL = Deno.env.get('OPENAI_MODEL') || 'gpt-4o-mini';

    // Prepare context for AI with hair-specific data
    const userContext = {
      age: profile?.age || 'unknown',
      sex: profile?.sex || 'unknown',
      hair_type: profile?.hair_type || 'unknown',
      hair_porosity: profile?.hair_porosity || 'unknown',
      hair_density: profile?.hair_density || 'unknown',
      hair_length: profile?.hair_length || 'unknown',
      is_chemically_treated: profile?.is_chemically_treated || false,
      chemical_treatments: profile?.chemical_treatments || [],
      scalp_condition: profile?.scalp_condition || 'unknown',
      hair_concerns: profile?.hair_concerns || [],
      allergies: profile?.allergies || [],
      medications: profile?.current_medications || [],
    };

    const hasMultiAngle = multiAngleUrls && Object.keys(multiAngleUrls).length > 1;
    const hasCalibration = calibration && calibration.pixelsPerMM;

    const scopeInstruction = normalizedScope === 'scalp'
      ? 'This is a SCALP-focused review. Assess only visible patterns such as dryness, scaling, buildup, redness, irritation, follicle visibility, density change, and hairline appearance. Do not diagnose fungal infection, alopecia, psoriasis, dermatitis, or another medical disorder from a photograph. Where appropriate say: Visual pattern detected — professional assessment recommended.'
      : normalizedScope === 'full'
        ? 'This is part of a FULL CARE SCAN. Give a hair and visible scalp assessment, keep medical claims qualified, and clearly separate visual observation from professional assessment.'
        : 'This is a HAIR-focused review. Assess visible hair pattern, texture, density, damage, moisture, breakage, hairline, and visible scalp indicators.';
    const fullSystemPrompt = `You are an advanced trichology and hair analysis AI with expertise in African/Nigerian hair types (Type 3C-4C), relaxed hair, and transitioning hair.

ANALYSIS SCOPE: ${normalizedScope.toUpperCase()} (${scanMode})
${scopeInstruction}

USER CONTEXT: ${JSON.stringify(userContext)}
${hasCalibration ? `SCALE CALIBRATION: ${calibration.pixelsPerMM.toFixed(2)} pixels/mm using ${calibration.referenceType}` : ''}
${hasMultiAngle ? `MULTI-ANGLE DATA: Available angles: ${Object.keys(multiAngleUrls).join(', ')}` : ''}

HAIR ANALYSIS REQUIREMENTS:
1. Hair Texture Classification (3A, 3B, 3C, 4A, 4B, 4C, relaxed, transitioning, locs)
2. Porosity Assessment (low, normal, high) with visual indicators
3. Hair Density (fine, medium, thick/coarse)
4. Strand Health Assessment (elasticity, breakage points, split ends)
5. Scalp Health Analysis:
   - Dryness/flaking level
   - Product buildup detection
   - Dandruff/seborrheic dermatitis indicators
   - Scalp inflammation
   - Follicle health
6. Moisture/Protein Balance
7. Chemical Damage Assessment (relaxer damage, heat damage, color damage)
8. Traction Alopecia indicators (common with tight protective styles)
9. Hair Thinning patterns
10. Product Buildup Detection (silicone, mineral deposits)

NIGERIAN HAIR EXPERTISE:
- Understand Type 4 hair patterns (4A: defined S-curls, 4B: Z-pattern, 4C: tight coils with minimal definition)
- Recognize relaxer damage patterns and regrowth lines
- Identify transitioning hair (natural/relaxed line of demarcation)
- Consider humidity/climate effects typical for Nigerian weather
- Recommend for protective styles (braids, locs, twists, weaves)

TRIAGE LEVELS:
- self_care: Can be managed with proper hair care routine
- see_trichologist: Should consult a hair specialist
- see_dermatologist: Scalp condition requires dermatological attention
- urgent_care: Signs of severe infection or inflammation

Return ONLY valid JSON in this exact format:
{
  "hair_texture": {
    "type": "4C",
    "pattern_description": "Tight coils with minimal definition",
    "curl_pattern_uniformity": "uniform|mixed",
    "confidence": 92
  },
  "porosity": {
    "level": "high",
    "indicators": ["quick water absorption", "frizzy appearance", "difficulty retaining moisture"],
    "test_recommendation": "Float test: hair sinks quickly",
    "confidence": 88
  },
  "density": {
    "level": "thick",
    "strand_thickness": "coarse",
    "overall_volume": "high"
  },
  "scalp_health": {
    "overall_score": 75,
    "conditions": [
      {
        "condition": "dry scalp",
        "severity": "moderate",
        "confidence": 85,
        "explanation": "Visible flaking and dryness between partings"
      }
    ],
    "product_buildup": {
      "detected": true,
      "level": "moderate",
      "areas": ["crown", "edges"]
    },
    "inflammation": false,
    "follicle_health": "good"
  },
  "strand_health": {
    "overall_score": 70,
    "elasticity": "low",
    "breakage_level": "moderate",
    "split_ends": "present",
    "damage_type": ["heat damage", "mechanical damage"],
    "weak_points": ["mid-shaft", "ends"]
  },
  "moisture_protein_balance": {
    "status": "moisture_deficient",
    "recommendation": "Increase deep conditioning, reduce protein treatments"
  },
  "chemical_status": {
    "is_chemically_treated": true,
    "treatment_type": "relaxer",
    "damage_level": "moderate",
    "regrowth_length_cm": 3,
    "line_of_demarcation": "visible"
  },
  "conditions": [
    {
      "condition": "Dry Scalp with Flaking",
      "confidence": 85,
      "severity": "moderate",
      "explanation": "Visible dry patches and flaking on scalp, likely due to product buildup and insufficient moisture"
    }
  ],
  "primary_condition": "Dry Scalp with Product Buildup",
  "confidence_score": 85,
  "severity": "moderate",
  "triage_level": "self_care",
  "treatment_recommendations": {
    "immediate": ["Clarifying wash to remove buildup", "Scalp oil treatment"],
    "weekly_routine": ["Deep conditioning", "Scalp massage with oils"],
    "products_to_use": ["Sulfate-free shampoo", "Leave-in conditioner", "Natural oils (coconut, jojoba)"],
    "products_to_avoid": ["Heavy silicones", "Alcohol-based products", "Petroleum-based products"],
    "styling_recommendations": ["Low manipulation styles", "Satin bonnet at night", "Avoid tight styles"],
    "loc_method": "LOC (Liquid, Oil, Cream) method recommended for moisture retention"
  },
  "heatmap_regions": [
    {
      "x": 0.5,
      "y": 0.3,
      "radius": 0.15,
      "feature": "Product buildup area",
      "importance": 8,
      "color": "orange"
    }
    ]
}`;

    const previewSystemPrompt = `You are a careful hair and scalp analysis assistant for African hair textures. Review the supplied image for the ${normalizedScope} scope and return ONLY valid JSON in this exact format:
{
  "primary_condition": "one concise visible focus",
  "confidence_score": 0,
  "severity": "mild|moderate|severe",
  "triage_level": "self_care|see_trichologist|see_dermatologist|urgent_care",
  "preview_recommendation": "one practical first care step",
  "conditions": [{ "condition": "one visible focus", "confidence": 0, "severity": "mild|moderate|severe", "explanation": "one short evidence-based sentence" }],
  "hair_texture": { "type": "3C|4A|4B|4C|uncertain", "pattern_description": "short description" }
}
Use cautious language, do not claim certainty beyond the image, and do not provide a complete care plan.`;
    const systemPrompt = isPreview ? previewSystemPrompt : fullSystemPrompt;

    // Download and aggregate the captured views so the provider can compare evidence together.
    const imageSources = [...new Set([
      imageUrl,
      ...Object.values(multiAngleUrls || {}),
    ].filter((value): value is string => typeof value === 'string' && value.trim().length > 0))].slice(0, 6);
    const imageBase64Urls: string[] = [];
    for (const sourceUrl of imageSources) {
      const bucketName = sourceUrl.includes('/hair-scans/') ? 'hair-scans' : sourceUrl.includes('/skin-scans/') ? 'skin-scans' : 'hair-scans';
      const marker = `/${bucketName}/`;
      const imageFileName = sourceUrl.includes(marker)
        ? sourceUrl.split(marker)[1].split('?')[0]
        : sourceUrl.split('?')[0].split('/').slice(-2).join('/');
      if (!imageFileName) continue;
      const { data: imageData, error: downloadError } = await supabaseClient.storage.from(bucketName).download(imageFileName);
      if (downloadError || !imageData) {
        console.warn('Skipping unavailable hair view:', sourceUrl, downloadError?.message || 'download failed');
        continue;
      }
      const imageBuffer = await imageData.arrayBuffer();
      const base64Image = btoa(new Uint8Array(imageBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ''));
      const contentType = imageData.type || (sourceUrl.toLowerCase().endsWith('.png') ? 'image/png' : sourceUrl.toLowerCase().endsWith('.webp') ? 'image/webp' : 'image/jpeg');
      imageBase64Urls.push(`data:${contentType};base64,${base64Image}`);
    }
    if (!imageBase64Urls.length) throw new Error('Failed to download scan images from storage');
    console.log('Hair scan views prepared:', imageBase64Urls.length);

    const providerController = new AbortController();
    const providerTimeout = setTimeout(() => providerController.abort(), isPreview ? 45_000 : 90_000);
    let aiResponse: Response;
    try {
      aiResponse = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        response_format: { type: 'json_object' },
        max_tokens: isPreview ? 900 : 2200,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'text', text: isPreview
                ? 'Give a concise first read of this hair image: identify the primary visible focus, confidence, triage level, and one practical first recommendation.'
                : 'Analyze this hair image and provide a comprehensive hair and scalp assessment. Focus on hair texture, porosity, scalp health, strand condition, and any issues that need attention.' },
              ...imageBase64Urls.map((url) => ({ type: 'image_url', image_url: { url, detail: isPreview ? 'low' : 'high' } }))
            ]
          }
        ],
      }),
      signal: providerController.signal,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new Error(isPreview ? 'Preview analysis took too long. Please try again.' : 'Full analysis took too long. Please try again.');
      }
      throw error;
    } finally {
      clearTimeout(providerTimeout);
    }

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        throw new Error('OpenAI rate limit reached. Please try again later.');
      }
      if (aiResponse.status === 401 || aiResponse.status === 403) {
        throw new Error('OpenAI analysis access was rejected. Check the server-side API key and model access.');
      }
      console.error(JSON.stringify({ event: 'scanner_analysis_error', provider: 'openai-compatible', model: OPENAI_MODEL, scope: normalizedScope, status: aiResponse.status }));
      throw new Error('OpenAI analysis is temporarily unavailable.');
    }

    const aiData = await aiResponse.json();
    const providerRequestId = aiResponse.headers.get('x-request-id') || aiData?.id || null;
    console.log(JSON.stringify({
      event: 'scanner_analysis_usage',
      provider: 'openai-compatible',
      model: OPENAI_MODEL,
      scope: normalizedScope,
      preview: isPreview,
      request_id: providerRequestId,
      image_count: imageBase64Urls.length,
      processing_time_ms: Date.now() - startTime,
      usage: aiData?.usage || null,
      estimated_cost_usd: null,
    }));
    const aiContent = aiData?.choices?.[0]?.message?.content;
    if (typeof aiContent !== 'string' || !aiContent.trim()) {
      throw new Error('OpenAI analysis returned an empty response.');
    }
    
    console.log('Hair analysis response received.');

    // Parse AI response
    let analysis;
    try {
      const jsonMatch = aiContent.match(/```json\n?([\s\S]*?)\n?```/) || 
                       aiContent.match(/```\n?([\s\S]*?)\n?```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : aiContent;
      analysis = normalizeAnalysis(JSON.parse(jsonStr), normalizedScope, qualityScore);
    } catch (e) {
      console.error('Failed to parse AI response:', aiContent);
      throw new Error('Invalid AI response format');
    }

    const processingTime = Date.now() - startTime;

    // Save diagnosis to database with hair profile
    const { data: diagnosis, error: diagnosisError } = await supabaseClient
      .from('diagnoses')
      .insert({
        scan_id: scanId,
        user_id: user.id,
        analysis_type: normalizedScope === 'scalp' ? 'scalp' : 'hair',
        conditions: analysis.conditions,
        primary_condition: analysis.primary_condition,
        confidence_score: analysis.confidence_score,
        severity: analysis.severity,
        triage_level: analysis.triage_level,
        hair_profile: {
          hair_texture: analysis.hair_texture,
          porosity: analysis.porosity,
          density: analysis.density,
          scalp_health: analysis.scalp_health,
          strand_health: analysis.strand_health,
          moisture_protein_balance: analysis.moisture_protein_balance,
          chemical_status: analysis.chemical_status,
          treatment_recommendations: analysis.treatment_recommendations,
          heatmap_regions: analysis.heatmap_regions,
          scanner_contract: {
            scope: normalizedScope,
            scan_quality: qualityScore,
            evidence_quality: analysis.evidence_quality,
            analysis_status: analysis.analysis_status,
            safety_flags: analysis.safety_flags,
          },
        },
        ai_model_version: 'gemini-2.5-flash-hair',
        processing_time_ms: processingTime,
      })
      .select()
      .single();

    if (diagnosisError) {
      console.error('Failed to save diagnosis:', diagnosisError);
      throw diagnosisError;
    }

    // Fetch matching hair products based on condition and hair type
    const { data: products } = isPreview
      ? { data: [] }
      : await supabaseClient
        .from('products')
        .select('*')
        .eq('product_type', 'hair')
        .eq('is_active', true)
        .limit(10);

    // Filter products based on user's hair type and concerns
    const filteredProducts = products?.filter(product => {
      if (profile?.allergies?.some((allergy: string) => 
        product.contraindications?.includes(allergy.toLowerCase())
      )) {
        return false;
      }
      // Match hair type if specified
      if (product.suitable_hair_types && analysis.hair_texture?.type) {
        const matches = product.suitable_hair_types.some((t: string) => 
          t.toLowerCase() === analysis.hair_texture.type.toLowerCase()
        );
        if (matches) return true;
      }
      return true;
    }) || [];

    // Create treatment plan for hair
    const treatmentRecs = analysis.treatment_recommendations || {};
    await supabaseClient
      .from('treatment_plans')
      .insert({
        diagnosis_id: diagnosis.id,
        user_id: user.id,
        recommendations: isPreview
          ? (analysis.preview_recommendation || analysis.treatment_recommendations?.immediate?.[0] || `Start with a gentle routine focused on your ${analysis.primary_condition || 'current hair concern'}.`)
          : `Based on your ${analysis.hair_texture?.type || 'hair'} hair type with ${analysis.primary_condition}, we recommend the following routine.`,
        ingredients_to_use: treatmentRecs.products_to_use || [],
        ingredients_to_avoid: treatmentRecs.products_to_avoid || [],
        lifestyle_tips: [
          ...(treatmentRecs.styling_recommendations || []),
          treatmentRecs.loc_method || '',
        ].filter(Boolean),
        product_recommendations: isPreview ? [] : filteredProducts.slice(0, 5).map(p => ({
          sku: p.sku,
          name: p.name,
          category: p.category,
          description: p.description,
        })),
        follow_up_days: analysis.triage_level === 'self_care' ? 14 : 7,
      });

    // Update scan status to completed
    await supabaseClient
      .from('scans')
      .update({ status: 'completed' })
      .eq('id', scanId);

    console.log('Hair analysis completed successfully');

    return new Response(
      JSON.stringify({ 
        success: true,
        preview: isPreview,
        diagnosis,
        products: filteredProducts.slice(0, 5),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-hair function:', error);
    if (activeScanId && activeSupabaseClient) {
      await activeSupabaseClient.from('scans').update({ status: 'failed' }).eq('id', activeScanId);
    }
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});