import { useEffect, useRef, useCallback } from 'react';
import { useTimelineStore } from '../../core/timeline';
import { db } from '../../core/storage/db';
import { Project } from '../../core/model/types';

export function useAutosave(debounceMs = 500): {
  saveNow: () => Promise<void>;
} {
  const project = useTimelineStore((s) => s.project);
  const setAutosaveStatus = useTimelineStore((s) => s.setAutosaveStatus);

  const prevProjectRef = useRef<Project | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushSave = useCallback(
    async (projToSave: Project | null) => {
      if (!projToSave) return;
      setAutosaveStatus('saving');
      try {
        await db.projects.put({
          ...projToSave,
          updatedAt: Date.now(),
        });
        setAutosaveStatus('saved');
      } catch (err) {
        console.error('Autosave failed:', err);
        setAutosaveStatus('error');
      }
    },
    [setAutosaveStatus]
  );

  const saveNow = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const currentProj = useTimelineStore.getState().project;
    await flushSave(currentProj);
  }, [flushSave]);

  useEffect(() => {
    if (!project) return;

    // First mount initialization: mark as saved without triggering a db write
    if (!prevProjectRef.current) {
      prevProjectRef.current = project;
      setAutosaveStatus('saved');
      return;
    }

    // Only save if project actually changed
    if (prevProjectRef.current === project) {
      return;
    }

    prevProjectRef.current = project;
    setAutosaveStatus('saving');

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      void flushSave(project);
      timerRef.current = null;
    }, debounceMs);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [project, debounceMs, flushSave, setAutosaveStatus]);

  return { saveNow };
}
