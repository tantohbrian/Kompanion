import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Folder, Plus } from 'lucide-react';
import { Button, Panel } from '../../ui';

export const WorkspacePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-full bg-canvas text-text-primary">
      <main className="flex-1 overflow-y-auto p-8 max-w-5xl mx-auto w-full">
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-border">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-text-primary">Workspaces</h1>
            <p className="text-xs text-text-secondary mt-1">
              Select or create a workspace channel for your video projects.
            </p>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/w/default')}
            aria-label="Open default workspace"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Open Default Channel
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Panel className="p-5 flex flex-col justify-between hover:border-border-strong transition-colors duration-fast">
            <div>
              <div className="w-9 h-9 rounded-panel bg-accent/15 text-accent flex items-center justify-center mb-3">
                <Folder className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-semibold text-text-primary">Default Workspace</h2>
              <p className="text-xs text-text-secondary mt-1">
                Standard 16:9 1080p preset for faceless video timelines.
              </p>
            </div>
            <div className="mt-6 pt-3 border-t border-border-subtle flex justify-end">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate('/w/default')}
              >
                Enter Channel
              </Button>
            </div>
          </Panel>
        </div>
      </main>
    </div>
  );
};
