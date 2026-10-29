/**
 * Groq Whisper Large-v3-Turbo Cloud Transcription Client.
 * High-speed word-level timestamping (sub-second acoustic transcriptions).
 * Pure TypeScript, zero DOM/React dependencies.
 */

import { WhisperWord } from './types';
import { encodeMono16kWav } from './wavEncoder';

export interface GroqWhisperOptions {
  apiKey: string;
  audioSamples: Float32Array;
  sampleRate?: number;
  language?: string;
  prompt?: string;
}

interface GroqWordRaw {
  word: string;
  start: number;
  end: number;
}

interface GroqVerboseResponse {
  text: string;
  words?: GroqWordRaw[];
  segments?: Array<{
    id: number;
    start: number;
    end: number;
    text: string;
    words?: GroqWordRaw[];
  }>;
}

export async function transcribeWithGroq(options: GroqWhisperOptions): Promise<{
  words: WhisperWord[];
  text: string;
}> {
  const { apiKey, audioSamples, sampleRate = 16000, language, prompt } = options;

  if (!apiKey || !apiKey.trim()) {
    throw new Error('Groq API key is required. Please provide a key in Sync Settings or switch to Gemini.');
  }

  const wavBlob = encodeMono16kWav(audioSamples, sampleRate);
  const formData = new FormData();
  formData.append('file', wavBlob, 'audio.wav');
  formData.append('model', 'whisper-large-v3-turbo');
  formData.append('response_format', 'verbose_json');
  formData.append('timestamp_granularities[]', 'word');

  if (language) formData.append('language', language);
  if (prompt) formData.append('prompt', prompt);

  const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey.trim()}`,
    },
    body: formData,
  });

  if (!res.ok) {
    const errText = await res.text();
    let msg = `Groq Whisper API returned error ${res.status}: ${res.statusText}`;
    try {
      const parsed = JSON.parse(errText);
      if (parsed.error?.message) {
        msg = `Groq API error (${res.status}): ${parsed.error.message}`;
      }
    } catch {
      // Keep errText
    }
    if (res.status === 401 || res.status === 403) {
      msg += ' - Check your API key at console.groq.com or switch to Gemini in Sync Settings.';
    }
    throw new Error(msg);
  }

  const data = (await res.json()) as GroqVerboseResponse;

  // Collect word timestamps from words array or fallback to segments
  const rawWords: GroqWordRaw[] = [];
  if (Array.isArray(data.words) && data.words.length > 0) {
    rawWords.push(...data.words);
  } else if (Array.isArray(data.segments)) {
    for (const seg of data.segments) {
      if (Array.isArray(seg.words)) {
        rawWords.push(...seg.words);
      }
    }
  }

  const words: WhisperWord[] = rawWords.map((w) => ({
    word: w.word,
    startSec: w.start,
    endSec: w.end,
  }));

  return {
    words,
    text: data.text || '',
  };
}
