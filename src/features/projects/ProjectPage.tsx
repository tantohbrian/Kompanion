import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Film, Plus, AlertCircle, Download } from 'lucide-react';
import { Button, Panel } from '../../ui';
import { migrateAndValidateProject } from '../../core/model/migrations';
import { downloadCorruptProjectJson } from './recovery';

export const ProjectPage: React.FC = () => {
  const { workspaceId = 'default' } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  const [corruptState, setCorruptState] = useState<{ isCorrupt: boolean; rawData: unknown } | null>(null);

  const handleTestCorruptProject = () => {
    const invalidData = {
      id: 'corrupt-demo',
      schemaVersion: 1,
      name: 'Unrecoverable Invalid Project',
      settings: 'corrupt_string_not_object',
    };
    const result = migrateAndValidateProject(invalidData);
    if (!result.ok) {
      setCorruptState({ isCorrupt: true, rawData: result.rawData });
    }
  };

  return (
    <div className="flex flex-col h-full bg-canvas text-text-primary">
      <main className="flex-1 overflow-y-auto p-8 max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
            aria-label="Back to workspaces"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Workspaces
          </Button>
          <span className="text-text-tertiary">/</span>
          <span className="text-xs font-medium text-text-secondary capitalize">{workspaceId} Channel</span>
        </div>

        <div className="flex items-center justify-between mb-8 pb-4 border-b border-border">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-text-primary">Projects</h1>
            <p className="text-xs text-text-secondary mt-1">
              Assemble image and voiceover timelines for YouTube videos.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleTestCorruptProject}
              title="Simulates corrupt project data recovery per PRD Section 8"
            >
              Test Recovery
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate(`/w/${workspaceId}/p/new`)}
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              New Project
            </Button>
          </div>
        </div>

        {corruptState?.isCorrupt && (
          <div
            role="alert"
            className="mb-6 p-4 bg-surface-elevated border border-status-error/40 rounded-panel flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-status-error/15 text-status-error flex items-center justify-center shrink-0">
                <AlertCircle className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-text-primary">Corrupt project detected</p>
                <p className="text-xs text-text-secondary">
                  The project schema failed validation. You can download the raw JSON for inspection.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setCorruptState(null)}
              >
                Dismiss
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => downloadCorruptProjectJson(corruptState.rawData, 'corrupt-demo')}
              >
                <Download className="w-3.5 h-3.5 mr-1" />
                Download Raw JSON
              </Button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Panel className="p-5 flex flex-col justify-between hover:border-border-strong transition-colors duration-fast">
            <div>
              <div className="w-9 h-9 rounded-panel bg-accent/15 text-accent flex items-center justify-center mb-3">
                <Film className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-semibold text-text-primary">Demo Project</h2>
              <p className="text-xs text-text-secondary mt-1">
                Sample timeline with voiceover script and image assets.
              </p>
            </div>
            <div className="mt-6 pt-3 border-t border-border-subtle flex justify-end">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate(`/w/${workspaceId}/p/demo-1`)}
              >
                Open Timeline
              </Button>
            </div>
          </Panel>
        </div>
      </main>
    </div>
  );
};
