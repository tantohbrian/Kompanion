import React from 'react';
import { useTimelineStore } from '../../core/timeline';
import { ClipInspector } from './ClipInspector';
import { ProjectInspector } from './ProjectInspector';

export const Inspector: React.FC = () => {
  const project = useTimelineStore((s) => s.project);
  const selectedClipId = useTimelineStore((s) => s.selectedClipId);

  if (!project) return null;

  const clips = project.timeline.clips;
  const selectedIndex = selectedClipId ? clips.findIndex((c) => c.id === selectedClipId) : -1;
  const selectedClip = selectedIndex >= 0 ? clips[selectedIndex] : null;

  return (
    <aside className="w-80 border-l border-border bg-surface flex flex-col shrink-0 overflow-hidden">
      {selectedClip ? (
        <ClipInspector
          clip={selectedClip}
          index={selectedIndex}
          totalClips={clips.length}
        />
      ) : (
        <ProjectInspector />
      )}
    </aside>
  );
};
