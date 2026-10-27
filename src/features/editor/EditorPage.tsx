import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, SkipBack, ZoomIn, ZoomOut, Film, Settings } from 'lucide-react';
import { Button, IconButton, Panel } from '../../ui';

export const EditorPage: React.FC = () => {
  const { workspaceId = 'default', projectId = 'new' } = useParams<{
    workspaceId: string;
    projectId: string;
  }>();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-full bg-canvas text-text-primary select-none">
      {/* Top Navigation Bar */}
      <header className="h-12 border-b border-border bg-surface px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <IconButton
            aria-label="Back to projects"
            onClick={() => navigate(`/w/${workspaceId}`)}
          >
            <ArrowLeft className="w-4 h-4" />
          </IconButton>
          <span className="text-xs text-text-tertiary">/</span>
          <span className="text-xs font-semibold text-text-primary">{projectId}</span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {}}
            aria-label="Project settings"
          >
            <Settings className="w-3.5 h-3.5 mr-1" />
            Settings
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {}}
            aria-label="Export video"
          >
            <Film className="w-3.5 h-3.5 mr-1" />
            Export MP4
          </Button>
        </div>
      </header>

      {/* Main Workspace (Preview + Inspector) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Canvas Preview Area */}
        <div className="flex-1 bg-canvas-subtle flex flex-col items-center justify-center p-6 relative">
          <div className="aspect-video w-full max-w-3xl bg-black rounded-panel border border-border flex items-center justify-center shadow-2xl relative overflow-hidden">
            <span className="text-xs text-text-tertiary tracking-widest uppercase font-mono">
              1920 × 1080 (16:9) Canvas Preview
            </span>
          </div>

          {/* Transport / Playback bar */}
          <div className="mt-4 flex items-center gap-4 bg-surface px-4 py-1.5 rounded-control border border-border">
            <IconButton
              aria-label="Jump to start"
              size="sm"
            >
              <SkipBack className="w-3.5 h-3.5" />
            </IconButton>
            <IconButton
              aria-label="Play timeline"
              size="sm"
            >
              <Play className="w-4 h-4" />
            </IconButton>
            <span className="text-xs font-mono tabular-nums text-text-secondary">
              00:00:00 / 00:00:00
            </span>
          </div>
        </div>

        {/* Right Inspector Panel */}
        <aside className="w-72 border-l border-border bg-surface flex flex-col shrink-0">
          <div className="p-3 border-b border-border">
            <h2 className="text-xs font-semibold text-text-primary uppercase tracking-wider">
              Inspector
            </h2>
          </div>
          <div className="p-4 flex-1 text-xs text-text-secondary leading-relaxed">
            Select a timeline clip to adjust Ken Burns animations, transitions, or duration.
          </div>
        </aside>
      </div>

      {/* Bottom Timeline Area */}
      <footer className="h-56 border-t border-border bg-surface flex flex-col shrink-0">
        <div className="h-9 px-4 border-b border-border-subtle flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-text-secondary">Timeline</span>
          </div>
          <div className="flex items-center gap-1">
            <IconButton
              aria-label="Zoom out timeline"
              size="sm"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </IconButton>
            <IconButton
              aria-label="Zoom in timeline"
              size="sm"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </IconButton>
          </div>
        </div>

        {/* Tracks */}
        <div className="flex-1 p-3 flex flex-col gap-2 overflow-x-auto">
          {/* Video Track */}
          <Panel className="h-16 flex items-center px-4 bg-canvas border border-dashed border-border-subtle text-xs text-text-tertiary">
            Visual Track (Drag image assets or paste script to assemble)
          </Panel>
          {/* Audio Track */}
          <Panel className="h-14 flex items-center px-4 bg-canvas border border-dashed border-border-subtle text-xs text-text-tertiary">
            Audio Track (Voiceover MP3/WAV with waveform)
          </Panel>
        </div>
      </footer>
    </div>
  );
};
