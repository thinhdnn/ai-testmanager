"use client";

import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

function AiSettingsForm() {
  const [openai, setOpenai] = useState({ url: '', apiKey: '', model: '' });
  const [gemini, setGemini] = useState({ url: '', apiKey: '', model: '' });
  const [claude, setClaude] = useState({ url: '', apiKey: '', model: '' });
  const [activeProvider, setActiveProvider] = useState<'openai' | 'gemini' | 'claude'>('openai');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (provider: 'openai' | 'gemini' | 'claude', field: 'url' | 'apiKey' | 'model', value: string) => {
    if (provider === 'openai') setOpenai({ ...openai, [field]: value });
    if (provider === 'gemini') setGemini({ ...gemini, [field]: value });
    if (provider === 'claude') setClaude({ ...claude, [field]: value });
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
      claude;
    if (!active.url.trim() || !active.apiKey.trim() || !active.model.trim()) {
      setError('Please fill in all fields for the selected active provider.');
      setSaving(false);
      return;
    }
    // Simulate API call
    setTimeout(() => {
      setSaving(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    }, 1000);
    // Here you would also save activeProvider
  };

  const providers: Array<{ label: string; state: { url: string; apiKey: string; model: string }; key: 'openai' | 'gemini' | 'claude' }> = [
    { label: 'OpenAI', state: openai, key: 'openai' },
    { label: 'Gemini', state: gemini, key: 'gemini' },
    { label: 'Claude', state: claude, key: 'claude' },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
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
          <div className="flex flex-col gap-2 md:flex-row md:gap-4">
            <input
              className="border border-black rounded px-3 py-2 w-full md:w-1/3"
              placeholder="API URL"
              value={state.url}
              onChange={e => handleChange(key, 'url', e.target.value)}
            />
            <input
              className="border border-black rounded px-3 py-2 w-full md:w-1/3"
              placeholder="API Key"
              value={state.apiKey}
              onChange={e => handleChange(key, 'apiKey', e.target.value)}
            />
            <select
              className="border border-black rounded px-3 py-2 w-full md:w-1/3 bg-white"
              value={state.model}
              onChange={e => handleChange(key, 'model', e.target.value)}
            >
              <option value="">Select Model</option>
              {key === 'openai' && [
                <option key="gpt-3.5-turbo" value="gpt-3.5-turbo">gpt-3.5-turbo</option>,
                <option key="gpt-3.5-turbo-16k" value="gpt-3.5-turbo-16k">gpt-3.5-turbo-16k</option>,
                <option key="gpt-4" value="gpt-4">gpt-4</option>,
                <option key="gpt-4-turbo" value="gpt-4-turbo">gpt-4-turbo</option>,
                <option key="gpt-4-32k" value="gpt-4-32k">gpt-4-32k</option>,
                <option key="gpt-4o" value="gpt-4o">gpt-4o</option>,
              ]}
              {key === 'gemini' && [
                <option key="gemini-pro" value="gemini-pro">gemini-pro</option>,
                <option key="gemini-pro-vision" value="gemini-pro-vision">gemini-pro-vision</option>,
                <option key="gemini-1.5-pro-latest" value="gemini-1.5-pro-latest">gemini-1.5-pro-latest</option>,
                <option key="gemini-ultra" value="gemini-ultra">gemini-ultra</option>,
              ]}
              {key === 'claude' && [
                <option key="claude-2.0" value="claude-2.0">claude-2.0</option>,
                <option key="claude-2.1" value="claude-2.1">claude-2.1</option>,
                <option key="claude-3-opus-20240229" value="claude-3-opus-20240229">claude-3-opus-20240229</option>,
                <option key="claude-3-sonnet-20240229" value="claude-3-sonnet-20240229">claude-3-sonnet-20240229</option>,
                <option key="claude-3-haiku-20240307" value="claude-3-haiku-20240307">claude-3-haiku-20240307</option>,
              ]}
            </select>
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
      {error && <div className="text-red-600 font-medium mt-2">{error}</div>}
      {success && <div className="text-green-600 font-medium mt-2">Settings saved!</div>}
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