/**
 * Master Audio Clock for preview playback synchronization.
 * Audio is the master clock: video frames drop if needed to maintain sync.
 * Drift target: < 40 ms.
 * Pure TypeScript, zero React/DOM imports beyond Web Audio API.
 */

export interface AudioClockListener {
  (timeMs: number): void;
}

export class MasterAudioClock {
  private audioCtx: AudioContext | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;
  private gainNode: GainNode | null = null;

  private isRunning = false;
  private startTimelineMs = 0; // The timeline position (ms) when playback started
  private audioContextStartTime = 0; // The AudioContext.currentTime (sec) when source started
  private syntheticStartTime = 0; // performance.now() fallback when no audio buffer

  private gain = 1.0;
  private muted = false;
  private maxDurationMs = 0;

  constructor() {
    this.initAudioContext();
  }

  private initAudioContext(): void {
    if (typeof window === 'undefined') return;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioCtx) {
      try {
        this.audioCtx = new AudioCtx();
        this.gainNode = this.audioCtx.createGain();
        this.gainNode.connect(this.audioCtx.destination);
      } catch {
        this.audioCtx = null;
      }
    }
  }

  public setAudioBuffer(buffer: AudioBuffer | null, durationMs?: number): void {
    this.audioBuffer = buffer;
    if (buffer) {
      this.maxDurationMs = Math.round(buffer.duration * 1000);
    } else if (durationMs !== undefined) {
      this.maxDurationMs = durationMs;
    }
  }

  public setMaxDuration(durationMs: number): void {
    this.maxDurationMs = durationMs;
  }

  public async play(fromMs: number): Promise<void> {
    if (this.isRunning) return;

    // Resume AudioContext if suspended (browser autoplay policy)
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      try {
        await this.audioCtx.resume();
      } catch {
        // Ignore autoplay error
      }
    }

    this.startTimelineMs = Math.max(0, Math.round(fromMs));

    if (this.audioCtx && this.audioBuffer && this.gainNode) {
      try {
        // Disconnect existing source if any
        if (this.sourceNode) {
          try {
            this.sourceNode.stop();
            this.sourceNode.disconnect();
          } catch {
            // Ignore
          }
        }

        const source = this.audioCtx.createBufferSource();
        source.buffer = this.audioBuffer;

        // Apply gain & mute
        this.updateGainNode();
        source.connect(this.gainNode);

        const offsetSec = this.startTimelineMs / 1000;
        this.audioContextStartTime = this.audioCtx.currentTime;
        source.start(0, offsetSec);
        this.sourceNode = source;
      } catch (err) {
        console.warn('Failed to start AudioBufferSourceNode, using synthetic clock:', err);
      }
    }

    this.syntheticStartTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
    this.isRunning = true;
  }

  public pause(): number {
    if (!this.isRunning) return this.getTimeMs();

    const currentMs = this.getTimeMs();

    if (this.sourceNode) {
      try {
        this.sourceNode.stop();
        this.sourceNode.disconnect();
      } catch {
        // Ignore
      }
      this.sourceNode = null;
    }

    this.isRunning = false;
    this.startTimelineMs = currentMs;
    return currentMs;
  }

  public seek(toMs: number): void {
    const wasPlaying = this.isRunning;
    if (wasPlaying) {
      this.pause();
    }
    const clampedMs = this.maxDurationMs > 0
      ? Math.max(0, Math.min(this.maxDurationMs, Math.round(toMs)))
      : Math.max(0, Math.round(toMs));
    this.startTimelineMs = clampedMs;
    if (wasPlaying) {
      void this.play(this.startTimelineMs);
    }
  }

  public getTimeMs(): number {
    if (!this.isRunning) {
      return this.startTimelineMs;
    }

    let elapsedMs = 0;
    if (this.audioCtx && this.sourceNode) {
      const audioElapsedSec = this.audioCtx.currentTime - this.audioContextStartTime;
      elapsedMs = Math.round(audioElapsedSec * 1000);
    } else {
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const perfElapsedMs = now - this.syntheticStartTime;
      elapsedMs = Math.round(perfElapsedMs);
    }

    const totalMs = this.startTimelineMs + elapsedMs;
    if (this.maxDurationMs > 0 && totalMs >= this.maxDurationMs) {
      return this.maxDurationMs;
    }
    return totalMs;
  }

  public isPlaying(): boolean {
    return this.isRunning;
  }

  public setGain(gain: number): void {
    this.gain = Math.max(0, Math.min(2.0, gain));
    this.updateGainNode();
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    this.updateGainNode();
  }

  private updateGainNode(): void {
    if (this.gainNode && this.audioCtx) {
      const effectiveGain = this.muted ? 0 : this.gain;
      this.gainNode.gain.setValueAtTime(effectiveGain, this.audioCtx.currentTime);
    }
  }

  /**
   * Calculates drift between the video display frame and the master audio clock.
   * Drift = videoFrameTimeMs - masterClockMs.
   * Positive drift: video is ahead of audio.
   * Negative drift: video is lagging behind audio (drop video frames!).
   */
  public calculateDrift(videoFrameTimeMs: number): number {
    return Math.round(videoFrameTimeMs - this.getTimeMs());
  }

  /**
   * Returns whether video is within the acceptable A/V drift tolerance (< 40 ms).
   */
  public isDriftAcceptable(videoFrameTimeMs: number, maxDriftMs = 40): boolean {
    return Math.abs(this.calculateDrift(videoFrameTimeMs)) <= maxDriftMs;
  }

  public dispose(): void {
    this.pause();
    if (this.audioCtx) {
      try {
        void this.audioCtx.close();
      } catch {
        // Ignore
      }
      this.audioCtx = null;
    }
  }
}
