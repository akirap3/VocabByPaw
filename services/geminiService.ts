
import { GoogleGenAI, Type } from "@google/genai";
import { VocabGenerationParams, VocabItem } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const IMAGE_MODEL_NAME = 'gemini-2.5-flash-image';
const TEXT_MODEL_NAME = 'gemini-3-flash-preview';

export const generateImageContent = async (
  prompt: string,
  inputImageBase64?: string,
  aspectRatio: string = "1:1"
): Promise<string | null> => {
  try {
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
        imageConfig: { aspectRatio: aspectRatio }
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
        const charDesc = params.character?.promptSignature || "a chubby orange tabby cat with round glasses (Sir Isaac)";
        
        let systemInstruction = `You are a professional linguist and vocabulary teacher. 
        Your task is to generate structured vocabulary cards and a "Theme Sentence" that summarizes the collection.
        The user wants the definitions and target sentences in this language: ${params.targetLanguage}.
        Ensure the 'phonetic' field uses KK Phonetic symbols.
        Ensure the 'imagePrompt' describes a "Soft watercolor and ink illustration" featuring ${charDesc} acting out the word.
        Include a 'theme' property which is a creative 1-sentence summary or title for this set of words.`;

        let userPrompt = "";
        if (params.mode === 'manual') {
            userPrompt = `Generate detailed vocabulary cards and a summary theme sentence for the following words: ${params.input}.`;
        } else {
            const levels = params.proficiencyLevels.length > 0 ? params.proficiencyLevels.join(", ") : "General";
            userPrompt = `Generate 9 vocabulary words related to the topic: "${params.input}".
            Target Proficiency Levels: ${levels}.
            Also provide a creative theme sentence.`;
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
                        theme: { type: Type.STRING, description: "A creative summary sentence for the collection" },
                        items: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    word: { type: Type.STRING },
                                    phonetic: { type: Type.STRING, description: "KK Phonetic transcription" },
                                    definition: { type: Type.STRING, description: `Definition in ${params.targetLanguage}` },
                                    englishSentence: { type: Type.STRING },
                                    targetSentence: { type: Type.STRING, description: `Sentence translated to ${params.targetLanguage}` },
                                    imagePrompt: { type: Type.STRING, description: "A visual description for an image generator" }
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
        if (!jsonString) throw new Error("Empty response from AI");
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
        console.error("Gemini Vocab Generation Error:", error);
        throw error;
    }
}
