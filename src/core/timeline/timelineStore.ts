import { create } from 'zustand';
import { temporal } from 'zundo';
import { Project, Timeline, Clip, ProjectDefaults } from '../model/types';
import * as ops from './operations';
import { DEFAULT_PROJECT_DEFAULTS } from '../storage/storage';

export type AutosaveStatus = 'saved' | 'saving' | 'error';

export interface TimelineTrackedState {
  timeline: Timeline;
  settings: ProjectDefaults;
}

export interface TimelineState {
  project: Project;
  selectedClipId: string | null;
  playheadMs: number;
  isPlaying: boolean;
  zoom: number; // pixels per second (e.g. 50 to 400)
  snap: boolean;
  isDragging: boolean;
  autosaveStatus: AutosaveStatus;

  // Actions - Project Initialization & Selection
  setProject: (project: Project) => void;
  selectClip: (clipId: string | null) => void;
  setPlayheadMs: (ms: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setZoom: (zoom: number) => void;
  setSnap: (snap: boolean) => void;
  setAutosaveStatus: (status: AutosaveStatus) => void;

  // History & Drag Grouping
  startDrag: () => void;
  commitDrag: () => void;

  // Timeline Mutations (Pure Commands)
  reorderClip: (clipId: string, targetIndex: number) => void;
  trimClip: (clipId: string, deltaDurationMs: number, edge: 'start' | 'end') => void;
  splitClip: (clipId: string, splitMs: number) => void;
  deleteClip: (clipId: string) => void;
  duplicateClip: (clipId: string) => void;
  replaceAsset: (clipId: string, newAssetId: string) => void;
  setClipDuration: (clipId: string, durationMs: number) => void;
  updateClip: (clipId: string, updates: Partial<Omit<Clip, 'id' | 'assetId'>>) => void;
  applyToAllClips: (updates: Partial<Omit<Clip, 'id' | 'assetId' | 'durationMs' | 'sourceSegment'>>) => void;
  updateAudio: (gain?: number, muted?: boolean) => void;
  updateProjectSettings: (updates: Partial<ProjectDefaults>) => void;
}

const DEFAULT_PROJECT: Project = {
  id: 'empty',
  workspaceId: 'default',
  schemaVersion: 1,
  name: 'Untitled Project',
  settings: { ...DEFAULT_PROJECT_DEFAULTS },
  assets: [],
  script: { raw: '', parse: null },
  timeline: {
    clips: [],
    audio: [],
    gain: 1,
    muted: false,
  },
  updatedAt: Date.now(),
};

let dragSnapshot: Project | null = null;

export const useTimelineStore = create<TimelineState>()(
  temporal(
    (set, get) => ({
      project: DEFAULT_PROJECT,
      selectedClipId: null,
      playheadMs: 0,
      isPlaying: false,
      zoom: 120, // 120px per second default
      snap: true,
      isDragging: false,
      autosaveStatus: 'saved',

      setProject: (project) => {
        set({ project, playheadMs: 0 });
      },

      selectClip: (clipId) => {
        set({ selectedClipId: clipId });
      },

      setPlayheadMs: (ms) => {
        const totalDuration = get().project.timeline.clips.reduce(
          (sum, c) => sum + c.durationMs,
          0
        );
        const clamped = Math.max(0, Math.min(Math.round(ms), totalDuration));
        set({ playheadMs: clamped });
      },

      setIsPlaying: (isPlaying) => {
        set({ isPlaying });
      },

      setZoom: (zoom) => {
        const clamped = Math.max(30, Math.min(500, Math.round(zoom)));
        set({ zoom: clamped });
      },

      setSnap: (snap) => {
        set({ snap });
      },

      setAutosaveStatus: (autosaveStatus) => {
        set({ autosaveStatus });
      },

      startDrag: () => {
        dragSnapshot = get().project;
        useTimelineStore.temporal.getState().pause();
        set({ isDragging: true });
      },

      commitDrag: () => {
        const finalProject = get().project;
        if (dragSnapshot && JSON.stringify(dragSnapshot.timeline) !== JSON.stringify(finalProject.timeline)) {
          set({ project: dragSnapshot });
          useTimelineStore.temporal.getState().resume();
          set({ project: finalProject, autosaveStatus: 'saving' });
        } else {
          useTimelineStore.temporal.getState().resume();
        }
        dragSnapshot = null;
        set({ isDragging: false });
      },

      reorderClip: (clipId, targetIndex) => {
        const { project } = get();
        const updatedTimeline = ops.reorderClip(project.timeline, { clipId, targetIndex });
        if (updatedTimeline === project.timeline) return;

        set({
          project: { ...project, timeline: updatedTimeline, updatedAt: Date.now() },
          autosaveStatus: 'saving',
        });
      },

      trimClip: (clipId, deltaDurationMs, edge) => {
        const { project } = get();
        const updatedTimeline = ops.trimClip(project.timeline, {
          clipId,
          deltaDurationMs,
          edge,
        });
        if (updatedTimeline === project.timeline) return;

        set({
          project: { ...project, timeline: updatedTimeline, updatedAt: Date.now() },
          autosaveStatus: 'saving',
        });
      },

      splitClip: (clipId, splitMs) => {
        const { project } = get();
        const updatedTimeline = ops.splitClip(project.timeline, {
          clipId,
          splitMs,
          relativeTo: 'timeline',
        });
        if (updatedTimeline === project.timeline) return;

        set({
          project: { ...project, timeline: updatedTimeline, updatedAt: Date.now() },
          autosaveStatus: 'saving',
        });
      },

      deleteClip: (clipId) => {
        const { project, selectedClipId } = get();
        const updatedTimeline = ops.deleteClip(project.timeline, { clipId });
        if (updatedTimeline === project.timeline) return;

        set({
          project: { ...project, timeline: updatedTimeline, updatedAt: Date.now() },
          selectedClipId: selectedClipId === clipId ? null : selectedClipId,
          autosaveStatus: 'saving',
        });
      },

      duplicateClip: (clipId) => {
        const { project } = get();
        const updatedTimeline = ops.duplicateClip(project.timeline, { clipId });
        if (updatedTimeline === project.timeline) return;

        set({
          project: { ...project, timeline: updatedTimeline, updatedAt: Date.now() },
          autosaveStatus: 'saving',
        });
      },

      replaceAsset: (clipId, newAssetId) => {
        const { project } = get();
        const updatedTimeline = ops.replaceAsset(project.timeline, { clipId, newAssetId });
        if (updatedTimeline === project.timeline) return;

        set({
          project: { ...project, timeline: updatedTimeline, updatedAt: Date.now() },
          autosaveStatus: 'saving',
        });
      },

      setClipDuration: (clipId, durationMs) => {
        const { project } = get();
        const updatedTimeline = ops.setClipDuration(project.timeline, { clipId, durationMs });
        if (updatedTimeline === project.timeline) return;

        set({
          project: { ...project, timeline: updatedTimeline, updatedAt: Date.now() },
          autosaveStatus: 'saving',
        });
      },

      updateClip: (clipId, updates) => {
        const { project } = get();
        const updatedTimeline = ops.updateClip(project.timeline, { clipId, updates });
        if (updatedTimeline === project.timeline) return;

        set({
          project: { ...project, timeline: updatedTimeline, updatedAt: Date.now() },
          autosaveStatus: 'saving',
        });
      },

      applyToAllClips: (updates) => {
        const { project } = get();
        const updatedTimeline = ops.applyToAllClips(project.timeline, { updates });
        if (updatedTimeline === project.timeline) return;

        set({
          project: { ...project, timeline: updatedTimeline, updatedAt: Date.now() },
          autosaveStatus: 'saving',
        });
      },

      updateAudio: (gain, muted) => {
        const { project } = get();
        const updatedTimeline = ops.updateAudio(project.timeline, { gain, muted });
        if (updatedTimeline === project.timeline) return;

        set({
          project: { ...project, timeline: updatedTimeline, updatedAt: Date.now() },
          autosaveStatus: 'saving',
        });
      },

      updateProjectSettings: (updates) => {
        const { project } = get();
        set({
          project: {
            ...project,
            settings: { ...project.settings, ...updates },
            updatedAt: Date.now(),
          },
          autosaveStatus: 'saving',
        });
      },
    }),
    {
      limit: 200,
      partialize: (state) => ({
        project: state.project,
      }),
      equality: (pastState, currentState) =>
        JSON.stringify(pastState) === JSON.stringify(currentState),
    }
  )
);
