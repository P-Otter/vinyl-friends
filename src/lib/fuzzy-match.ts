// Toleranter Titel/Artist-Vergleich — Port von FuzzyMatch.swift (iOS-App).
// Generisch, keine iTunes-Abhängigkeit — genutzt von der iTunes-Vorschau-Auflösung
// UND vom "Artist & Titel raten"-Bonus-Modus.

/** Normalisieren: Kleinbuchstaben, Akzente weg, Klammer-Zusätze
 *  ("… (Remastered 2011)", "… - Single Version") und Sonderzeichen entfernen. */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // Akzente
    .replace(/\(.*?\)|\[.*?\]/g, '') // Klammer-Zusätze
    .replace(/\s*-\s*(remaster(ed)?|single|radio|album|mono|stereo|live|version|edit|mix).*$/i, '')
    .replace(/[^a-z0-9äöüß ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const curr = [i];
    for (let j = 1; j <= n; j++) {
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = curr;
  }
  return prev[n];
}

/** Toleranter Vergleich: normalisiert + Levenshtein ≤ tolerance·Länge. */
export function fuzzyMatches(a: string, b: string, tolerance = 0.2): boolean {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return false;
  if (na === nb || na.includes(nb) || nb.includes(na)) return true;
  const dist = levenshtein(na, nb);
  return dist <= Math.max(1, Math.floor(Math.max(na.length, nb.length) * tolerance));
}

/** Artist-Vergleich: erster (Haupt-)Künstler reicht — "feat."-Anhänge egal. */
export function fuzzyMatchesArtist(a: string, b: string, tolerance = 0.2): boolean {
  const first = (s: string) => normalize(s).split(/,|feat|&|x /)[0]?.trim() ?? '';
  return fuzzyMatches(first(a), first(b), tolerance) || fuzzyMatches(a, b, tolerance);
}
