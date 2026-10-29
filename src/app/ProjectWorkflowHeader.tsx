import React from 'react';
import { ArrowLeft, Settings, Film } from 'lucide-react';
import { IconButton } from '../ui';
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
    <header className="h-12 bg-[#0d0d10]/95 backdrop-blur-md border-b border-white/[0.08] px-3 flex items-center justify-between shrink-0 select-none">
      {/* Left: Brand + Breadcrumb + Status */}
      <div className="flex items-center gap-2.5">
        <div className="w-6 h-6 rounded-md bg-accent/15 border border-accent/30 flex items-center justify-center text-accent shrink-0">
          <Film className="w-3.5 h-3.5" />
        </div>
        <IconButton
          aria-label="Back to projects"
          size="sm"
          onClick={onBack}
          className="hover:bg-white/[0.06] text-text-secondary hover:text-text-primary rounded-md p-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
        </IconButton>
        <span className="text-white/20 text-xs font-light">/</span>
        <span className="font-semibold text-[13px] text-text-primary tracking-tight truncate max-w-[180px]">
          {projectName}
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-text-secondary bg-white/[0.04] border border-white/[0.06] px-2 py-0.5 rounded-full ml-1">
          <span className="w-1.5 h-1.5 rounded-full bg-success shadow-[0_0_6px_rgba(48,209,88,0.6)]" />
          <span>Saved</span>
        </span>
      </div>

      {/* Center: Sunken Segmented Pill Stepper */}
      <nav aria-label="Workflow Steps" className="bg-[#141418] p-0.5 rounded-lg border border-white/[0.07] flex items-center gap-0.5 shadow-inner">
        <button
          type="button"
          onClick={() => onSelectStep('ingest')}
          className={`text-xs px-3 py-1 rounded-md transition-all ${
            activeStep === 'ingest'
              ? 'bg-accent text-white shadow-sm font-semibold'
              : 'text-text-secondary hover:text-text-primary font-medium'
          }`}
        >
          1. Ingest
        </button>
        <button
          type="button"
          onClick={() => onSelectStep('review')}
          className={`text-xs px-3 py-1 rounded-md transition-all ${
            activeStep === 'review'
              ? 'bg-accent text-white shadow-sm font-semibold'
              : 'text-text-secondary hover:text-text-primary font-medium'
          }`}
        >
          2. Script Review
        </button>
        <button
          type="button"
          onClick={() => onSelectStep('timeline')}
          className={`text-xs px-3 py-1 rounded-md transition-all ${
            activeStep === 'timeline'
              ? 'bg-accent text-white shadow-sm font-semibold'
              : 'text-text-secondary hover:text-text-primary font-medium'
          }`}
        >
          3. Timeline
        </button>
      </nav>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenSettings}
          aria-label="Open application settings"
          title="Settings"
          className="bg-white/[0.04] hover:bg-white/[0.08] text-text-secondary hover:text-text-primary border border-white/[0.06] text-xs font-medium px-2.5 py-1.5 rounded-md flex items-center gap-1.5 transition-all"
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Settings</span>
        </button>
      </div>
    </header>
  );
};
