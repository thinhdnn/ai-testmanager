"use client";

import { useState } from 'react';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general');

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Settings</h1>
      
      <div className="flex mb-6 border-b dark:border-gray-700">
        <button
          className={`pb-2 px-4 ${
            activeTab === 'general'
              ? 'border-b-2 border-primary text-primary font-medium'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
          onClick={() => setActiveTab('general')}
        >
          General
        </button>
        <button
          className={`pb-2 px-4 ${
            activeTab === 'ai'
              ? 'border-b-2 border-primary text-primary font-medium'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
          onClick={() => setActiveTab('ai')}
        >
          AI Settings
        </button>
        <button
          className={`pb-2 px-4 ${
            activeTab === 'rbac'
              ? 'border-b-2 border-primary text-primary font-medium'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
          onClick={() => setActiveTab('rbac')}
        >
          RBAC Editor
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
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