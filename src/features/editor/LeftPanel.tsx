import React, { useState } from 'react';
import { MediaPanel } from './MediaPanel';
import { ScriptPanel } from './ScriptPanel';

export const LeftPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'media' | 'script'>('media');

  return (
    <aside className="w-64 border-r border-border bg-surface flex flex-col shrink-0 overflow-hidden">
      {/* Tab Switcher */}
      <div className="h-9 border-b border-border flex items-center px-2 gap-1 bg-surface-elevated/20">
        <button
          onClick={() => setActiveTab('media')}
          className={`flex-1 py-1 text-xs font-medium rounded transition-colors text-center ${
            activeTab === 'media'
              ? 'bg-surface-elevated text-text-primary shadow-sm'
              : 'text-text-tertiary hover:text-text-secondary'
          }`}
        >
          Media
        </button>
        <button
          onClick={() => setActiveTab('script')}
          className={`flex-1 py-1 text-xs font-medium rounded transition-colors text-center ${
            activeTab === 'script'
              ? 'bg-surface-elevated text-text-primary shadow-sm'
              : 'text-text-tertiary hover:text-text-secondary'
          }`}
        >
          Script
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'media' ? <MediaPanel /> : <ScriptPanel />}
    </aside>
  );
};
