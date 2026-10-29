/**
 * Text and Number Normalization for Audio-to-Script Alignment.
 * Normalizes spoken numbers ("eleven forty-seven" -> "11 47", "twenty twenty" -> "2020"),
 * expands contractions, strips punctuation, and supports fuzzy token matching.
 * Pure TypeScript, zero DOM/React dependencies.
 */

const NUMBER_WORDS: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
  hundred: 100,
  thousand: 1000,
  million: 1000000,
};

/**
 * Normalizes a word token by stripping punctuation, emojis, and lowercase.
 */
export function normalizeToken(token: string): string {
  if (!token) return '';
  return token
    .toLowerCase()
    .replace(/[’']/g, '') // remove apostrophes: you're -> youre, it's -> its
    .replace(/[^\w\d]/g, '') // strip all other punctuation
    .trim();
}

/**
 * Replaces spoken number phrases with standard numeric digits where possible.
 * E.g., "eleven forty-seven" -> "11 47", "twenty twenty" -> "2020", "one hundred and ten" -> "110"
 */
export function normalizeSpokenNumbers(text: string): string {
  if (!text) return '';

  // First convert colons in times (11:47 -> 11 47) and dashes (forty-seven -> forty seven)
  let result = text.replace(/(\d+):(\d+)/g, '$1 $2').replace(/-/g, ' ');

  // Hundreds (e.g. "one hundred and ten" -> "110", "one hundred" -> "100")
  result = result.replace(
    /\b(one|two|three|four|five|six|seven|eight|nine)\s+hundred(?:\s+and)?(?:\s+(twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety))?(?:\s+(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen))?\b/gi,
    (_, hStr, tensStr, onesStr) => {
      const hVal = (NUMBER_WORDS[hStr.toLowerCase()] ?? 1) * 100;
      const tVal = tensStr ? (NUMBER_WORDS[tensStr.toLowerCase()] ?? 0) : 0;
      const oVal = onesStr ? (NUMBER_WORDS[onesStr.toLowerCase()] ?? 0) : 0;
      return String(hVal + tVal + oVal);
    }
  );

  // Compound 2-word years like "twenty twenty" -> "2020" or "twenty twenty-four" -> "2024"
  result = result.replace(
    /\b(twenty)\s+(ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty)\b/gi,
    (_, w1, w2) => {
      const v1 = NUMBER_WORDS[w1.toLowerCase()] ?? 20;
      const v2 = NUMBER_WORDS[w2.toLowerCase()] ?? 0;
      return String(v1 * 100 + v2);
    }
  );

  // Convert standard tens + ones (e.g., "forty seven" -> "47")
  result = result.replace(
    /\b(twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)\s+(one|two|three|four|five|six|seven|eight|nine)\b/gi,
    (_, tens, ones) => {
      const v1 = NUMBER_WORDS[tens.toLowerCase()] ?? 0;
      const v2 = NUMBER_WORDS[ones.toLowerCase()] ?? 0;
      return String(v1 + v2);
    }
  );

  // Convert individual number words to digits
  result = result.replace(
    /\b(zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand)\b/gi,
    (match) => {
      const val = NUMBER_WORDS[match.toLowerCase()];
      return val !== undefined ? String(val) : match;
    }
  );

  return result;
}

/**
 * Splits text into an array of clean normalized tokens with number equivalence.
 */
export function tokenizeText(text: string): string[] {
  const normalized = normalizeSpokenNumbers(text);
  return normalized
    .split(/\s+/)
    .map(normalizeToken)
    .filter((t) => t.length > 0);
}

/**
 * Checks whether two tokens match, with support for:
 * 1. Exact match
 * 2. Numeric equivalence ("11" === "eleven")
 * 3. Prefix/stem matching for words >= 4 letters
 */
export function isTokenMatch(t1: string, t2: string): boolean {
  if (!t1 || !t2) return false;
  if (t1 === t2) return true;

  // Numeric check: one could be word, one could be digit
  const n1 = NUMBER_WORDS[t1] !== undefined ? String(NUMBER_WORDS[t1]) : t1;
  const n2 = NUMBER_WORDS[t2] !== undefined ? String(NUMBER_WORDS[t2]) : t2;
  if (n1 === n2) return true;

  // Stem / prefix match if longer than 4 chars (e.g. "villain" / "villains", "walk" / "walking")
  if (t1.length >= 4 && t2.length >= 4) {
    if (t1.startsWith(t2) || t2.startsWith(t1)) return true;
    const minLen = Math.min(t1.length, t2.length);
    if (minLen >= 5 && t1.slice(0, 5) === t2.slice(0, 5)) return true;
  }

  return false;
}
