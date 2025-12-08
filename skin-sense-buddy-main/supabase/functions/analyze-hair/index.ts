import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { scanId, imageUrl, multiAngleUrls, calibration } = await req.json();

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

    // Update scan status to analyzing
    await supabaseClient
      .from('scans')
      .update({ status: 'analyzing' })
      .eq('id', scanId);

    const startTime = Date.now();

    // Call Lovable AI for hair analysis
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

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

    const systemPrompt = `You are an advanced trichology and hair analysis AI with expertise in African/Nigerian hair types (Type 3C-4C), relaxed hair, and transitioning hair.

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

    // Download image from storage and convert to base64
    console.log('Downloading hair image from storage:', imageUrl);
    const bucketName = imageUrl.includes('/hair-scans/') ? 'hair-scans' : 'skin-scans';
    const imageFileName = imageUrl.split(`/${bucketName}/`)[1];
    const { data: imageData, error: downloadError } = await supabaseClient.storage
      .from(bucketName)
      .download(imageFileName);

    if (downloadError || !imageData) {
      console.error('Failed to download image:', downloadError);
      throw new Error('Failed to download image from storage');
    }

    // Convert blob to base64
    const imageBuffer = await imageData.arrayBuffer();
    const base64Image = btoa(
      new Uint8Array(imageBuffer).reduce(
        (data, byte) => data + String.fromCharCode(byte),
        ''
      )
    );
    const imageBase64Url = `data:image/jpeg;base64,${base64Image}`;
    console.log('Hair image converted to base64, size:', base64Image.length);

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Analyze this hair image and provide a comprehensive hair and scalp assessment. Focus on hair texture, porosity, scalp health, strand condition, and any issues that need attention.' },
              { type: 'image_url', image_url: { url: imageBase64Url } }
            ]
          }
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        throw new Error('AI rate limit exceeded. Please try again later.');
      }
      if (aiResponse.status === 402) {
        throw new Error('AI credits exhausted. Please add credits to your workspace.');
      }
      console.error('AI API error:', aiResponse.status, await aiResponse.text());
      throw new Error('AI analysis failed');
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices[0].message.content;
    
    console.log('Hair AI Response:', aiContent);

    // Parse AI response
    let analysis;
    try {
      const jsonMatch = aiContent.match(/```json\n?([\s\S]*?)\n?```/) || 
                       aiContent.match(/```\n?([\s\S]*?)\n?```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : aiContent;
      analysis = JSON.parse(jsonStr);
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
        analysis_type: 'hair',
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
    const { data: products } = await supabaseClient
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
        recommendations: `Based on your ${analysis.hair_texture?.type || 'hair'} hair type with ${analysis.primary_condition}, we recommend the following routine.`,
        ingredients_to_use: treatmentRecs.products_to_use || [],
        ingredients_to_avoid: treatmentRecs.products_to_avoid || [],
        lifestyle_tips: [
          ...(treatmentRecs.styling_recommendations || []),
          treatmentRecs.loc_method || '',
        ].filter(Boolean),
        product_recommendations: filteredProducts.slice(0, 5).map(p => ({
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
        diagnosis,
        products: filteredProducts.slice(0, 5),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-hair function:', error);
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