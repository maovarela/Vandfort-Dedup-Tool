// /components/match/fuzzy.ts
// All fuzzy algorithms run in the Web Worker — no external NLP deps.

import { tokenSet } from "./normalize";
import { distance } from "fastest-levenshtein";

/** Levenshtein similarity (0–100) */
export function levenshteinSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 100;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 100;
  return Math.round((1 - distance(a, b) / maxLen) * 100);
}

/**
 * Token-set ratio (similar to rapidfuzz token_set_ratio).
 * Handles word reordering gracefully — e.g. "ACME Corp" vs "Corp ACME".
 */
export function tokenSetRatio(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 100;
  const setA = new Set(tokenSet(a));
  const setB = new Set(tokenSet(b));
  const intersection = [...setA].filter((t) => setB.has(t));
  const union = new Set([...setA, ...setB]);
  if (union.size === 0) return 0;
  const jaccardBase = intersection.length / union.size;
  // Also compare sorted token strings via Levenshtein for partial credit
  const sortedA = tokenSet(a).join(" ");
  const sortedB = tokenSet(b).join(" ");
  const levSim = levenshteinSimilarity(sortedA, sortedB) / 100;
  return Math.round(Math.max(jaccardBase, levSim * 0.9) * 100);
}

/**
 * Jaro-Winkler similarity (0–100).
 * Better for short strings like domain roots and names.
 */
export function jaroWinkler(s1: string, s2: string): number {
  if (!s1 || !s2) return 0;
  if (s1 === s2) return 100;
  const len1 = s1.length;
  const len2 = s2.length;
  const matchDist = Math.floor(Math.max(len1, len2) / 2) - 1;
  if (matchDist < 0) return 0;

  const s1Matches = new Array(len1).fill(false);
  const s2Matches = new Array(len2).fill(false);
  let matches = 0;
  let transpositions = 0;

  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchDist);
    const end = Math.min(i + matchDist + 1, len2);
    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue;
      s1Matches[i] = true;
      s2Matches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0;

  let k = 0;
  for (let i = 0; i < len1; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }

  const jaro =
    (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3;

  // Winkler prefix bonus (up to 4 chars)
  let prefix = 0;
  for (let i = 0; i < Math.min(4, Math.min(len1, len2)); i++) {
    if (s1[i] === s2[i]) prefix++;
    else break;
  }

  return Math.round((jaro + prefix * 0.1 * (1 - jaro)) * 100);
}

/** Compute composite fuzzy score for two preprocessed records */
export function computeFuzzyScore(
  a: Record<string, string>,
  b: Record<string, string>,
  threshold: number
): { score: number; matchedField: string } | null {
  const candidates: Array<{ score: number; field: string }> = [];

  // Name similarity (token-set ratio)
  if (a.name_normalized && b.name_normalized) {
    const score = tokenSetRatio(a.name_normalized, b.name_normalized);
    if (score >= threshold) candidates.push({ score, field: "name" });
  }

  // Domain root (Jaro-Winkler)
  if (a.domain_root && b.domain_root) {
    const score = jaroWinkler(a.domain_root, b.domain_root);
    if (score >= threshold) candidates.push({ score, field: "domain_root" });
  }

  // Name + same country bonus
  if (
    a.name_normalized && b.name_normalized &&
    a.country && b.country && a.country === b.country
  ) {
    const nameScore = tokenSetRatio(a.name_normalized, b.name_normalized);
    if (nameScore >= threshold - 5) {
      candidates.push({ score: Math.min(100, nameScore + 3), field: "name+country" });
    }
  }

  // Full name for contacts (Levenshtein)
  if (a.full_name_normalized && b.full_name_normalized) {
    const score = levenshteinSimilarity(a.full_name_normalized, b.full_name_normalized);
    if (score >= threshold) candidates.push({ score, field: "full_name" });
  }

  if (candidates.length === 0) return null;
  const best = candidates.reduce((a, b) => (a.score >= b.score ? a : b));
  return { score: best.score, matchedField: best.field };
}
