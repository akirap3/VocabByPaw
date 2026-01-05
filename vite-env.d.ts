/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_USER: string
  readonly VITE_PASS: string
  readonly GEMINI_API_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
