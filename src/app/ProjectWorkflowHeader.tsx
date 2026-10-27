import React from 'react';
import { ArrowLeft, Settings, Film } from 'lucide-react';
import { Button, IconButton } from '../ui';
import { WorkflowStep } from './ProjectWorkflowPage';

interface ProjectWorkflowHeaderProps {
  projectName: string;
  activeStep: WorkflowStep;
  onSelectStep: (step: WorkflowStep) => void;
  onBack: () => void;
  onOpenSettings: () => void;
}

export const ProjectWorkflowHeader: React.FC<ProjectWorkflowHeaderProps> = ({
  projectName,
  activeStep,
  onSelectStep,
  onBack,
  onOpenSettings,
}) => {
  return (
    <header className="h-12 border-b border-border bg-surface px-4 flex items-center justify-between shrink-0 select-none">
      <div className="flex items-center gap-3">
        <IconButton aria-label="Back to projects" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </IconButton>
        <span className="text-xs text-text-tertiary">/</span>
        <span className="text-xs font-semibold text-text-primary truncate max-w-[160px]">
          {projectName}
        </span>
      </div>

      {/* Step Tabs / Stepper */}
      <nav aria-label="Workflow Steps" className="flex items-center gap-1 bg-surface-elevated p-1 rounded-control border border-border">
        <button
          type="button"
          onClick={() => onSelectStep('ingest')}
          className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
            activeStep === 'ingest'
              ? 'bg-accent text-white font-semibold'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          1. Ingest
        </button>
        <button
          type="button"
          onClick={() => onSelectStep('review')}
          className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
            activeStep === 'review'
              ? 'bg-accent text-white font-semibold'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          2. Script Review
        </button>
        <button
          type="button"
          onClick={() => onSelectStep('timeline')}
          className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
            activeStep === 'timeline'
              ? 'bg-accent text-white font-semibold'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          3. Timeline
        </button>
      </nav>

      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={onOpenSettings}
          aria-label="Application settings"
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
  );
};
