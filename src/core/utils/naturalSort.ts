/**
 * Natural sorting utility for filenames and strings.
 * Handles patterns like "1.png, 2.png, 10.png" correctly instead of alphabetical "1, 10, 2".
 * Pure TypeScript, zero DOM/React dependencies.
 */

const collator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base',
});

/**
 * Compares two strings using natural sorting order.
 */
export function naturalCompare(a: string, b: string): number {
  return collator.compare(a, b);
}

/**
 * Sorts an array of items in place or returns a sorted copy using natural sort on a designated key.
 */
export function naturalSort<T>(items: T[], keyFn: (item: T) => string): T[] {
  return [...items].sort((a, b) => naturalCompare(keyFn(a), keyFn(b)));
}
