import { NextRequest, NextResponse } from "next/server";
import { getAISettings } from "@/lib/ai/ai-settings";
import { prisma } from "@/lib/db";

// Helper function to save models cache to database
async function saveModelsCache(provider: string, models: any[]) {
  try {
    const cacheKey = `cached_${provider}_models`;
    const cacheValue = JSON.stringify(models);
    
    await prisma.setting.upsert({
      where: { key: cacheKey },
      update: { value: cacheValue },
      create: { 
        key: cacheKey,
        value: cacheValue
      }
    });
    
    console.log(`[${provider}] Saved ${models.length} models to database cache`);
  } catch (error) {
    console.error(`[${provider}] Failed to save models cache:`, error);
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const provider = searchParams.get('provider');
  const forceRefresh = searchParams.get('force_refresh') === 'true';

  try {
    const settings = await getAISettings();

    if (provider === 'gemini') {
      return await fetchGeminiModels(settings.gemini_api_key, settings.cached_gemini_models || null, forceRefresh);
    } else if (provider === 'openai') {
      return await fetchOpenAIModels(settings.openai_api_key, settings.cached_openai_models || null, forceRefresh);
    } else if (provider === 'claude') {
      return await fetchClaudeModels(settings.claude_api_key, settings.cached_claude_models || null, forceRefresh);
    } else if (provider === 'grok') {
      return await fetchGrokModels(settings.grok_api_key, settings.cached_grok_models || null, forceRefresh);
    }

    return NextResponse.json({ models: [] });
  } catch (error) {
    console.error(`Error fetching ${provider} models:`, error);
    return NextResponse.json({ 
      models: [], 
      fallback: true,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function fetchGeminiModels(apiKey: string, cachedModels: string | null, forceRefresh: boolean) {
  if (!apiKey) {
    return NextResponse.json(
      { error: "Gemini API key not found" },
      { status: 400 }
    );
  }

  try {
    if (cachedModels && !forceRefresh) {
      const models = JSON.parse(cachedModels);
      console.log("[Gemini] Using cached models from database");
      return NextResponse.json({ 
        models: models,
        cached: true 
      });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.statusText}`);
    }

    const data = await response.json();

    console.log(data);
    
    // Filter and format models that support generateContent
    const models = data.models
      ?.filter((model: any) => 
        model.supportedGenerationMethods?.includes('generateContent') &&
        model.name.includes('gemini')
      )
      ?.map((model: any) => ({
        id: model.baseModelId || model.name.replace('models/', ''),
        name: model.displayName || model.baseModelId || model.name.replace('models/', ''),
        description: model.description || '',
      })) || [];

    // Save to cache on success
    await saveModelsCache('gemini', models);
    
    return NextResponse.json({ models });
  } catch (error) {
    console.error("Error fetching Gemini models:", error);
    
    // Fallback to hardcoded models if API and cache both fail
    const fallbackModels = [
      { id: 'gemini-2.5-pro-preview', name: 'Gemini 2.5 Pro Preview' },
      { id: 'gemini-2.5-flash-exp', name: 'Gemini 2.5 Flash Experimental' },
      { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash Experimental' },
      { id: 'gemini-exp-1206', name: 'Gemini Experimental 1206' },
    ];
    
    return NextResponse.json({ 
      models: fallbackModels,
      fallback: true,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function fetchOpenAIModels(apiKey: string, cachedModels: string | null, forceRefresh: boolean) {
  if (!apiKey) {
    return NextResponse.json(
      { error: "OpenAI API key not found" },
      { status: 400 }
    );
  }

  try {
    if (cachedModels && !forceRefresh) {
      const models = JSON.parse(cachedModels);
      console.log("[OpenAI] Using cached models from database");
      return NextResponse.json({ 
        models: models,
        cached: true 
      });
    }

    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Filter and format OpenAI models - focus on chat models
    const models = data.data
      ?.filter((model: any) => 
        model.id.includes('gpt') || 
        model.id.includes('o1') ||
        model.id.includes('text-')
      )
      ?.map((model: any) => ({
        id: model.id,
        name: model.id,
        description: `OpenAI model: ${model.id}`,
        owned_by: model.owned_by,
      }))
      ?.sort((a: any, b: any) => {
        // Sort by preference: o1 models first, then gpt-4, then gpt-3.5
        const getScore = (id: string) => {
          if (id.includes('o1')) return 4;
          if (id.includes('gpt-4')) return 3;
          if (id.includes('gpt-3.5')) return 2;
          return 1;
        };
        return getScore(b.id) - getScore(a.id);
      }) || [];

    // Save to cache on success
    await saveModelsCache('openai', models);
    
    return NextResponse.json({ models });
  } catch (error) {
    console.error("Error fetching OpenAI models:", error);
    
    // Fallback to hardcoded models if API and cache both fail
    const fallbackModels = [
      { id: 'o1', name: 'o1' },
      { id: 'o1-mini', name: 'o1-mini' },
      { id: 'gpt-4o', name: 'gpt-4o' },
      { id: 'gpt-4o-mini', name: 'gpt-4o-mini' },
      { id: 'gpt-4-turbo', name: 'gpt-4-turbo' },
      { id: 'gpt-4', name: 'gpt-4' },
      { id: 'gpt-3.5-turbo', name: 'gpt-3.5-turbo' },
    ];
    
    return NextResponse.json({ 
      models: fallbackModels,
      fallback: true,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function fetchClaudeModels(apiKey: string, cachedModels: string | null, forceRefresh: boolean) {
  if (!apiKey) {
    return NextResponse.json(
      { error: "Claude API key not found" },
      { status: 400 }
    );
  }

  try {
    if (cachedModels && !forceRefresh) {
      const models = JSON.parse(cachedModels);
      console.log("[Claude] Using cached models from database");
      return NextResponse.json({ 
        models: models,
        cached: true 
      });
    }

    const response = await fetch('https://api.anthropic.com/v1/models', {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Filter and format Claude models
    const models = data.data
      ?.filter((model: any) => model.id.includes('claude'))
      ?.map((model: any) => ({
        id: model.id,
        name: model.display_name || model.id,
        description: `Claude model: ${model.display_name || model.id}`,
        created_at: model.created_at,
      }))
      ?.sort((a: any, b: any) => {
        // Sort by creation date (newest first)
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }) || [];

    // Save to cache on success
    await saveModelsCache('claude', models);
    
    return NextResponse.json({ models });
  } catch (error) {
    console.error("Error fetching Claude models:", error);
    
    // Fallback to hardcoded models if API and cache both fail
    const fallbackModels = [
      { id: 'claude-opus-4-20250514', name: 'Claude Opus 4' },
      { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4' },
      { id: 'claude-3-7-sonnet-20250219', name: 'Claude 3.7 Sonnet' },
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
      { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku' },
      { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' },
      { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet' },
      { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku' },
    ];
    
    return NextResponse.json({ 
      models: fallbackModels,
      fallback: true,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function fetchGrokModels(apiKey: string, cachedModels: string | null, forceRefresh: boolean) {
  if (!apiKey) {
    return NextResponse.json(
      { error: "Grok API key not found" },
      { status: 400 }
    );
  }

  try {
    if (cachedModels && !forceRefresh) {
      const models = JSON.parse(cachedModels);
      console.log("[Grok] Using cached models from database");
      return NextResponse.json({ 
        models: models,
        cached: true 
      });
    }

    const response = await fetch('https://api.x.ai/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Filter and format Grok models
    const models = data.data
      ?.filter((model: any) => model.id.includes('grok'))
      ?.map((model: any) => ({
        id: model.id,
        name: model.id,
        description: `Grok model: ${model.id}`,
        owned_by: model.owned_by || 'x-ai',
      })) || [];

    // Save to cache on success
    await saveModelsCache('grok', models);
    
    return NextResponse.json({ models });
  } catch (error) {
    console.error("Error fetching Grok models:", error);
    
    // Fallback to hardcoded models if API and cache both fail
    const fallbackModels = [
      { id: 'grok-2-latest', name: 'grok-2-latest' },
      { id: 'grok-2-1212', name: 'grok-2-1212' },
      { id: 'grok-beta', name: 'grok-beta' },
    ];
    
    return NextResponse.json({ 
      models: fallbackModels,
      fallback: true,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 