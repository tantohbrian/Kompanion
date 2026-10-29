import { resampleAudioBufferTo16k } from '../../core/audio';

export async function extract16kMono(
  audioBlobOrBuffer?: Blob | AudioBuffer | null
): Promise<Float32Array> {
  if (audioBlobOrBuffer instanceof AudioBuffer) {
    return resampleAudioBufferTo16k(audioBlobOrBuffer);
  }
  if (audioBlobOrBuffer instanceof Blob) {
    const arrayBuf = await audioBlobOrBuffer.arrayBuffer();
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const audioCtx = new AudioCtx();
    const decoded = await audioCtx.decodeAudioData(arrayBuf);
    const resampled = await resampleAudioBufferTo16k(decoded);
    await audioCtx.close().catch(() => {});
    return resampled;
  }
  return new Float32Array(16000);
}
