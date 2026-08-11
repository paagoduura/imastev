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

    // Update scan status to analyzing
    await supabaseClient
      .from('scans')
      .update({ status: 'analyzing' })
      .eq('id', scanId);

    const startTime = Date.now();

    // Call Lovable AI for analysis
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

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

    const systemPrompt = `You are an advanced dermatology AI assistant with medical-grade analysis capabilities.

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

    // Download image from storage and convert to base64
    console.log('Downloading image from storage:', imageUrl);
    const imageFileName = imageUrl.split('/skin-scans/')[1];
    const { data: imageData, error: downloadError } = await supabaseClient.storage
      .from('skin-scans')
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
    console.log('Image converted to base64, size:', base64Image.length);

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
              { type: 'text', text: 'Analyze this skin image and provide a diagnosis.' },
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
    
    console.log('AI Response:', aiContent);

    // Parse AI response
    let analysis;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = aiContent.match(/```json\n?([\s\S]*?)\n?```/) || 
                       aiContent.match(/```\n?([\s\S]*?)\n?```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : aiContent;
      analysis = JSON.parse(jsonStr);
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
        skin_profile: analysis.skin_profile,
        ai_model_version: 'gemini-2.5-flash',
        processing_time_ms: processingTime,
      })
      .select()
      .single();

    if (diagnosisError) {
      console.error('Failed to save diagnosis:', diagnosisError);
      throw diagnosisError;
    }

    // Fetch matching products based on condition
    const { data: products } = await supabaseClient
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
        recommendations: `Based on your ${analysis.primary_condition}, we recommend a gentle skincare routine.`,
        product_recommendations: filteredProducts.slice(0, 3).map(p => ({
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
        diagnosis,
        products: filteredProducts.slice(0, 3),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-skin function:', error);
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
