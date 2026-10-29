/**
 * Gemini 2.5 Flash Native Audio + Script Alignment Client.
 * Direct cloud alignment using multimodal audio comprehension.
 * Pure TypeScript, zero DOM/React dependencies.
 */

import { AlignedSegmentDiff, AlignmentResult, RawSegmentInput } from './types';
import { samplesToBase64Wav } from './wavEncoder';

export interface GeminiSyncOptions {
  apiKey: string;
  model?: 'gemini-2.5-flash' | 'gemini-2.0-flash' | 'gemini-3.8-flash' | 'gemini-3.5-flash';
  audioSamples: Float32Array;
  sampleRate?: number;
  segments: RawSegmentInput[];
  totalAudioDurationMs: number;
}

interface GeminiSegmentResponse {
  index: number;
  startMs: number;
  endMs: number;
}

async function callGeminiApi(
  url: string,
  headers: Record<string, string>,
  body: unknown
): Promise<Response> {
  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

export async function alignWithGemini(options: GeminiSyncOptions): Promise<AlignmentResult> {
  const {
    apiKey,
    model = 'gemini-2.5-flash',
    audioSamples,
    sampleRate = 16000,
    segments,
    totalAudioDurationMs,
  } = options;

  if (!apiKey || !apiKey.trim()) {
    throw new Error('Gemini API key is required. Please provide a key in Sync Settings.');
  }

  // Convert audio samples to base64 WAV
  const base64Audio = await samplesToBase64Wav(audioSamples, sampleRate);

  const beatsPayload = segments.map((s) => ({
    index: s.index,
    narrationText: s.narrationText || s.promptText || '',
  }));

  const systemInstruction = `You are an expert audio-to-script alignment engineer.
You are given a single spoken voiceover audio file and a sequence of numbered script beats with their narration text.
Your task: listen to the audio carefully and identify the exact timestamp interval [startMs, endMs] (in integer milliseconds from 0 to ${Math.round(
    totalAudioDurationMs
  )}) where each numbered beat's narration is spoken.
Requirements:
1. Every numbered beat in the input MUST be present in the output array in ascending order.
2. The sequence of beats must be chronological: beat[i].startMs >= beat[i-1].startMs.
3. Beat 1 must begin at or near 0 ms.
4. Account for pauses, pacing variations, and spoken numbers accurately.
5. Return JSON matching the schema strictly.`;

  const requestBody = {
    contents: [
      {
        parts: [
          {
            text: `Please align the following ${segments.length} script beats against the attached audio:\n${JSON.stringify(
              beatsPayload
            )}`,
          },
          {
            inlineData: {
              mimeType: 'audio/wav',
              data: base64Audio,
            },
          },
        ],
      },
    ],
    systemInstruction: {
      parts: [{ text: systemInstruction }],
    },
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          segments: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                index: { type: 'INTEGER' },
                startMs: { type: 'INTEGER' },
                endMs: { type: 'INTEGER' },
              },
              required: ['index', 'startMs', 'endMs'],
            },
          },
        },
        required: ['segments'],
      },
    },
  };

  // 1. Try ?key= first for standard AIza... and AQ... keys.
  // ya29. tokens require OAuth Bearer token authorization upfront.
  const isBearerOnly = apiKey.startsWith('ya29.');
  const primaryUrl = isBearerOnly
    ? `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`
    : `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(
        apiKey
      )}`;

  const primaryHeaders: Record<string, string> = isBearerOnly
    ? { Authorization: `Bearer ${apiKey}` }
    : { 'x-goog-api-key': apiKey };

  let res = await callGeminiApi(primaryUrl, primaryHeaders, requestBody);

  // If primary URL failed with 401/403 and wasn't bearer, try Bearer fallback
  if (!res.ok && !isBearerOnly && (res.status === 401 || res.status === 403)) {
    const bearerUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    const bearerRes = await callGeminiApi(
      bearerUrl,
      { Authorization: `Bearer ${apiKey}` },
      requestBody
    );
    if (bearerRes.ok) {
      res = bearerRes;
    }
  }

  // Model fallback: if model returned 404 (e.g. gemini-2.5-flash deprecated/unavailable),
  // progressively fall forward to gemini-3.8-flash -> gemini-3.5-flash -> gemini-2.0-flash
  if (!res.ok && res.status === 404) {
    if (model === 'gemini-2.5-flash') {
      return alignWithGemini({ ...options, model: 'gemini-3.8-flash' });
    }
    if (model === 'gemini-3.8-flash') {
      return alignWithGemini({ ...options, model: 'gemini-3.5-flash' });
    }
    if (model !== 'gemini-2.0-flash' && model !== 'gemini-3.5-flash') {
      return alignWithGemini({ ...options, model: 'gemini-2.0-flash' });
    }
  }

  if (!res.ok) {
    const errText = await res.text();
    let msg = `Gemini API returned error ${res.status}: ${res.statusText}`;
    try {
      const parsed = JSON.parse(errText);
      if (parsed.error?.message) {
        msg = `Gemini API error (${res.status}): ${parsed.error.message}`;
      }
    } catch {
      // Keep errText
    }
    if (res.status === 401 || res.status === 403) {
      msg +=
        ' - Check your API key at aistudio.google.com/app/apikey or switch to Groq or Local Whisper in Sync Settings.';
    }
    throw new Error(msg);
  }

  const json = await res.json();
  const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) {
    throw new Error('Gemini response did not contain candidates or text.');
  }

  const parsedData = JSON.parse(rawText) as { segments: GeminiSegmentResponse[] };
  const rawReturned = parsedData.segments || [];

  return buildGeminiAlignmentResult(segments, rawReturned, totalAudioDurationMs);
}

function buildGeminiAlignmentResult(
  segments: RawSegmentInput[],
  geminiSegments: GeminiSegmentResponse[],
  totalAudioDurationMs: number
): AlignmentResult {
  const geminiMap = new Map(geminiSegments.map((g) => [g.index, g]));

  let currentStart = 0;
  const sanitizedProposals = segments.map((seg, idx) => {
    const g = geminiMap.get(seg.index);
    let dur = g ? Math.max(500, g.endMs - g.startMs) : seg.endMs - seg.startMs;

    // If last segment and total duration exists, stretch or cap to end
    if (idx === segments.length - 1 && totalAudioDurationMs > 0) {
      dur = Math.max(500, totalAudioDurationMs - currentStart);
    }

    const proposedStart = currentStart;
    const proposedEnd = proposedStart + dur;
    currentStart = proposedEnd;

    return {
      index: seg.index,
      clipId: seg.clipId,
      proposedStartMs: proposedStart,
      proposedEndMs: proposedEnd,
      proposedDurationMs: dur,
      confidence: g ? 0.95 : 0.5,
    };
  });

  let totalDriftMs = 0;
  const diffs: AlignedSegmentDiff[] = segments.map((seg, idx) => {
    const prop = sanitizedProposals[idx]!;
    const originalDurationMs = seg.endMs - seg.startMs;
    const deltaMs = prop.proposedDurationMs - originalDurationMs;
    totalDriftMs += Math.abs(deltaMs);

    return {
      index: seg.index,
      clipId: seg.clipId,
      narrationText: seg.narrationText || seg.promptText || '',
      promptText: seg.promptText,
      originalStartMs: seg.startMs,
      originalEndMs: seg.endMs,
      originalDurationMs,
      proposedStartMs: prop.proposedStartMs,
      proposedEndMs: prop.proposedEndMs,
      proposedDurationMs: prop.proposedDurationMs,
      deltaMs,
      confidence: prop.confidence,
      status: 'accepted',
    };
  });

  return {
    hasNarration: segments.some((s) => !!(s.narrationText && s.narrationText.trim())),
    diffs,
    diagnostics: [],
    totalDriftMs,
  };
}
