import React from 'react';
import { Project } from '../core/model/types';
import { ParseResult } from '../core/parser/types';
import { WorkflowStep } from './ProjectWorkflowPage';
import { EditorPage } from '../features/editor/EditorPage';
import { SettingsModal } from '../features/settings';
import { ExportErrorBoundary } from '../features/export';
import { SmartSyncErrorBoundary } from '../features/script-review';
import { useTimelineStore } from '../core/timeline';
import { buildSmartSyncSegments } from './workflowUtils';

const LazyExportModal = React.lazy(() =>
  import('../features/export').then((m) => ({ default: m.ExportModal }))
);

const LazySmartSyncModal = React.lazy(() =>
  import('../features/script-review').then((m) => ({ default: m.SmartSyncModal }))
);

export interface TimelineStepViewProps {
  project: Project;
  parseResult: ParseResult | null;
  audioBlob: Blob | null;
  settingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;
  exportOpen: boolean;
  setExportOpen: (open: boolean) => void;
  smartSyncOpen: boolean;
  setSmartSyncOpen: (open: boolean) => void;
  onNavigateStep: (step: WorkflowStep) => void;
}

export const TimelineStepView: React.FC<TimelineStepViewProps> = ({
  project,
  parseResult,
  audioBlob,
  settingsOpen,
  setSettingsOpen,
  exportOpen,
  setExportOpen,
  smartSyncOpen,
  setSmartSyncOpen,
  onNavigateStep,
}) => {
  const scriptSegments = project?.script?.parse?.segments || parseResult?.segments || [];
  const smartSyncSegments = buildSmartSyncSegments(project?.timeline.clips || [], scriptSegments);

  const handleApplyTimelineSync = (
    diffs: { clipId?: string; proposedDurationMs: number; status: string }[]
  ) => {
    const updates = diffs
      .filter((d) => d.status === 'accepted' && d.clipId)
      .map((d) => ({ clipId: d.clipId!, durationMs: d.proposedDurationMs }));
    useTimelineStore.getState().applySmartSyncDiff(updates);
  };

  return (
    <div className="flex flex-col h-full bg-canvas text-text-primary">
      <EditorPage
        onNavigateStep={onNavigateStep}
        onOpenSettings={() => setSettingsOpen(true)}
        onExport={() => setExportOpen(true)}
        onSmartSync={() => setSmartSyncOpen(true)}
      />
      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
      {exportOpen && (
        <ExportErrorBoundary onReset={() => setExportOpen(false)}>
          <React.Suspense fallback={null}>
            <LazyExportModal project={project} isOpen={exportOpen} onClose={() => setExportOpen(false)} />
          </React.Suspense>
        </ExportErrorBoundary>
      )}
      {smartSyncOpen && (
        <SmartSyncErrorBoundary onReset={() => setSmartSyncOpen(false)}>
          <React.Suspense fallback={null}>
            <LazySmartSyncModal
              isOpen={smartSyncOpen}
              onClose={() => setSmartSyncOpen(false)}
              segments={smartSyncSegments}
              audioBlobOrBuffer={audioBlob}
              onApplyAlignment={handleApplyTimelineSync}
            />
          </React.Suspense>
        </SmartSyncErrorBoundary>
      )}
    </div>
  );
};
