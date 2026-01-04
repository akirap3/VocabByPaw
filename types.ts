
export interface VocabItem {
  id: number;
  word: string;
  phonetic: string;
  definition: string;
  englishSentence: string;
  targetSentence: string; 
  imagePrompt: string;
}

export type GenerationMode = 'create' | 'edit';
export type InputMode = 'manual' | 'topic';
export type AppMode = 'vocab' | 'collage';

export interface Character {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  promptSignature: string;
}

export interface VocabGenerationParams {
  input: string;
  mode: InputMode;
  targetLanguage: string;
  proficiencyLevels: string[];
  character?: Character;
}

export const CHARACTERS: Character[] = [
  {
    id: 'isaac',
    name: 'Sir Isaac',
    description: 'CHUBBY ORANGE CAT',
    imageUrl: 'https://raw.githubusercontent.com/akirap3/OrangeCatEnglishDiary/refs/heads/main/images/vocabByPaw/meowaustrant.png',
    promptSignature: 'a chubby orange tabby cat with round glasses (Sir Isaac) in a soft watercolor astronaut suit'
  },
  {
    id: 'buddy',
    name: 'Buddy',
    description: 'ADVENTUROUS CORGI',
    imageUrl: 'https://raw.githubusercontent.com/akirap3/OrangeCatEnglishDiary/refs/heads/main/images/vocabByPaw/buddy/buddy_astronaut_rmbg.png',
    promptSignature: 'a cute perky corgi astronaut named Buddy in a soft watercolor space suit'
  },
  {
    id: 'rocket',
    name: 'Rocket',
    description: 'NAUGHTY RACCOON',
    imageUrl: 'https://raw.githubusercontent.com/akirap3/OrangeCatEnglishDiary/refs/heads/main/images/vocabByPaw/rocket/rocket_rmbg.png',
    promptSignature: 'a mischievous and clever raccoon astronaut named Rocket in a soft watercolor space suit'
  }
];
