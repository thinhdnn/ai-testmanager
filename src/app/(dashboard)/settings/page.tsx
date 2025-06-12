"use client";

import { useState, useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

function AiSettingsForm() {
  const [openai, setOpenai] = useState({ url: '', apiKey: '', model: '' });
  const [gemini, setGemini] = useState({ url: '', apiKey: '', model: '' });
  const [claude, setClaude] = useState({ url: '', apiKey: '', model: '' });
  const [grok, setGrok] = useState({ url: '', apiKey: '', model: '' });
  const [activeProvider, setActiveProvider] = useState<'openai' | 'gemini' | 'claude' | 'grok'>('openai');
  const [autoUseAiSuggestion, setAutoUseAiSuggestion] = useState(true);
  const [editingKeys, setEditingKeys] = useState({
    openai: false,
    gemini: false, 
    claude: false,
    grok: false
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [modelErrors, setModelErrors] = useState<{[key: string]: string}>({});
  
  // Dynamic models state
  const [geminiModels, setGeminiModels] = useState<Array<{id: string, name: string, description?: string}>>([]);
  const [openaiModels, setOpenaiModels] = useState<Array<{id: string, name: string, description?: string}>>([]);
  const [claudeModels, setClaudeModels] = useState<Array<{id: string, name: string, description?: string}>>([]);
  const [grokModels, setGrokModels] = useState<Array<{id: string, name: string, description?: string}>>([]);
  const [loadingModels, setLoadingModels] = useState<{ [key: string]: boolean }>({});

  // Load cached models for all providers on init
  const loadCachedModels = async () => {
    console.log('Loading cached models for all providers...');
    const providers: Array<'openai' | 'gemini' | 'claude' | 'grok'> = ['openai', 'gemini', 'claude', 'grok'];
    
    for (const provider of providers) {
      try {
        const res = await fetch(`/api/settings/ai/models?provider=${provider}`);
        if (res.ok) {
          const data = await res.json();
          if (data.cached) {
            console.log(`[${provider}] ✓ Loaded ${data.models?.length || 0} cached models`);
            if (provider === 'openai') setOpenaiModels(data.models || []);
            if (provider === 'gemini') setGeminiModels(data.models || []);
            if (provider === 'claude') setClaudeModels(data.models || []);
            if (provider === 'grok') setGrokModels(data.models || []);
          }
        }
      } catch (error) {
        console.error(`[${provider}] Failed to load cached models:`, error);
        // Don't show error for initial load
      }
    }
  };

  // Fetch models dynamically for all providers
  const fetchModels = async (provider: 'openai' | 'gemini' | 'claude' | 'grok', forceRefresh = false) => {
    const providerState = 
      provider === 'openai' ? openai :
      provider === 'gemini' ? gemini :
      provider === 'claude' ? claude : grok;
      
    console.log(`[${provider}] Checking API key:`, { 
      hasApiKey: !!providerState.apiKey,
      isMasked: providerState.apiKey?.startsWith('******'),
      keyLength: providerState.apiKey?.length,
      forceRefresh
    });
      
    if (!providerState.apiKey) {
      setModelErrors(prev => ({
        ...prev,
        [provider]: 'Please enter an API key first'
      }));
      return;
    }
    
    if (providerState.apiKey.startsWith('******')) {
      console.log(`[${provider}] API key is masked - will try to fetch anyway (for manual testing)`);
    }
    
    const action = forceRefresh ? 'Force refreshing' : 'Fetching';
    console.log(`[${provider}] ${action} models...`);
    setLoadingModels(prev => ({ ...prev, [provider]: true }));
    setModelErrors(prev => ({ ...prev, [provider]: '' }));
    try {
      const url = `/api/settings/ai/models?provider=${provider}${forceRefresh ? '&force_refresh=true' : ''}`;
      const res = await fetch(url);
      console.log(`[${provider}] API response status:`, res.status);
      if (res.ok) {
        const data = await res.json();
        console.log(`[${provider}] Models received:`, data.models?.length || 0, data.cached ? '(from cache)' : '(from API)');
        if (data.cached) {
          console.log(`[${provider}] ✓ Models loaded from database cache`);
        } else {
          console.log(`[${provider}] ✓ Models fetched from API and saved to cache`);
        }
        
        if (provider === 'openai') setOpenaiModels(data.models || []);
        if (provider === 'gemini') setGeminiModels(data.models || []);
        if (provider === 'claude') setClaudeModels(data.models || []);
        if (provider === 'grok') setGrokModels(data.models || []);
      } else {
        throw new Error(`Failed to fetch models for ${provider}`);
      }
    } catch (error) {
      console.error(`[${provider}] Failed to fetch models:`, error);
      setModelErrors(prev => ({
        ...prev,
        [provider]: `Failed to fetch models. Please check your API key and try again.`
      }));
    } finally {
      setLoadingModels(prev => ({ ...prev, [provider]: false }));
    }
  };

  // Fetch settings from API on mount
  useEffect(() => {
    (async () => {
      try {
        console.log('Loading AI settings from API...');
        setLoadingError(null);
        const res = await fetch('/api/settings/ai');
        if (!res.ok) {
          throw new Error('Failed to load settings from server');
        }
        const data = await res.json();
        console.log('AI settings loaded:', data);
        
        if (data.openai) {
          console.log('Setting OpenAI data:', data.openai);
          setOpenai(data.openai);
        }
        if (data.gemini) {
          console.log('Setting Gemini data:', data.gemini);
          setGemini(data.gemini);
        }
        if (data.claude) {
          console.log('Setting Claude data:', data.claude);
          setClaude(data.claude);
        }
        if (data.grok) {
          console.log('Setting Grok data:', data.grok);
          setGrok(data.grok);
        }
        if (data.activeProvider) setActiveProvider(data.activeProvider);
        if (data.autoUseAiSuggestion !== undefined) setAutoUseAiSuggestion(data.autoUseAiSuggestion);
        
        // Reset editing states when loading fresh data
        setEditingKeys({ openai: false, gemini: false, claude: false, grok: false });
        
        // Load cached models after settings are loaded
        setTimeout(loadCachedModels, 100);
      } catch (e) {
        console.error('Failed to load AI settings:', e);
        setLoadingError('Failed to load settings. Please refresh the page to try again.');
      }
    })();
  }, []);

  // Remove auto-fetch on API key change
  useEffect(() => {
    console.log('[OpenAI] useEffect triggered, apiKey:', { 
      hasKey: !!openai.apiKey, 
      isMasked: openai.apiKey?.startsWith('******'),
      value: openai.apiKey 
    });
  }, [openai.apiKey]);

  useEffect(() => {
    console.log('[Gemini] useEffect triggered, apiKey:', { 
      hasKey: !!gemini.apiKey, 
      isMasked: gemini.apiKey?.startsWith('******'),
      value: gemini.apiKey 
    });
  }, [gemini.apiKey]);

  useEffect(() => {
    console.log('[Claude] useEffect triggered, apiKey:', { 
      hasKey: !!claude.apiKey, 
      isMasked: claude.apiKey?.startsWith('******'),
      value: claude.apiKey 
    });
  }, [claude.apiKey]);

  useEffect(() => {
    console.log('[Grok] useEffect triggered, apiKey:', { 
      hasKey: !!grok.apiKey, 
      isMasked: grok.apiKey?.startsWith('******'),
      value: grok.apiKey 
    });
  }, [grok.apiKey]);

  const handleChange = (provider: 'openai' | 'gemini' | 'claude' | 'grok', field: 'url' | 'apiKey' | 'model', value: string) => {
    if (provider === 'openai') setOpenai({ ...openai, [field]: value });
    if (provider === 'gemini') setGemini({ ...gemini, [field]: value });
    if (provider === 'claude') setClaude({ ...claude, [field]: value });
    if (provider === 'grok') setGrok({ ...grok, [field]: value });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSaving(true);
    // Validation: active provider must have all fields filled
    const active =
      activeProvider === 'openai' ? openai :
      activeProvider === 'gemini' ? gemini :
      activeProvider === 'claude' ? claude :
      grok;
    if (!active.url.trim() || !active.apiKey.trim() || !active.model.trim()) {
      setError('Please fill in all fields for the selected active provider.');
      setSaving(false);
      return;
    }
    // Save to API
    try {
      const res = await fetch('/api/settings/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          openai,
          gemini,
          claude,
          grok,
          activeProvider,
          autoUseAiSuggestion,
        }),
      });
      if (!res.ok) throw new Error('Failed to save');
      setSuccess(true);
      setEditingKeys({ openai: false, gemini: false, claude: false, grok: false });
      setTimeout(() => setSuccess(false), 2000);
    } catch (e) {
      setError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleEditApiKey = (provider: 'openai' | 'gemini' | 'claude' | 'grok') => {
    setEditingKeys(prev => ({ ...prev, [provider]: true }));
    // Clear the API key field when starting to edit
    if (provider === 'openai') setOpenai({ ...openai, apiKey: '' });
    if (provider === 'gemini') setGemini({ ...gemini, apiKey: '' });
    if (provider === 'claude') setClaude({ ...claude, apiKey: '' });
    if (provider === 'grok') setGrok({ ...grok, apiKey: '' });
  };

  const isMaskedApiKey = (apiKey: string) => {
    return apiKey && apiKey.startsWith('******');
  };

  const renderApiKeyInput = (provider: 'openai' | 'gemini' | 'claude' | 'grok', state: { url: string; apiKey: string; model: string }) => {
    const isMasked = isMaskedApiKey(state.apiKey);
    const isEditing = editingKeys[provider];
    
    if (isMasked && !isEditing) {
      return (
        <div className="flex items-center gap-2 w-full md:w-1/5">
          <input
            className="border border-black rounded px-3 py-2 flex-1 bg-gray-100 min-w-0"
            value={state.apiKey}
            readOnly
            placeholder="API Key"
          />
          <button
            type="button"
            onClick={() => handleEditApiKey(provider)}
            className="px-3 py-2 text-sm border border-black rounded bg-blue-100 hover:bg-blue-200 whitespace-nowrap"
          >
            Edit
          </button>
        </div>
      );
    }
    
    return (
      <input
        className="border border-black rounded px-3 py-2 w-full md:w-1/5"
        placeholder="API Key"
        value={state.apiKey}
        onChange={e => handleChange(provider, 'apiKey', e.target.value)}
        type="password"
      />
    );
  };

  const providers: Array<{ label: string; state: { url: string; apiKey: string; model: string }; key: 'openai' | 'gemini' | 'claude' | 'grok' }> = [
    { label: 'OpenAI', state: openai, key: 'openai' },
    { label: 'Gemini', state: gemini, key: 'gemini' },
    { label: 'Claude', state: claude, key: 'claude' },
    { label: 'Grok', state: grok, key: 'grok' },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {loadingError && (
        <div className="p-4 mb-4 text-red-700 bg-red-100 rounded-lg">
          <p className="font-medium">{loadingError}</p>
        </div>
      )}
      
      <div className="mb-6 p-4 border border-black rounded bg-gray-50">
        <h3 className="font-semibold text-lg mb-4">AI Behavior Settings</h3>
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={autoUseAiSuggestion}
            onChange={(e) => setAutoUseAiSuggestion(e.target.checked)}
            className="w-4 h-4"
          />
          <span className="font-medium">Auto use AI suggestions</span>
        </label>
        <p className="text-sm text-gray-600 mt-2 ml-7">
          When enabled, AI suggestions will be automatically applied. When disabled, suggestions will require manual confirmation.
        </p>
      </div>
      
      <div className="mb-4">
        <label className="font-semibold mr-4">Active Provider:</label>
        {providers.map(({ label, key }) => (
          <label key={key} className="mr-4">
            <input
              type="radio"
              name="activeProvider"
              value={key}
              checked={activeProvider === key}
              onChange={() => setActiveProvider(key)}
              className="mr-1"
            />
            {label}
          </label>
        ))}
        <span className="ml-2 text-sm text-gray-500">Currently using: <span className="font-bold text-black">{providers.find(p => p.key === activeProvider)?.label}</span></span>
      </div>
      {providers.map(({ label, state, key }) => (
        <div key={key} className="space-y-2">
          <h3 className="font-semibold text-lg">{label}</h3>
          <div className="flex flex-col gap-2 md:flex-row md:gap-2">
            <input
              className="border border-black rounded px-3 py-2 w-full md:w-1/5"
              placeholder="API URL"
              value={state.url}
              onChange={e => handleChange(key, 'url', e.target.value)}
            />
            {renderApiKeyInput(key, state)}
            <div className="flex items-center gap-2 w-full md:flex-1">
              <select
                className="border border-black rounded px-3 py-2 flex-1 bg-white min-w-0"
                value={state.model}
                onChange={e => handleChange(key, 'model', e.target.value)}
              >
                <option value="">Select Model</option>
                {key === 'openai' && (
                  loadingModels.openai ? (
                    <option disabled>Loading models...</option>
                  ) : openaiModels.length > 0 ? (
                    openaiModels.map(model => (
                      <option key={model.id} value={model.id} title={model.description}>
                        {model.name}
                      </option>
                    ))
                  ) : (
                    // Fallback to hardcoded models if API fails or no API key
                    [
                <option key="o1" value="o1">o1</option>,
                <option key="o1-mini" value="o1-mini">o1-mini</option>,
                <option key="gpt-4o" value="gpt-4o">gpt-4o</option>,
                <option key="gpt-4o-mini" value="gpt-4o-mini">gpt-4o-mini</option>,
                <option key="gpt-4-turbo" value="gpt-4-turbo">gpt-4-turbo</option>,
                <option key="gpt-4" value="gpt-4">gpt-4</option>,
                <option key="gpt-3.5-turbo" value="gpt-3.5-turbo">gpt-3.5-turbo</option>,
                    ]
                  )
                )}
                {key === 'gemini' && (
                  loadingModels.gemini ? (
                    <option disabled>Loading models...</option>
                  ) : geminiModels.length > 0 ? (
                    geminiModels.map(model => (
                      <option key={model.id} value={model.id} title={model.description}>
                        {model.name}
                      </option>
                    ))
                  ) : (
                    // Fallback to hardcoded models if API fails or no API key
                    [
                <option key="gemini-2.5-pro-preview" value="gemini-2.5-pro-preview">gemini-2.5-pro-preview</option>,
                <option key="gemini-2.5-flash-exp" value="gemini-2.5-flash-exp">gemini-2.5-flash-exp</option>,
                <option key="gemini-2.0-flash-exp" value="gemini-2.0-flash-exp">gemini-2.0-flash-exp</option>,
                <option key="gemini-exp-1206" value="gemini-exp-1206">gemini-exp-1206</option>,
                    ]
                  )
                )}
                {key === 'claude' && (
                  loadingModels.claude ? (
                    <option disabled>Loading models...</option>
                  ) : claudeModels.length > 0 ? (
                    claudeModels.map(model => (
                      <option key={model.id} value={model.id} title={model.description}>
                        {model.name}
                      </option>
                    ))
                  ) : (
                    // Fallback to hardcoded models if API fails or no API key
                    [
                      <option key="claude-opus-4-20250514" value="claude-opus-4-20250514">Claude Opus 4</option>,
                      <option key="claude-sonnet-4-20250514" value="claude-sonnet-4-20250514">Claude Sonnet 4</option>,
                      <option key="claude-3-7-sonnet-20250219" value="claude-3-7-sonnet-20250219">Claude 3.7 Sonnet</option>,
                      <option key="claude-3-5-sonnet-20241022" value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</option>,
                      <option key="claude-3-5-haiku-20241022" value="claude-3-5-haiku-20241022">Claude 3.5 Haiku</option>,
                      <option key="claude-3-opus-20240229" value="claude-3-opus-20240229">Claude 3 Opus</option>,
                    ]
                  )
                )}
                {key === 'grok' && (
                  loadingModels.grok ? (
                    <option disabled>Loading models...</option>
                  ) : grokModels.length > 0 ? (
                    grokModels.map(model => (
                      <option key={model.id} value={model.id} title={model.description}>
                        {model.name}
                      </option>
                    ))
                  ) : (
                    // Fallback to hardcoded models if API fails or no API key
                    [
                      <option key="grok-2-latest" value="grok-2-latest">grok-2-latest</option>,
                      <option key="grok-2-1212" value="grok-2-1212">grok-2-1212</option>,
                      <option key="grok-beta" value="grok-beta">grok-beta</option>,
                    ]
                  )
                )}
              </select>
              <button
                type="button"
                onClick={() => fetchModels(key, true)}
                disabled={loadingModels[key]}
                className="px-3 py-2 text-sm border border-black rounded bg-blue-100 hover:bg-blue-200 disabled:opacity-50 flex items-center justify-center min-w-[40px] max-w-[40px] flex-shrink-0"
                title={`Force refresh models from ${key.toUpperCase()} API (bypass cache)`}
              >
                {loadingModels[key] ? (
                  <div className="animate-spin">⟳</div>
                ) : (
                  '↻'
                )}
              </button>
            </div>
            {modelErrors[key] && (
              <div className="text-red-600 text-sm mt-1">{modelErrors[key]}</div>
            )}
          </div>
        </div>
      ))}
      <button
        type="submit"
        className="px-5 py-2 border border-black bg-yellow-300 font-bold rounded shadow"
        disabled={saving}
      >
        {saving ? 'Saving...' : 'Save'}
      </button>
      {error && (
        <div className="p-4 text-red-700 bg-red-100 rounded-lg">
          <p className="font-medium">{error}</p>
        </div>
      )}
      {success && (
        <div className="p-4 text-green-700 bg-green-100 rounded-lg">
          <p className="font-medium">Settings saved successfully!</p>
        </div>
      )}
    </form>
  );
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general');

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Settings</h1>
      <div className="flex mb-6 gap-2">
        <button
          className={`px-5 py-2 border border-black font-medium transition-all duration-150
            ${activeTab === 'general' ? 'bg-yellow-300 font-bold' : 'bg-transparent'}
          `}
          onClick={() => setActiveTab('general')}
        >
          General
        </button>
        <button
          className={`px-5 py-2 border border-black font-medium transition-all duration-150
            ${activeTab === 'ai' ? 'bg-yellow-300 font-bold' : 'bg-transparent'}
          `}
          onClick={() => setActiveTab('ai')}
        >
          AI Settings
        </button>
        <button
          className={`px-5 py-2 border border-black font-medium transition-all duration-150
            ${activeTab === 'rbac' ? 'bg-yellow-300 font-bold' : 'bg-transparent'}
          `}
          onClick={() => setActiveTab('rbac')}
        >
          RBAC Editor
        </button>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-black">
        {activeTab === 'general' && (
          <div>
            <h2 className="text-xl font-medium mb-4">General Settings</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">Configure general system settings</p>
            {/* General settings form would go here */}
          </div>
        )}
        {activeTab === 'ai' && (
          <div>
            <h2 className="text-xl font-medium mb-4">AI Configuration</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">Configure AI providers and settings</p>
            <AiSettingsForm />
            {/* AI settings form would go here */}
          </div>
        )}
        {activeTab === 'rbac' && (
          <div>
            <h2 className="text-xl font-medium mb-4">RBAC Editor</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">Configure roles and permissions</p>
            {/* RBAC editor would go here */}
          </div>
        )}
      </div>
    </div>
  );
} 