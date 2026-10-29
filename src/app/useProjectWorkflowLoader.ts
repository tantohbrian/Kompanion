import { useEffect, useState, useRef } from 'react';
import { db } from '../core/storage/db';
import { ensureDefaultWorkspace } from '../core/storage/storage';
import { getMediaFile } from '../core/storage/opfs';
import { Project } from '../core/model/types';
import { migrateAndValidateProject } from '../core/model/migrations';
import { IngestedImage, IngestedAudio } from '../features/ingest';
import { ParseResult } from '../core/parser/types';
import { parseScript } from '../core/parser/registry';
import { useTimelineStore } from '../core/timeline';
import { assetsToIngested } from './workflowUtils';
import type { WorkflowStep } from './ProjectWorkflowPage';

export interface WorkflowLoaderResult {
  project: Project | null;
  setProject: React.Dispatch<React.SetStateAction<Project | null>>;
  corruptProjectRecord: unknown | null;
  isLoading: boolean;
  activeStep: WorkflowStep;
  setActiveStep: React.Dispatch<React.SetStateAction<WorkflowStep>>;
  ingestedImages: IngestedImage[];
  setIngestedImages: React.Dispatch<React.SetStateAction<IngestedImage[]>>;
  ingestedAudio: IngestedAudio[];
  setIngestedAudio: React.Dispatch<React.SetStateAction<IngestedAudio[]>>;
  audioBlob: Blob | null;
  setAudioBlob: React.Dispatch<React.SetStateAction<Blob | null>>;
  rawScript: string;
  setRawScript: React.Dispatch<React.SetStateAction<string>>;
  parseResult: ParseResult | null;
  setParseResult: React.Dispatch<React.SetStateAction<ParseResult | null>>;
  imagesRef: React.MutableRefObject<IngestedImage[]>;
  audioRef: React.MutableRefObject<IngestedAudio[]>;
  scriptRef: React.MutableRefObject<string>;
  parseRef: React.MutableRefObject<ParseResult | null>;
  projectRef: React.MutableRefObject<Project | null>;
}

export function useProjectWorkflowLoader(projectId: string): WorkflowLoaderResult {
  const [project, setProject] = useState<Project | null>(null);
  const [corruptProjectRecord, setCorruptProjectRecord] = useState<unknown | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeStep, setActiveStep] = useState<WorkflowStep>('timeline');

  const [ingestedImages, setIngestedImages] = useState<IngestedImage[]>([]);
  const [ingestedAudio, setIngestedAudio] = useState<IngestedAudio[]>([]);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [rawScript, setRawScript] = useState('');
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);

  const imagesRef = useRef(ingestedImages);
  imagesRef.current = ingestedImages;
  const audioRef = useRef(ingestedAudio);
  audioRef.current = ingestedAudio;
  const scriptRef = useRef(rawScript);
  scriptRef.current = rawScript;
  const parseRef = useRef(parseResult);
  parseRef.current = parseResult;
  const projectRef = useRef(project);
  projectRef.current = project;

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
          projectRef.current = proj;
          setProject(proj);
          useTimelineStore.getState().setProject(proj);

          // Restore assets and drafts
          if (proj.assets && proj.assets.length > 0) {
            const { images, audio } = assetsToIngested(proj.assets);
            imagesRef.current = images;
            audioRef.current = audio;
            setIngestedImages(images);
            setIngestedAudio(audio);
            const firstAud = proj.assets.find((a) => a.kind === 'audio');
            if (firstAud) {
              void getMediaFile(firstAud.storageKey).then((b) => {
                if (!cancelled && b) setAudioBlob(b);
              });
            }
          }

          if (proj.script?.raw) {
            scriptRef.current = proj.script.raw;
            setRawScript(proj.script.raw);
            const parsed = proj.script.parse || parseScript(proj.script.raw);
            parseRef.current = parsed;
            setParseResult(parsed);
          }

          if (proj.timeline.clips.length > 0) {
            setActiveStep('timeline');
          } else if (proj.script?.parse?.segments && proj.script.parse.segments.length > 0) {
            setActiveStep('review');
          } else {
            setActiveStep('ingest');
          }
          setIsLoading(false);
        }
      } catch {
        if (!cancelled) setIsLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  return {
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
  };
}
