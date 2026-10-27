import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AlertTriangle, Download } from 'lucide-react';
import { Button } from '../ui';
import { db } from '../core/storage/db';
import { ensureDefaultWorkspace } from '../core/storage/storage';
import { Project, Clip, AudioClip } from '../core/model/types';
import { migrateAndValidateProject } from '../core/model/migrations';
import { downloadCorruptProjectJson } from '../features/projects/recovery';
import { IngestView, IngestedImage, IngestedAudio } from '../features/ingest';
import { ScriptReviewView } from '../features/script-review';
import { EditorPage } from '../features/editor/EditorPage';
import { SettingsModal } from '../features/settings';
import { ParseResult } from '../core/parser/types';
import { parseScript } from '../core/parser/registry';
import { ProjectWorkflowHeader } from './ProjectWorkflowHeader';

export type WorkflowStep = 'ingest' | 'review' | 'timeline' | 'export';

export const ProjectWorkflowPage: React.FC = () => {
  const { workspaceId = 'default', projectId = '' } = useParams<{
    workspaceId: string;
    projectId: string;
  }>();
  const navigate = useNavigate();

  const [project, setProject] = useState<Project | null>(null);
  const [corruptProjectRecord, setCorruptProjectRecord] = useState<unknown | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeStep, setActiveStep] = useState<WorkflowStep>('timeline');
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Ingest draft state
  const [ingestedImages, setIngestedImages] = useState<IngestedImage[]>([]);
  const [ingestedAudio, setIngestedAudio] = useState<IngestedAudio[]>([]);
  const [rawScript, setRawScript] = useState('');
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      try {
        let record = await db.projects.get(projectId);
        if (!record) {
          await ensureDefaultWorkspace();
          record = await db.projects.get(projectId);
        }
        if (!record) {
          setIsLoading(false);
          return;
        }

        const valid = migrateAndValidateProject(record);
        if (!valid.ok) {
          if (!cancelled) {
            setCorruptProjectRecord(record);
            setIsLoading(false);
          }
          return;
        }

        const proj = valid.data;
        if (!cancelled) {
          setProject(proj);
          // Determine initial step
          if (proj.timeline.clips.length === 0 && proj.assets.length === 0) {
            setActiveStep('ingest');
          } else {
            setActiveStep('timeline');
          }

          if (proj.script?.raw) {
            setRawScript(proj.script.raw);
            setParseResult(proj.script.parse || parseScript(proj.script.raw));
          }
          setIsLoading(false);
        }
      } catch {
        if (!cancelled) setIsLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-canvas text-text-secondary text-xs">
        Loading project…
      </div>
    );
  }

  if (corruptProjectRecord) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 bg-canvas text-text-primary text-center">
        <AlertTriangle className="w-12 h-12 text-warning mb-4" />
        <h2 className="text-lg font-bold mb-2">Corrupt Project Data Detected</h2>
        <p className="text-xs text-text-secondary max-w-md mb-6">
          This project record failed schema validation. You can export its raw JSON for inspection and manual recovery.
        </p>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate(`/w/${workspaceId}`)}
          >
            Back to Projects
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => downloadCorruptProjectJson(corruptProjectRecord, `corrupt-${projectId}.json`)}
          >
            <Download className="w-3.5 h-3.5 mr-1" />
            Download Raw JSON
          </Button>
        </div>
      </div>
    );
  }

  const handleProceedToReview = async (payload: {
    images: IngestedImage[];
    audio: IngestedAudio[];
    rawScript: string;
    parseResult: ParseResult;
  }) => {
    setIngestedImages(payload.images);
    setIngestedAudio(payload.audio);
    setRawScript(payload.rawScript);
    setParseResult(payload.parseResult);

    if (project) {
      // Map ingested images & audio to project assets
      const assets = [
        ...payload.images.map((img) => ({
          id: img.id,
          kind: 'image' as const,
          name: img.name,
          storageKey: img.storageKey,
          order: img.order,
          meta: { bytes: img.bytes, width: img.width, height: img.height },
        })),
        ...payload.audio.map((aud, i) => ({
          id: aud.id,
          kind: 'audio' as const,
          name: aud.name,
          storageKey: aud.storageKey,
          order: i + 1,
          meta: { bytes: aud.bytes, durationMs: aud.durationMs },
        })),
      ];

      const updatedProj: Project = {
        ...project,
        assets,
        script: {
          raw: payload.rawScript,
          parse: payload.parseResult,
        },
        updatedAt: Date.now(),
      };
      await db.projects.put(updatedProj);
      setProject(updatedProj);
    }

    setActiveStep('review');
  };

  const handleAcceptTimeline = async (timeline: { clips: Clip[]; audio: AudioClip[] }) => {
    if (!project) return;
    const updatedProj: Project = {
      ...project,
      timeline: {
        ...project.timeline,
        clips: timeline.clips,
        audio: timeline.audio,
      },
      updatedAt: Date.now(),
    };
    await db.projects.put(updatedProj);
    setProject(updatedProj);
    setActiveStep('timeline');
  };

  const totalAudioMs = ingestedAudio.reduce((sum, a) => sum + (a.durationMs || 0), 0);

  return (
    <div className="flex flex-col h-full bg-canvas text-text-primary">
      {/* Workflow Navigation Header */}
      <ProjectWorkflowHeader
        projectName={project?.name || projectId}
        activeStep={activeStep}
        onSelectStep={setActiveStep}
        onBack={() => navigate(`/w/${workspaceId}`)}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        {activeStep === 'ingest' && (
          <IngestView
            projectId={projectId}
            initialImages={ingestedImages}
            initialAudio={ingestedAudio}
            initialRawScript={rawScript}
            initialParseResult={parseResult}
            onProceedToReview={handleProceedToReview}
          />
        )}

        {activeStep === 'review' && parseResult && (
          <ScriptReviewView
            projectId={projectId}
            rawScript={rawScript}
            initialParseResult={parseResult}
            assets={ingestedImages.map((img) => ({
              id: img.id,
              name: img.name,
              kind: 'image' as const,
              thumbnailUrl: img.thumbnailUrl,
            }))}
            totalAudioMs={totalAudioMs}
            onBackToIngest={() => setActiveStep('ingest')}
            onAcceptTimeline={handleAcceptTimeline}
          />
        )}

        {activeStep === 'timeline' && (
          <EditorPage />
        )}
      </main>

      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
};
