import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MasterAudioClock } from './audioClock';

describe('MasterAudioClock', () => {
  let clock: MasterAudioClock;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date', 'performance', 'setTimeout', 'clearTimeout'] });
    clock = new MasterAudioClock();
    clock.setMaxDuration(10000); // 10 seconds
  });

  afterEach(() => {
    clock.dispose();
    vi.useRealTimers();
  });

  it('starts at 0ms and reports not playing', () => {
    expect(clock.isPlaying()).toBe(false);
    expect(clock.getTimeMs()).toBe(0);
  });

  it('plays and advances time in integer milliseconds', async () => {
    await clock.play(0);
    expect(clock.isPlaying()).toBe(true);

    vi.advanceTimersByTime(1250);
    expect(clock.getTimeMs()).toBe(1250);

    const pausedAt = clock.pause();
    expect(pausedAt).toBe(1250);
    expect(clock.isPlaying()).toBe(false);

    // Advancing timers while paused should not advance clock
    vi.advanceTimersByTime(500);
    expect(clock.getTimeMs()).toBe(1250);
  });

  it('seeks accurately and clamps to maxDuration', () => {
    clock.seek(4500);
    expect(clock.getTimeMs()).toBe(4500);

    clock.seek(15000);
    expect(clock.getTimeMs()).toBe(10000); // clamped to maxDuration
  });

  it('calculates A/V drift accurately and enforces the < 40ms threshold', async () => {
    await clock.play(0);
    vi.advanceTimersByTime(2000); // Master audio clock is at 2000ms

    // Video frame at 2020ms (drift = +20ms, acceptable)
    expect(clock.calculateDrift(2020)).toBe(20);
    expect(clock.isDriftAcceptable(2020)).toBe(true);

    // Video frame at 1970ms (drift = -30ms, acceptable)
    expect(clock.calculateDrift(1970)).toBe(-30);
    expect(clock.isDriftAcceptable(1970)).toBe(true);

    // Video frame lagging at 1950ms (drift = -50ms, unacceptable -> frame drop needed)
    expect(clock.calculateDrift(1950)).toBe(-50);
    expect(clock.isDriftAcceptable(1950)).toBe(false);

    // Video frame ahead at 2050ms (drift = +50ms, unacceptable)
    expect(clock.calculateDrift(2050)).toBe(50);
    expect(clock.isDriftAcceptable(2050)).toBe(false);
  });
});
