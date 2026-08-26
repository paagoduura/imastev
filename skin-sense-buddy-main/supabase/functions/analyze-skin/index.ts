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

    const { scanId, imageUrl, multiAngleUrls, calibration, preview = false, analysisScope = 'skin', scanMode = 'skin' } = await req.json();
    activeScanId = typeof scanId === 'string' ? scanId : null;
    const normalizedScope = analysisScope === 'full' ? 'full' : 'skin';
    const isPreview = preview === true;

    console.log('Analyzing scan:', scanId, 'for user:', user.id);

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

    // Call the configured OpenAI-compatible provider for skin analysis.
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

    // Prepare context for AI
    const userContext = {
      age: profile?.age || 'unknown',
      sex: profile?.sex || 'unknown',
      skin_type: profile?.skin_type || 'unknown',
      fitzpatrick: profile?.fitzpatrick_scale || 'unknown',
      is_pregnant: profile?.is_pregnant || false,
      allergies: profile?.allergies || [],
      medications: profile?.current_medications || [],
      conditions: profile?.medical_conditions || [],
    };

    const hasMultiAngle = multiAngleUrls && Object.keys(multiAngleUrls).length > 1;
    const hasCalibration = calibration && calibration.pixelsPerMM;

    const scopeInstruction = normalizedScope === 'full'
      ? 'This is part of a FULL CARE SCAN. Assess visible skin characteristics while keeping observations distinct from professional assessment.'
      : 'This is a SKIN-focused review. Assess only visually observable skin characteristics and do not make unsupported medical claims.';
    const fullSystemPrompt = `You are an advanced dermatology AI assistant with medical-grade analysis capabilities.

ANALYSIS SCOPE: ${normalizedScope.toUpperCase()} (${scanMode})
${scopeInstruction}

USER CONTEXT: ${JSON.stringify(userContext)}
${hasCalibration ? `SCALE CALIBRATION: ${calibration.pixelsPerMM.toFixed(2)} pixels/mm using ${calibration.referenceType}` : ''}
${hasMultiAngle ? `MULTI-ANGLE DATA: Available angles: ${Object.keys(multiAngleUrls).join(', ')}` : ''}

ANALYSIS REQUIREMENTS:
1. Differential diagnoses (top 3) with confidence scores (0-100)
2. Detailed explanation for each diagnosis with specific visual evidence
3. Severity assessment (mild, moderate, severe) with justification
4. Triage level (self_care, see_gp, see_dermatologist, urgent_care)
5. Skin profile detection (type and Fitzpatrick scale)
6. Size estimation in millimeters ${hasCalibration ? '(use calibration data)' : '(approximate)'}
7. Distribution pattern (localized, scattered, confluent)
8. Key visual findings with location coordinates for heatmap
9. Confidence calibration factors (image quality, typical presentation, edge cases)

CRITICAL: Provide heatmap_regions array with coordinates of key diagnostic features:
- Each region should include: x, y coordinates (0-1 normalized), radius (0-1), feature description, importance (1-10)
- Focus on lesion boundaries, color variations, texture changes, inflammation

Return ONLY valid JSON in this exact format:
{
  "conditions": [
    {
      "condition": "condition name",
      "confidence": 92,
      "severity": "moderate",
      "explanation": "detailed explanation with specific visual evidence",
      "confidence_factors": {
        "image_quality": 95,
        "typical_presentation": 88,
        "differential_likelihood": 90
      }
    }
  ],
  "primary_condition": "most likely condition",
  "confidence_score": 92,
  "severity": "moderate",
  "triage_level": "self_care",
  "skin_profile": {
    "skin_type": "oily",
    "fitzpatrick_scale": "IV",
    "detected_features": ["inflammation", "comedones", "hyperpigmentation"]
  },
  "lesion_metrics": {
    "estimated_size_mm": ${hasCalibration ? '"calculated from calibration"' : '"approximate range"'},
    "distribution": "localized|scattered|confluent",
    "count": "number of lesions",
    "symmetry": "symmetric|asymmetric"
  },
  "heatmap_regions": [
    {
      "x": 0.5,
      "y": 0.3,
      "radius": 0.1,
      "feature": "primary lesion - inflamed papule",
      "importance": 10,
      "color": "red"
    }
    ]
}`;

    const previewSystemPrompt = `You are a careful skin-care analysis assistant. Review the supplied image for the ${normalizedScope} scope and return ONLY valid JSON in this exact format:
{
  "primary_condition": "one concise visible focus",
  "confidence_score": 0,
  "severity": "mild|moderate|severe",
  "triage_level": "self_care|see_gp|see_dermatologist|urgent_care",
  "preview_recommendation": "one practical first care step",
  "conditions": [{ "condition": "one visible focus", "confidence": 0, "severity": "mild|moderate|severe", "explanation": "one short evidence-based sentence" }],
  "skin_profile": { "skin_type": "uncertain", "fitzpatrick_scale": "uncertain" }
}
Use cautious language, do not claim certainty beyond the image, and do not provide a complete care plan.`;
    const systemPrompt = isPreview ? previewSystemPrompt : fullSystemPrompt;

    // Download and aggregate the captured face views so evidence is considered together.
    const imageSources = [...new Set([
      imageUrl,
      ...Object.values(multiAngleUrls || {}),
    ].filter((value): value is string => typeof value === 'string' && value.trim().length > 0))].slice(0, 6);
    const imageBase64Urls: string[] = [];
    for (const sourceUrl of imageSources) {
      const bucketName = sourceUrl.includes('/skin-scans/') ? 'skin-scans' : sourceUrl.includes('/hair-scans/') ? 'hair-scans' : 'skin-scans';
      const marker = `/${bucketName}/`;
      const imageFileName = sourceUrl.includes(marker)
        ? sourceUrl.split(marker)[1].split('?')[0]
        : sourceUrl.split('?')[0].split('/').slice(-2).join('/');
      if (!imageFileName) continue;
      const { data: imageData, error: downloadError } = await supabaseClient.storage.from(bucketName).download(imageFileName);
      if (downloadError || !imageData) {
        console.warn('Skipping unavailable skin view:', sourceUrl, downloadError?.message || 'download failed');
        continue;
      }
      const imageBuffer = await imageData.arrayBuffer();
      const base64Image = btoa(new Uint8Array(imageBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ''));
      const contentType = imageData.type || (sourceUrl.toLowerCase().endsWith('.png') ? 'image/png' : sourceUrl.toLowerCase().endsWith('.webp') ? 'image/webp' : 'image/jpeg');
      imageBase64Urls.push(`data:${contentType};base64,${base64Image}`);
    }
    if (!imageBase64Urls.length) throw new Error('Failed to download scan images from storage');
    console.log('Skin scan views prepared:', imageBase64Urls.length);

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
                ? 'Give a concise first read of this skin image: identify the primary visible focus, confidence, triage level, and one practical first recommendation.'
                : 'Analyze this skin image and provide a diagnosis.' },
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
    
    console.log('Skin analysis response received.');

    // Parse AI response
    let analysis;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = aiContent.match(/```json\n?([\s\S]*?)\n?```/) || 
                       aiContent.match(/```\n?([\s\S]*?)\n?```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : aiContent;
      analysis = normalizeAnalysis(JSON.parse(jsonStr), normalizedScope, qualityScore);
    } catch (e) {
      console.error('Failed to parse AI response:', aiContent);
      throw new Error('Invalid AI response format');
    }

    const processingTime = Date.now() - startTime;

    // Save diagnosis to database
    const { data: diagnosis, error: diagnosisError } = await supabaseClient
      .from('diagnoses')
      .insert({
        scan_id: scanId,
        user_id: user.id,
        conditions: analysis.conditions,
        primary_condition: analysis.primary_condition,
        confidence_score: analysis.confidence_score,
        severity: analysis.severity,
        triage_level: analysis.triage_level,
        skin_profile: {
          ...(analysis.skin_profile || {}),
          scanner_contract: {
            scope: normalizedScope,
            scan_quality: qualityScore,
            evidence_quality: analysis.evidence_quality,
            analysis_status: analysis.analysis_status,
            safety_flags: analysis.safety_flags,
          },
        },
        ai_model_version: isPreview ? 'gpt-4o-mini-preview-skin' : 'gpt-4o-mini-skin',
        processing_time_ms: processingTime,
      })
      .select()
      .single();

    if (diagnosisError) {
      console.error('Failed to save diagnosis:', diagnosisError);
      throw diagnosisError;
    }

    // Fetch matching products based on condition
    const { data: products } = isPreview
      ? { data: [] }
      : await supabaseClient
        .from('products')
        .select('*')
        .contains('suitable_for_conditions', [analysis.primary_condition.toLowerCase()])
        .eq('is_active', true)
        .limit(5);

    // Filter products based on user contraindications
    const filteredProducts = products?.filter(product => {
      if (profile?.is_pregnant && product.contraindications?.includes('pregnancy')) {
        return false;
      }
      if (profile?.allergies?.some((allergy: string) => 
        product.contraindications?.includes(allergy.toLowerCase())
      )) {
        return false;
      }
      return true;
    }) || [];

    // Create treatment plan
    await supabaseClient
      .from('treatment_plans')
      .insert({
        diagnosis_id: diagnosis.id,
        user_id: user.id,
        recommendations: isPreview
          ? (analysis.preview_recommendation || `Start with a gentle routine focused on your ${analysis.primary_condition || 'current skin concern'}.`)
          : `Based on your ${analysis.primary_condition}, we recommend a gentle skincare routine.`,
        product_recommendations: isPreview ? [] : filteredProducts.slice(0, 3).map(p => ({
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

    console.log('Analysis completed successfully');

    return new Response(
      JSON.stringify({ 
        success: true,
        preview: isPreview,
        diagnosis,
        products: filteredProducts.slice(0, 3),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-skin function:', error);
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
