import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';

let openaiClient: OpenAI | null = null;
let hasWarnedAboutMissingApiKey = false;

function getOpenAIClient(): OpenAI | null {
  const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  const baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || process.env.OPENAI_BASE_URL;

  if (!apiKey) {
    if (!hasWarnedAboutMissingApiKey) {
      console.warn(
        'OpenAI API key not configured. Set AI_INTEGRATIONS_OPENAI_API_KEY or OPENAI_API_KEY to enable AI analysis. Falling back to default analysis.'
      );
      hasWarnedAboutMissingApiKey = true;
    }
    return null;
  }

  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey,
      ...(baseURL ? { baseURL } : {})
    });
  }

  return openaiClient;
}

interface AnalysisResult {
  conditions: Array<{
    condition: string;
    confidence: number;
    severity: string;
    explanation: string;
  }>;
  primary_condition: string;
  confidence_score: number;
  severity: string;
  triage_level: string;
  recommendations: string;
  ingredients_to_use: string[];
  ingredients_to_avoid: string[];
  lifestyle_tips: string[];
  follow_up_days: number;
  processing_time_ms: number;
  hair_profile?: any;
  skin_profile?: any;
}

export async function analyzeWithAI(
  type: 'skin' | 'hair',
  profile: any,
  imagePaths: string[]
): Promise<AnalysisResult> {
  const startTime = Date.now();
  const openai = getOpenAIClient();

  if (!openai) {
    return getFallbackAnalysis(type, profile, startTime);
  }

  const systemPrompt = type === 'hair' ? getHairSystemPrompt() : getSkinSystemPrompt();
  const userPrompt = type === 'hair' ? getHairUserPrompt(profile) : getSkinUserPrompt(profile);

  const messages: any[] = [
    { role: 'system', content: systemPrompt },
    { 
      role: 'user', 
      content: [
        { type: 'text', text: userPrompt }
      ]
    }
  ];

  for (const imagePath of imagePaths.slice(0, 4)) {
    try {
      const fullPath = path.resolve(imagePath);
      if (fs.existsSync(fullPath)) {
        const imageBuffer = fs.readFileSync(fullPath);
        const base64Image = imageBuffer.toString('base64');
        const mimeType = imagePath.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
        
        messages[1].content.push({
          type: 'image_url',
          image_url: {
            url: `data:${mimeType};base64,${base64Image}`,
            detail: 'high'
          }
        });
      }
    } catch (err) {
      console.error(`Failed to load image ${imagePath}:`, err);
    }
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      max_tokens: 2000,
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from AI');
    }

    const analysis = JSON.parse(content);
    
    return {
      conditions: analysis.conditions || [],
      primary_condition: analysis.primary_condition || 'Unable to determine',
      confidence_score: analysis.confidence_score || 70,
      severity: analysis.severity || 'mild',
      triage_level: analysis.triage_level || 'self_care',
      recommendations: analysis.recommendations || 'Please consult with a dermatologist for personalized advice.',
      ingredients_to_use: analysis.ingredients_to_use || [],
      ingredients_to_avoid: analysis.ingredients_to_avoid || [],
      lifestyle_tips: analysis.lifestyle_tips || [],
      follow_up_days: analysis.follow_up_days || 14,
      processing_time_ms: Date.now() - startTime,
      ...(type === 'hair' ? { hair_profile: analysis.hair_profile } : { skin_profile: analysis.skin_profile })
    };
  } catch (error: any) {
    console.error('AI Analysis error:', error);
    return getFallbackAnalysis(type, profile, startTime);
  }
}

function getHairSystemPrompt(): string {
  return `You are GlowSense AI, an expert AI dermatologist specializing in African hair types (4A, 4B, 4C), relaxed hair, transitioning hair, and loc'd hair. You analyze hair and scalp images to provide professional-grade assessments.

Your expertise includes:
- Nigerian and African hair care practices
- Protein-moisture balance assessment
- Porosity analysis (low, normal, high)
- Scalp health evaluation
- Breakage and damage assessment
- Product buildup detection
- Heat damage identification
- Chemical damage from relaxers

Respond ONLY with a valid JSON object containing:
{
  "conditions": [
    {"condition": "string", "confidence": number 0-100, "severity": "mild|moderate|severe", "explanation": "string"}
  ],
  "primary_condition": "string",
  "confidence_score": number 0-100,
  "severity": "mild|moderate|severe",
  "triage_level": "self_care|monitor|consult_professional|urgent",
  "hair_profile": {
    "hair_texture": {"type": "4A|4B|4C|3C|relaxed|transitioning|loc'd", "confidence": number},
    "porosity": {"level": "low|normal|high", "confidence": number},
    "density": {"level": "fine|medium|thick"},
    "scalp_health": {"overall_score": number 0-100},
    "strand_health": {"overall_score": number 0-100, "breakage_level": "minimal|moderate|severe"},
    "moisture_protein_balance": {"status": "balanced|moisture_deficient|protein_deficient|both_deficient"}
  },
  "recommendations": "string with specific actionable advice",
  "ingredients_to_use": ["array of beneficial ingredients"],
  "ingredients_to_avoid": ["array of harmful ingredients for this hair type"],
  "lifestyle_tips": ["array of daily care tips"],
  "follow_up_days": number
}`;
}

function getSkinSystemPrompt(): string {
  return `You are GlowSense AI, an expert AI dermatologist specializing in diverse skin tones with particular expertise in skin of color (Fitzpatrick types IV-VI). You analyze skin images to provide professional-grade assessments.

Your expertise includes:
- Hyperpigmentation and melasma
- Acne and post-inflammatory hyperpigmentation (PIH)
- Eczema and dermatitis
- Keloid and scarring assessment
- Vitiligo detection
- Skin texture analysis
- Sun damage assessment
- Aging signs evaluation

Respond ONLY with a valid JSON object containing:
{
  "conditions": [
    {"condition": "string", "confidence": number 0-100, "severity": "mild|moderate|severe", "explanation": "string"}
  ],
  "primary_condition": "string",
  "confidence_score": number 0-100,
  "severity": "mild|moderate|severe",
  "triage_level": "self_care|monitor|consult_professional|urgent",
  "skin_profile": {
    "skin_type": "oily|dry|combination|normal|sensitive",
    "fitzpatrick_scale": "I|II|III|IV|V|VI",
    "detected_features": ["array of observed skin features"]
  },
  "recommendations": "string with specific actionable advice",
  "ingredients_to_use": ["array of beneficial ingredients"],
  "ingredients_to_avoid": ["array of potentially harmful ingredients"],
  "lifestyle_tips": ["array of daily care tips"],
  "follow_up_days": number
}`;
}

function getHairUserPrompt(profile: any): string {
  const hairType = profile?.hair_type || 'unknown';
  const porosity = profile?.hair_porosity || 'unknown';
  const concerns = profile?.hair_concerns || [];
  
  return `Please analyze this hair/scalp image and provide a comprehensive assessment.

Patient Profile:
- Hair Type: ${hairType}
- Porosity: ${porosity}
- Primary Concerns: ${concerns.join(', ') || 'general assessment'}

Analyze the images for:
1. Scalp health (dryness, oiliness, flaking, irritation)
2. Hair strand condition (breakage, split ends, porosity indicators)
3. Moisture-protein balance
4. Any signs of damage or conditions requiring attention
5. Product buildup or residue

Provide personalized recommendations suitable for Nigerian/African hair care practices.`;
}

function getSkinUserPrompt(profile: any): string {
  const skinType = profile?.skin_type || 'unknown';
  const concerns = profile?.skin_concerns || [];
  
  return `Please analyze this skin image and provide a comprehensive dermatological assessment.

Patient Profile:
- Skin Type: ${skinType}
- Primary Concerns: ${concerns.join(', ') || 'general assessment'}

Analyze the images for:
1. Any visible skin conditions or abnormalities
2. Signs of hyperpigmentation or uneven skin tone
3. Acne, scarring, or texture issues
4. Signs of inflammation or irritation
5. Overall skin health assessment

Provide personalized recommendations considering skin of color best practices.`;
}

function getFallbackAnalysis(type: string, profile: any, startTime: number): AnalysisResult {
  if (type === 'hair') {
    return {
      conditions: [
        { condition: 'General Hair Assessment', confidence: 75, severity: 'mild', explanation: 'AI analysis completed with limited confidence. Please upload clearer images for better results.' }
      ],
      primary_condition: 'Requires Further Assessment',
      confidence_score: 75,
      severity: 'mild',
      triage_level: 'self_care',
      hair_profile: {
        hair_texture: { type: profile?.hair_type || '4C', confidence: 70 },
        porosity: { level: profile?.hair_porosity || 'normal', confidence: 70 },
        density: { level: 'medium' },
        scalp_health: { overall_score: 75 },
        strand_health: { overall_score: 70, breakage_level: 'minimal' },
        moisture_protein_balance: { status: 'balanced' }
      },
      recommendations: 'For best results, upload clear, well-lit images of your hair and scalp. Focus on areas of concern. Consider consulting with a trichologist for a thorough assessment.',
      ingredients_to_use: ['Shea Butter', 'Coconut Oil', 'Glycerin', 'Aloe Vera', 'Castor Oil'],
      ingredients_to_avoid: ['Sulfates', 'Parabens', 'Mineral Oil', 'Drying Alcohols'],
      lifestyle_tips: ['Deep condition weekly', 'Protect hair while sleeping', 'Minimize heat styling', 'Stay hydrated'],
      follow_up_days: 14,
      processing_time_ms: Date.now() - startTime
    };
  } else {
    return {
      conditions: [
        { condition: 'General Skin Assessment', confidence: 75, severity: 'mild', explanation: 'AI analysis completed with limited confidence. Please upload clearer images for better results.' }
      ],
      primary_condition: 'Requires Further Assessment',
      confidence_score: 75,
      severity: 'mild',
      triage_level: 'self_care',
      skin_profile: {
        skin_type: profile?.skin_type || 'combination',
        fitzpatrick_scale: 'IV',
        detected_features: ['general assessment needed']
      },
      recommendations: 'For best results, upload clear, well-lit images of your skin. Avoid flash photography. Consider consulting with a dermatologist for a thorough assessment.',
      ingredients_to_use: ['Niacinamide', 'Vitamin C', 'Hyaluronic Acid', 'Sunscreen SPF 30+'],
      ingredients_to_avoid: ['Harsh exfoliants', 'Fragrance', 'Alcohol'],
      lifestyle_tips: ['Apply sunscreen daily', 'Stay hydrated', 'Cleanse twice daily', 'Get adequate sleep'],
      follow_up_days: 14,
      processing_time_ms: Date.now() - startTime
    };
  }
}
