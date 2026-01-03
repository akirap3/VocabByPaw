export interface VocabItem {
  id: number;
  word: string;
  phonetic: string;
  definition: string;
  englishSentence: string;
  targetSentence: string; // Renamed from chineseSentence
  imagePrompt: string;
}

export type GenerationMode = 'create' | 'edit';

export type InputMode = 'manual' | 'topic';

export interface VocabGenerationParams {
  input: string;
  mode: InputMode;
  targetLanguage: string;
  proficiencyLevels: string[];
}
