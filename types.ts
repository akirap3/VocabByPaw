
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
  iconUrl: string;
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
    imageUrl: 'https://github.com/akirap3/OrangeCatEnglishDiary/blob/main/images/vocabByPaw/meowton/meowaustrant.png?raw=true',
    iconUrl: 'https://github.com/akirap3/OrangeCatEnglishDiary/blob/main/images/vocabByPaw/meowton/meowton_face.png?raw=true',
    promptSignature: 'a chubby orange tabby cat with round glasses named Sir Isaac'
  },
  {
    id: 'buddy',
    name: 'Buddy',
    description: 'ADVENTUROUS CORGI',
    imageUrl: 'https://raw.githubusercontent.com/akirap3/OrangeCatEnglishDiary/refs/heads/main/images/vocabByPaw/buddy/buddy_astronaut_rmbg.png',
    iconUrl: 'https://github.com/akirap3/OrangeCatEnglishDiary/blob/main/images/vocabByPaw/buddy/buddy_face.png?raw=true',
    promptSignature: 'a cute perky corgi named Buddy'
  },
  {
    id: 'rocket',
    name: 'Rocket',
    description: 'NAUGHTY RACCOON',
    imageUrl: 'https://raw.githubusercontent.com/akirap3/OrangeCatEnglishDiary/refs/heads/main/images/vocabByPaw/rocket/rocket_rmbg.png',
    iconUrl: 'https://github.com/akirap3/OrangeCatEnglishDiary/blob/main/images/vocabByPaw/rocket/rocket-face.png?raw=true',
    promptSignature: 'a mischievous and clever raccoon named Rocket'
  }
];
