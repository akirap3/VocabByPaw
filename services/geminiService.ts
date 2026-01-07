import { GoogleGenAI, Type } from "@google/genai";
import { VocabGenerationParams, VocabItem } from "../types.ts";
import { env } from "../src/env.ts";

// Initialize lazily and check for API key
const getAI = () => {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("Gemini API Key is missing. API calls will fail.");
  }
  return new GoogleGenAI({ apiKey: apiKey || "" });
};

const IMAGE_MODEL_NAME = 'gemini-2.5-flash-image';
const TEXT_MODEL_NAME = 'gemini-3-flash-preview';

export const generateImageContent = async (
  prompt: string,
  inputImageBase64?: string,
  aspectRatio: string = "1:1"
): Promise<string | null> => {
  try {
    const ai = getAI();
    const parts: any[] = [];
    if (inputImageBase64) {
      const cleanBase64 = inputImageBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');
      parts.push({
        inlineData: {
          mimeType: 'image/png',
          data: cleanBase64
        }
      });
    }
    parts.push({ text: prompt });

    const response = await ai.models.generateContent({
      model: IMAGE_MODEL_NAME,
      contents: { parts: parts },
      config: {
        imageConfig: { aspectRatio: aspectRatio as any }
      }
    });

    if (response.candidates && response.candidates.length > 0) {
      const parts = response.candidates[0].content?.parts;
      if (parts) {
        for (const part of parts) {
          if (part.inlineData && part.inlineData.data) {
            return `data:image/png;base64,${part.inlineData.data}`;
          }
        }
      }
    }
    throw new Error("No image data found in response");
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

export const generateVocabList = async (params: VocabGenerationParams): Promise<{ theme: string, items: VocabItem[] }> => {
    try {
        const ai = getAI();
        let systemInstruction = `You are an expert language teacher and a creative storyboard artist.
        Your task is to generate vocabulary cards where the 'imagePrompt' perfectly illustrates the WORD and its EXAMPLE SENTENCE.
        
        CRITICAL ILLUSTRATION RULES for 'imagePrompt':
        - Protagonist: Use the placeholder "[MASCOT]" for the main character.
        - Style: "Soft watercolor and ink illustration, whimsical and warm".
        - Clothing & Costume: [MASCOT] MUST wear clothes appropriate for the action or word context.
        - Action & Props: [MASCOT] should be actively engaged in the scene.
        
        Target Language: ${params.targetLanguage}. Phonetic: KK. Theme: Creative summary.`;

        let userPrompt = "";
        if (params.mode === 'manual') {
            userPrompt = `Generate vocabulary data for these words: ${params.input}.`;
        } else {
            const levels = params.proficiencyLevels.length > 0 ? params.proficiencyLevels.join(", ") : "General";
            userPrompt = `Generate 9 vocabulary words for the topic: "${params.input}" at ${levels} level.`;
        }

        const response = await ai.models.generateContent({
            model: TEXT_MODEL_NAME,
            contents: userPrompt,
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        theme: { type: Type.STRING },
                        items: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    word: { type: Type.STRING },
                                    phonetic: { type: Type.STRING },
                                    definition: { type: Type.STRING },
                                    englishSentence: { type: Type.STRING },
                                    targetSentence: { type: Type.STRING },
                                    imagePrompt: { type: Type.STRING }
                                },
                                required: ["word", "phonetic", "definition", "englishSentence", "targetSentence", "imagePrompt"]
                            }
                        }
                    },
                    required: ["theme", "items"]
                }
            }
        });

        const jsonString = response.text;
        if (!jsonString) throw new Error("Empty response");
        const parsedData = JSON.parse(jsonString);
        
        const timestamp = Date.now();
        const items = parsedData.items.map((item: any, index: number) => ({
            id: timestamp + index,
            word: item.word,
            phonetic: item.phonetic,
            definition: item.definition,
            englishSentence: item.englishSentence,
            targetSentence: item.targetSentence,
            imagePrompt: item.imagePrompt
        }));

        return { theme: parsedData.theme, items };
    } catch (error) {
        console.error("Gemini Error:", error);
        throw error;
    }
}