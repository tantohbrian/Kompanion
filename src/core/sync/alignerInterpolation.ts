/**
 * Boundary interpolation helper for Smart Sync alignment.
 * Linearly interpolates unset segment cut points with minimum duration constraints.
 * Pure TypeScript, zero DOM/React dependencies.
 */

import { RawSegmentInput } from './types';

export function interpolateCutPoints(
  cutPoints: number[],
  segments: RawSegmentInput[],
  minDur: number
): void {
  let lastAnchor = 0;
  while (lastAnchor < segments.length) {
    let nextAnchor = lastAnchor + 1;
    while (nextAnchor <= segments.length && cutPoints[nextAnchor] === -1) nextAnchor++;

    const startVal = cutPoints[lastAnchor]!;
    const endVal = cutPoints[nextAnchor]!;
    const steps = nextAnchor - lastAnchor;
    const subOrig = segments.slice(lastAnchor, nextAnchor).map((s) => s.endMs - s.startMs);
    const sumOrig = subOrig.reduce((a, b) => a + b, 0) || steps;

    let accum = startVal;
    for (let k = 1; k < steps; k++) {
      accum += Math.round((endVal - startVal) * ((subOrig[k - 1] ?? 1) / sumOrig));
      cutPoints[lastAnchor + k] = accum;
    }
    lastAnchor = nextAnchor;
  }

  for (let i = 0; i < segments.length; i++) {
    if (cutPoints[i + 1]! < cutPoints[i]! + minDur) {
      cutPoints[i + 1] = cutPoints[i]! + minDur;
    }
  }
}
