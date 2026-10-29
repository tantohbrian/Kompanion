import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../core/storage/db';
import { getMediaFile } from '../core/storage/opfs';
import { Project, Clip, AudioClip } from '../core/model/types';
import { CorruptProjectView } from './CorruptProjectView';
import { IngestView, IngestedImage, IngestedAudio } from '../features/ingest';
import { ScriptReviewView } from '../features/script-review';
import { SettingsModal } from '../features/settings';
import { ParseResult } from '../core/parser/types';
import { useTimelineStore } from '../core/timeline';
import { ProjectWorkflowHeader } from './ProjectWorkflowHeader';
import { ingestedToAssets } from './workflowUtils';
import { TimelineStepView } from './TimelineStepView';
import { useProjectWorkflowLoader } from './useProjectWorkflowLoader';

export type WorkflowStep = 'ingest' | 'review' | 'timeline' | 'export';

export const ProjectWorkflowPage: React.FC = () => {
  const { workspaceId = 'default', projectId = '' } = useParams<{
    workspaceId: string;
    projectId: string;
  }>();
  const navigate = useNavigate();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [smartSyncOpen, setSmartSyncOpen] = useState(false);

  const {
    project,
    setProject,
    corruptProjectRecord,
    isLoading,
    activeStep,
    setActiveStep,
    ingestedImages,
    setIngestedImages,
    ingestedAudio,
    setIngestedAudio,
    audioBlob,
    setAudioBlob,
    rawScript,
    setRawScript,
    parseResult,
    setParseResult,
    imagesRef,
    audioRef,
    scriptRef,
    parseRef,
    projectRef,
  } = useProjectWorkflowLoader(projectId);

  // Real-time IndexedDB persistence for Step 1
  const persistDrafts = async (
    imgs: IngestedImage[],
    aud: IngestedAudio[],
    scriptText: string,
    parsed: ParseResult | null
  ) => {
    const cur = projectRef.current;
    if (!cur) return;
    const assets = ingestedToAssets(imgs, aud);
    const updatedProj: Project = {
      ...cur,
      assets,
      script: { raw: scriptText, parse: parsed },
      updatedAt: Date.now(),
    };
    projectRef.current = updatedProj;
    setProject(updatedProj);
    await db.projects.put(updatedProj);
  };

  const handleImagesChange = (imgs: IngestedImage[]) => {
    imagesRef.current = imgs;
    setIngestedImages(imgs);
    void persistDrafts(imgs, audioRef.current, scriptRef.current, parseRef.current);
  };

  const handleAudioChange = async (aud: IngestedAudio[]) => {
    audioRef.current = aud;
    setIngestedAudio(aud);
    if (aud[0]?.file) {
      setAudioBlob(aud[0].file);
    } else if (aud[0]?.storageKey) {
      const b = await getMediaFile(aud[0].storageKey);
      if (b) setAudioBlob(b);
    }
    void persistDrafts(imagesRef.current, aud, scriptRef.current, parseRef.current);
  };

  const handleScriptChange = (raw: string, parse: ParseResult) => {
    scriptRef.current = raw;
    parseRef.current = parse;
    setRawScript(raw);
    setParseResult(parse);
    void persistDrafts(imagesRef.current, audioRef.current, raw, parse);
  };

  const handleProceedToReview = async (payload: {
    images: IngestedImage[];
    audio: IngestedAudio[];
    rawScript: string;
    parseResult: ParseResult;
  }) => {
    imagesRef.current = payload.images;
    audioRef.current = payload.audio;
    scriptRef.current = payload.rawScript;
    parseRef.current = payload.parseResult;
    setIngestedImages(payload.images);
    setIngestedAudio(payload.audio);
    setRawScript(payload.rawScript);
    setParseResult(payload.parseResult);
    await persistDrafts(payload.images, payload.audio, payload.rawScript, payload.parseResult);
    setActiveStep('review');
  };

  const handleAcceptTimeline = async (timeline: { clips: Clip[]; audio: AudioClip[] }) => {
    const cur = projectRef.current;
    if (!cur) return;
    const assets =
      imagesRef.current.length > 0
        ? ingestedToAssets(imagesRef.current, audioRef.current)
        : cur.assets.length > 0
        ? cur.assets
        : ingestedToAssets(imagesRef.current, audioRef.current);
    const updatedProj: Project = {
      ...cur,
      assets,
      timeline: { ...cur.timeline, clips: timeline.clips, audio: timeline.audio },
      updatedAt: Date.now(),
    };
    projectRef.current = updatedProj;
    setProject(updatedProj);
    await db.projects.put(updatedProj);
    useTimelineStore.getState().setProject(updatedProj);
    setActiveStep('timeline');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-canvas text-text-secondary text-xs">
        Loading project…
      </div>
    );
  }

  if (corruptProjectRecord) {
    return (
      <CorruptProjectView
        corruptRecord={corruptProjectRecord}
        projectId={projectId}
        onBack={() => navigate(`/w/${workspaceId}`)}
      />
    );
  }

  const totalAudioMs = ingestedAudio.reduce((sum, a) => sum + (a.durationMs || 0), 0);

  if (activeStep === 'timeline' && project) {
    return (
      <TimelineStepView
        project={project}
        parseResult={parseResult}
        audioBlob={audioBlob}
        settingsOpen={settingsOpen}
        setSettingsOpen={setSettingsOpen}
        exportOpen={exportOpen}
        setExportOpen={setExportOpen}
        smartSyncOpen={smartSyncOpen}
        setSmartSyncOpen={setSmartSyncOpen}
        onNavigateStep={setActiveStep}
      />
    );
  }

  return (
    <div className="flex flex-col h-full bg-canvas text-text-primary">
      <ProjectWorkflowHeader
        projectName={project?.name || projectId}
        activeStep={activeStep}
        onSelectStep={setActiveStep}
        onBack={() => navigate(`/w/${workspaceId}`)}
        onOpenSettings={() => setSettingsOpen(true)}
      />
      <main className="flex-1 overflow-y-auto">
        {activeStep === 'ingest' && (
          <IngestView
            projectId={projectId}
            initialImages={ingestedImages}
            initialAudio={ingestedAudio}
            initialRawScript={rawScript}
            initialParseResult={parseResult}
            onImagesChange={handleImagesChange}
            onAudioChange={handleAudioChange}
            onScriptChange={handleScriptChange}
            onProceedToReview={handleProceedToReview}
          />
        )}
        {activeStep === 'review' && parseResult && (
          <ScriptReviewView
            projectId={projectId}
            rawScript={rawScript}
            initialParseResult={parseResult}
            assets={
              project?.assets.map((a) => ({
                id: a.id,
                name: a.name,
                kind: a.kind,
                order: a.order,
                thumbnailUrl: (a.meta as { thumbnailDataUrl?: string })?.thumbnailDataUrl,
              })) || []
            }
            audioBlob={audioBlob}
            totalAudioMs={totalAudioMs}
            onBackToIngest={() => setActiveStep('ingest')}
            onAcceptTimeline={handleAcceptTimeline}
          />
        )}
      </main>
      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
};
