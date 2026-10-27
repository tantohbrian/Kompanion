import { describe, it, expect } from 'vitest';
import { naturalCompare, naturalSort } from './naturalSort';

describe('Natural Sort', () => {
  it('sorts numbers naturally (1, 2, 10 instead of 1, 10, 2)', () => {
    const filenames = [
      'image 10.png',
      'image 1.png',
      'image 2.png',
      'image 20.png',
      'image 3.png',
      'image 100.png',
    ];

    const sorted = naturalSort(filenames, (f) => f);
    expect(sorted).toEqual([
      'image 1.png',
      'image 2.png',
      'image 3.png',
      'image 10.png',
      'image 20.png',
      'image 100.png',
    ]);
  });

  it('correctly compares strings with naturalCompare', () => {
    expect(naturalCompare('file2.jpg', 'file10.jpg')).toBeLessThan(0);
    expect(naturalCompare('file10.jpg', 'file2.jpg')).toBeGreaterThan(0);
    expect(naturalCompare('file1.jpg', 'file1.jpg')).toBe(0);
  });
});
