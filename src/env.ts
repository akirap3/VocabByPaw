// Runtime environment configuration
// - Vercel: env vars injected at build time via import.meta.env
// - Docker: env vars injected at runtime via window.__ENV__
// - Local dev: env vars from .env via Vite

interface EnvConfig {
  GEMINI_API_KEY: string;
  VITE_USER: string;
  VITE_PASS: string;
}

declare global {
  interface Window {
    __ENV__?: EnvConfig;
  }
}

// Priority: window.__ENV__ (Docker runtime) > import.meta.env (Vercel/dev build)
export const env: EnvConfig = {
  GEMINI_API_KEY: 
    window.__ENV__?.GEMINI_API_KEY || 
    import.meta.env.VITE_GEMINI_API_KEY || 
    import.meta.env.GEMINI_API_KEY || 
    '',
  VITE_USER: 
    window.__ENV__?.VITE_USER || 
    import.meta.env.VITE_USER || 
    '',
  VITE_PASS: 
    window.__ENV__?.VITE_PASS || 
    import.meta.env.VITE_PASS || 
    '',
};
