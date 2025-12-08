import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { diagnosisId, userId } = await req.json();

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get diagnosis details
    const { data: diagnosis, error: diagnosisError } = await supabaseClient
      .from("diagnoses")
      .select(`
        *,
        profiles (age, sex, skin_type, allergies, medical_conditions, is_pregnant)
      `)
      .eq("id", diagnosisId)
      .single();

    if (diagnosisError) throw diagnosisError;

    // Get user profile for additional context
    const profile = diagnosis.profiles;

    // Create prompt for AI formulation generator
    const systemPrompt = `You are an expert dermatologist and cosmetic chemist. Create a personalized skincare formulation based on the patient's skin condition and profile.

The formulation should:
- Address the specific skin conditions
- Consider the patient's age, skin type, and medical history
- Avoid ingredients they're allergic to
- Be safe for pregnancy if applicable
- Include percentage composition for each ingredient
- Provide clear application instructions
- List expected benefits and contraindications

Return the response in this exact JSON structure:
{
  "formulation_name": "string",
  "ingredients": {"ingredient_name": percentage_number},
  "instructions": "string",
  "expected_benefits": ["benefit1", "benefit2"],
  "contraindications": "string",
  "estimated_cost_ngn": number
}`;

    const userPrompt = `Patient Profile:
- Age: ${profile.age}
- Sex: ${profile.sex}
- Skin Type: ${profile.skin_type}
- Pregnant: ${profile.is_pregnant ? "Yes" : "No"}
- Medical Conditions: ${profile.medical_conditions?.join(", ") || "None"}
- Allergies: ${profile.allergies?.join(", ") || "None"}

Diagnosis:
- Primary Condition: ${diagnosis.primary_condition}
- All Conditions: ${JSON.stringify(diagnosis.conditions)}
- Severity: ${diagnosis.severity}
- Skin Profile: ${JSON.stringify(diagnosis.skin_profile)}

Create a custom formulation for this patient.`;

    // Call Lovable AI Gateway
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_formulation",
              description: "Create a custom skincare formulation",
              parameters: {
                type: "object",
                properties: {
                  formulation_name: { type: "string" },
                  ingredients: {
                    type: "object",
                    additionalProperties: { type: "number" },
                  },
                  instructions: { type: "string" },
                  expected_benefits: {
                    type: "array",
                    items: { type: "string" },
                  },
                  contraindications: { type: "string" },
                  estimated_cost_ngn: { type: "number" },
                },
                required: [
                  "formulation_name",
                  "ingredients",
                  "instructions",
                  "expected_benefits",
                  "contraindications",
                  "estimated_cost_ngn",
                ],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: {
          type: "function",
          function: { name: "create_formulation" },
        },
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", errorText);
      throw new Error("AI formulation generation failed");
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices[0].message.tool_calls[0];
    const formulation = JSON.parse(toolCall.function.arguments);

    // Save formulation to database
    const { data: savedFormulation, error: saveError } = await supabaseClient
      .from("custom_formulations")
      .insert({
        user_id: userId,
        diagnosis_id: diagnosisId,
        formulation_name: formulation.formulation_name,
        ingredients: formulation.ingredients,
        instructions: formulation.instructions,
        expected_benefits: formulation.expected_benefits,
        contraindications: formulation.contraindications,
        estimated_cost_ngn: formulation.estimated_cost_ngn,
      })
      .select()
      .single();

    if (saveError) throw saveError;

    return new Response(
      JSON.stringify({ formulation: savedFormulation }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error generating formulation:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
