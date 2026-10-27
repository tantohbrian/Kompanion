import { MasterAudioClock } from '../../core/audio';
import { resolveTimeline, renderFrame, previewImageCache, ResolvedScene } from '../../core/render';
import { useTimelineStore } from '../../core/timeline';
import { Project } from '../../core/model/types';
import { getMediaFile } from '../../core/storage/opfs';

export type TimeUpdateListener = (timeMs: number) => void;

class PlayerController {
  private clock = new MasterAudioClock();
  private canvas: HTMLCanvasElement | null = null;
  private animFrameId: number | null = null;
  private listeners = new Set<TimeUpdateListener>();

  private scene: ResolvedScene | null = null;
  private currentProject: Project | null = null;
  private audioLoaded = false;

  constructor() {
    // When store playhead changes from external source (e.g. click on ruler while paused)
    useTimelineStore.subscribe((state, prevState) => {
      if (state.playheadMs !== prevState.playheadMs && !this.clock.isPlaying()) {
        this.renderCurrentFrame(state.playheadMs);
        this.notifyListeners(state.playheadMs);
      }
      if (state.project !== this.currentProject) {
        this.currentProject = state.project;
        if (state.project) {
          this.scene = resolveTimeline(state.project);
          this.clock.setMaxDuration(this.scene.durationMs);
          this.loadAudioTrackIfNeeded(state.project);
        } else {
          this.scene = null;
        }
        if (!this.clock.isPlaying()) {
          this.renderCurrentFrame(useTimelineStore.getState().playheadMs);
        }
      }
    });
  }

  public attachCanvas(canvas: HTMLCanvasElement | null): void {
    this.canvas = canvas;
    if (this.canvas) {
      this.renderCurrentFrame(useTimelineStore.getState().playheadMs);
    }
  }

  public subscribeTime(listener: TimeUpdateListener): () => void {
    this.listeners.add(listener);
    // Notify immediately with current playhead
    listener(useTimelineStore.getState().playheadMs);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(tMs: number): void {
    for (const listener of this.listeners) {
      try {
        listener(tMs);
      } catch (err) {
        console.error('Time listener error:', err);
      }
    }
  }

  public isPlaying(): boolean {
    return this.clock.isPlaying();
  }

  public async play(): Promise<void> {
    if (this.clock.isPlaying()) return;

    const playheadMs = useTimelineStore.getState().playheadMs;
    const totalDurationMs = this.scene?.durationMs || 0;

    // If at end, loop to start
    const startMs = playheadMs >= totalDurationMs && totalDurationMs > 0 ? 0 : playheadMs;

    await this.clock.play(startMs);
    this.startPlaybackLoop();
  }

  public pause(): void {
    if (!this.clock.isPlaying()) return;

    const finalMs = this.clock.pause();
    this.stopPlaybackLoop();
    useTimelineStore.getState().setPlayheadMs(finalMs);
    this.notifyListeners(finalMs);
    this.renderCurrentFrame(finalMs);
  }

  public togglePlay(): void {
    if (this.clock.isPlaying()) {
      this.pause();
    } else {
      void this.play();
    }
  }

  public seek(toMs: number): void {
    const totalDurationMs = this.scene?.durationMs || 0;
    const clampedMs = Math.max(0, Math.min(totalDurationMs || Infinity, Math.round(toMs)));

    this.clock.seek(clampedMs);
    useTimelineStore.getState().setPlayheadMs(clampedMs);
    this.notifyListeners(clampedMs);
    this.renderCurrentFrame(clampedMs);
  }

  public stepFrame(deltaFrames: number, fps = 30): void {
    const currentMs = useTimelineStore.getState().playheadMs;
    const frameMs = Math.round(1000 / fps);
    this.seek(currentMs + deltaFrames * frameMs);
  }

  private startPlaybackLoop(): void {
    const tick = () => {
      if (!this.clock.isPlaying()) return;

      const currentMs = this.clock.getTimeMs();
      const totalDurationMs = this.scene?.durationMs || 0;

      if (totalDurationMs > 0 && currentMs >= totalDurationMs) {
        this.pause();
        this.seek(totalDurationMs);
        return;
      }

      this.renderCurrentFrame(currentMs);
      this.notifyListeners(currentMs);

      this.animFrameId = requestAnimationFrame(tick);
    };

    this.animFrameId = requestAnimationFrame(tick);
  }

  private stopPlaybackLoop(): void {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  public renderCurrentFrame(tMs: number): void {
    if (!this.canvas) return;

    if (!this.scene && this.currentProject) {
      this.scene = resolveTimeline(this.currentProject);
    }
    if (!this.scene) return;

    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;

    // Render single-path frame
    renderFrame(ctx, this.scene, tMs, previewImageCache);
  }

  private async loadAudioTrackIfNeeded(project: Project): Promise<void> {
    if (project.timeline.audio.length === 0) {
      this.clock.setAudioBuffer(null);
      this.audioLoaded = false;
      return;
    }

    const audioTrack = project.timeline.audio[0]!;
    const asset = project.assets.find((a) => a.id === audioTrack.assetId);
    if (!asset || this.audioLoaded) return;

    try {
      const blob = await getMediaFile(asset.storageKey);
      if (blob) {
        const arrayBuffer = await blob.arrayBuffer();
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          try {
            const decoded = await ctx.decodeAudioData(arrayBuffer);
            this.clock.setAudioBuffer(decoded);
            this.audioLoaded = true;
          } finally {
            void ctx.close();
          }
        }
      }
    } catch (err) {
      console.warn('Failed to decode project audio buffer for preview clock:', err);
    }
  }

  public getClock(): MasterAudioClock {
    return this.clock;
  }
}

export const playerController = new PlayerController();
