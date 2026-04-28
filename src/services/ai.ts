// src/services/ai.ts

const GEMINI_API_KEY = "AIzaSyAzM4gI9GlkDFzr1DSruNLH4c7g1ZY_Hy4";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

export interface AiAnalysisResult {
  description: string;
  category: string;
}

export const analyzeImageWithGemini = async (base64DataUri: string): Promise<AiAnalysisResult> => {
  try {
    // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
    const base64Data = base64DataUri.includes(',') ? base64DataUri.split(',')[1] : base64DataUri;
    
    const payload = {
      contents: [
        {
          parts: [
            {
              text: `You are a civic infrastructure analysis AI. Analyze this image and identify the civic issue present (e.g., pothole, broken pipe, trash pile). 
              
Return your response as a valid JSON object with EXACTLY these two keys:
1. "description": A detailed description of the problem seen in the image.
2. "category": You MUST choose EXACTLY one of the following strings (do not invent new ones): 'Road & Infrastructure', 'Garbage & Waste', 'Water & Sewage', 'Electricity & Lighting', 'Public Transport', 'Parks & Recreation', 'Other'.`
            },
            {
              inline_data: {
                mime_type: "image/jpeg",
                data: base64Data
              }
            }
          ]
        }
      ],
      generationConfig: {
        response_mime_type: "application/json"
      }
    };

    const response = await fetch(GEMINI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('RATE_LIMIT_EXCEEDED');
      }
      throw new Error(`Gemini API failed with status ${response.status}`);
    }

    const data = await response.json();
    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!textResponse) {
      throw new Error("No response generated from AI.");
    }

    const parsed = JSON.parse(textResponse);
    return {
      description: parsed.description || '',
      category: parsed.category || 'Other'
    };
  } catch (error) {
    console.error("AI Analysis failed:", error);
    throw error;
  }
};
