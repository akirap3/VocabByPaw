import { GoogleGenAI, Type } from "@google/genai";
import { VocabGenerationParams, VocabItem } from "../types";

// Initialize the Gemini API client
// Note: API Key must be provided via process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const IMAGE_MODEL_NAME = 'gemini-2.5-flash-image';
const TEXT_MODEL_NAME = 'gemini-3-flash-preview';

/**
 * Generates or edits an image using Gemini 2.5 Flash Image.
 * 
 * @param prompt The text description for generation or editing instructions.
 * @param inputImageBase64 Optional base64 string of an existing image to edit.
 * @param aspectRatio The desired aspect ratio for the generated image (e.g., "1:1", "16:9", "9:16").
 * @returns The base64 string of the generated image.
 */
export const generateImageContent = async (
  prompt: string,
  inputImageBase64?: string,
  aspectRatio: string = "1:1"
): Promise<string | null> => {
  try {
    const parts: any[] = [];

    // If we have an input image, we add it to the parts (Editing mode)
    if (inputImageBase64) {
      // Remove data URL prefix if present for clean base64
      const cleanBase64 = inputImageBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');
      
      parts.push({
        inlineData: {
          mimeType: 'image/png', // Assuming PNG for simplicity, usually safe for standard base64 from canvas/input
          data: cleanBase64
        }
      });
    }

    // Add the text prompt
    parts.push({ text: prompt });

    // Call the API
    const response = await ai.models.generateContent({
      model: IMAGE_MODEL_NAME,
      contents: {
        parts: parts
      },
      // Configuration can be tuned here
      config: {
        imageConfig: {
            aspectRatio: aspectRatio
        }
      }
    });

    // Extract the image from the response
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

/**
 * Generates a list of vocabulary items based on user input (manual list or topic)
 */
export const generateVocabList = async (params: VocabGenerationParams): Promise<VocabItem[]> => {
    try {
        let systemInstruction = `You are a professional linguist and vocabulary teacher. 
        Your task is to generate structured vocabulary cards.
        The user wants the definitions and target sentences in this language: ${params.targetLanguage}.
        Ensure the 'phonetic' field uses KK Phonetic symbols.
        Ensure the 'imagePrompt' describes a "Soft watercolor and ink illustration" featuring a chubby orange tabby cat with round glasses (Sir Isaac) acting out the word. The style should be whimsical, cozy, and detailed, like a children's storybook.`;

        let userPrompt = "";

        if (params.mode === 'manual') {
            userPrompt = `Generate detailed vocabulary cards for the following words: ${params.input}. 
            Provide exactly one card per word provided.`;
        } else {
            const levels = params.proficiencyLevels.length > 0 ? params.proficiencyLevels.join(", ") : "General";
            userPrompt = `Generate 9 vocabulary words related to the topic/prompt: "${params.input}".
            Target Proficiency Levels: ${levels}.
            Select words that match these proficiency levels.`;
        }

        const response = await ai.models.generateContent({
            model: TEXT_MODEL_NAME,
            contents: userPrompt,
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
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
            }
        });

        const jsonString = response.text;
        if (!jsonString) throw new Error("Empty response from AI");

        const parsedData = JSON.parse(jsonString);
        
        // Map to ensure IDs are added (using timestamp + index for uniqueness)
        const timestamp = Date.now();
        return parsedData.map((item: any, index: number) => ({
            id: timestamp + index,
            word: item.word,
            phonetic: item.phonetic,
            definition: item.definition,
            englishSentence: item.englishSentence,
            targetSentence: item.targetSentence,
            imagePrompt: item.imagePrompt
        }));

    } catch (error) {
        console.error("Gemini Vocab Generation Error:", error);
        throw error;
    }
}