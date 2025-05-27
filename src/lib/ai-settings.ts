export type AIServiceType = "openai" | "gemini" | "claude" | "grok";

export interface AISettings {
  ai_provider: AIServiceType;
  openai_api_key: string;
  openai_model: string;
  gemini_api_key: string;
  gemini_model: string;
  claude_api_key: string;
  claude_api_endpoint: string;
  claude_model: string;
  grok_api_key: string;
  grok_api_endpoint: string;
  grok_model: string;
}

export async function getAISettings(): Promise<AISettings> {
  try {
    const response = await fetch('/api/settings/ai');
    if (!response.ok) {
      throw new Error('Failed to fetch AI settings');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching AI settings:', error);
    return {
      ai_provider: 'openai',
      openai_api_key: process.env.OPENAI_API_KEY || '',
      openai_model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
      gemini_api_key: process.env.GEMINI_API_KEY || '',
      gemini_model: process.env.GEMINI_MODEL || 'gemini-pro',
      claude_api_key: process.env.CLAUDE_API_KEY || '',
      claude_api_endpoint: process.env.CLAUDE_API_ENDPOINT || 'https://api.anthropic.com/v1',
      claude_model: process.env.CLAUDE_MODEL || 'claude-3-opus-20240229',
      grok_api_key: process.env.GROK_API_KEY || '',
      grok_api_endpoint: process.env.GROK_API_ENDPOINT || 'https://api.grok.x/v1',
      grok_model: process.env.GROK_MODEL || 'grok-1',
    };
  }
} 