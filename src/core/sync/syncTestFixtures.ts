import { WhisperWord } from './types';

export const groundTruthWords: WhisperWord[] = [
  { word: 'You', startSec: 0.4, endSec: 0.6 },
  { word: 'are', startSec: 0.65, endSec: 0.8 },
  { word: 'halfway', startSec: 0.85, endSec: 1.3 },
  { word: 'through', startSec: 1.35, endSec: 1.6 },
  { word: 'doing', startSec: 1.65, endSec: 1.95 },
  { word: 'something', startSec: 2.0, endSec: 2.4 },
  { word: 'you', startSec: 2.5, endSec: 2.7 },
  { word: 'have', startSec: 2.75, endSec: 2.95 },
  { word: 'done', startSec: 3.0, endSec: 3.3 },
  { word: 'a', startSec: 3.35, endSec: 3.5 },
  { word: 'hundred', startSec: 3.55, endSec: 3.9 },
  { word: 'times', startSec: 3.95, endSec: 4.2 },

  { word: 'Maybe', startSec: 4.8, endSec: 5.1 },
  { word: 'you', startSec: 5.15, endSec: 5.3 },
  { word: 'are', startSec: 5.35, endSec: 5.5 },
  { word: 'shooting', startSec: 5.55, endSec: 6.0 },
  { word: 'a', startSec: 6.05, endSec: 6.2 },
  { word: 'basketball', startSec: 6.25, endSec: 7.1 },

  { word: 'And', startSec: 7.6, endSec: 7.8 },
  { word: 'suddenly', startSec: 7.85, endSec: 8.4 },
  { word: 'you', startSec: 8.45, endSec: 8.65 },
  { word: 'start', startSec: 8.7, endSec: 9.0 },
  { word: 'thinking', startSec: 9.05, endSec: 9.5 },
  { word: 'about', startSec: 9.55, endSec: 9.85 },
  { word: 'your', startSec: 9.9, endSec: 10.1 },
  { word: 'elbow', startSec: 10.15, endSec: 10.7 },
  { word: 'angle', startSec: 10.75, endSec: 11.5 },
];

export const cumulativeDriftWords: WhisperWord[] = [
  // Beat 1
  { word: 'In', startSec: 1.0, endSec: 1.2 },
  { word: 'the', startSec: 1.25, endSec: 1.4 },
  { word: 'ancient', startSec: 1.45, endSec: 1.9 },
  { word: 'redwood', startSec: 1.95, endSec: 2.4 },
  { word: 'forest', startSec: 2.45, endSec: 2.9 },
  { word: 'secrets', startSec: 3.1, endSec: 3.6 },
  { word: 'linger', startSec: 3.7, endSec: 4.5 },

  // Beat 2: starts around 12.0s (~7s drift)
  { word: 'Sunlight', startSec: 12.0, endSec: 12.5 },
  { word: 'filters', startSec: 12.55, endSec: 13.0 },
  { word: 'through', startSec: 13.05, endSec: 13.4 },
  { word: 'towering', startSec: 13.45, endSec: 14.0 },
  { word: 'canopies', startSec: 14.05, endSec: 15.0 },

  // Beat 3: starts around 23.0s (~13s cumulative drift)
  { word: 'A', startSec: 23.0, endSec: 23.2 },
  { word: 'silent', startSec: 23.25, endSec: 23.7 },
  { word: 'traveler', startSec: 23.75, endSec: 24.3 },
  { word: 'steps', startSec: 24.35, endSec: 24.7 },
  { word: 'forward', startSec: 24.75, endSec: 25.2 },
  { word: 'into', startSec: 25.25, endSec: 25.5 },
  { word: 'the', startSec: 25.55, endSec: 25.7 },
  { word: 'misty', startSec: 25.75, endSec: 26.2 },
  { word: 'trail', startSec: 26.25, endSec: 27.0 },

  // Beat 4: starts around 45.0s (~30s cumulative drift)
  { word: 'The', startSec: 45.0, endSec: 45.2 },
  { word: 'journey', startSec: 45.25, endSec: 45.7 },
  { word: 'to', startSec: 45.75, endSec: 45.9 },
  { word: 'the', startSec: 45.95, endSec: 46.1 },
  { word: 'lost', startSec: 46.15, endSec: 46.6 },
  { word: 'sanctuary', startSec: 46.65, endSec: 47.4 },
  { word: 'begins', startSec: 47.45, endSec: 48.0 },
  { word: 'now', startSec: 48.05, endSec: 49.0 },
];
