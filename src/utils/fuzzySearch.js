/**
 * Utilidades de búsqueda tolerante a dislexia, tildes, fonética española y errores tipográficos.
 */

export function stripAccents(text) {
  return String(text ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function spanishPhonetic(text) {
  return stripAccents(text)
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/ll/g, "y")
    .replace(/qu/g, "k")
    .replace(/c(?=[ei])/g, "s")
    .replace(/c(?=[aou])/g, "k")
    .replace(/g(?=[ei])/g, "j")
    .replace(/v/g, "b")
    .replace(/z/g, "s")
    .replace(/h/g, "")
    .replace(/x/g, "ks")
    .replace(/([a-z])\1+/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

export function damerauLevenshtein(a, b, maxDist = 2) {
  if (a === b) return 0;
  const lenA = a.length;
  const lenB = b.length;
  if (Math.abs(lenA - lenB) > maxDist) return maxDist + 1;
  if (lenA === 0) return lenB;
  if (lenB === 0) return lenA;

  const d = Array.from({ length: lenA + 1 }, () => new Array(lenB + 1).fill(0));
  for (let i = 0; i <= lenA; i++) d[i][0] = i;
  for (let j = 0; j <= lenB; j++) d[0][j] = j;

  for (let i = 1; i <= lenA; i++) {
    let rowMin = maxDist + 1;
    const ca = a[i - 1];
    for (let j = 1; j <= lenB; j++) {
      const cb = b[j - 1];
      const cost = ca === cb ? 0 : 1;
      let val = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + cost
      );
      if (i > 1 && j > 1 && ca === b[j - 2] && a[i - 2] === cb) {
        val = Math.min(val, d[i - 2][j - 2] + 1);
      }
      d[i][j] = val;
      if (val < rowMin) rowMin = val;
    }
    if (rowMin > maxDist) return maxDist + 1;
  }

  return d[lenA][lenB];
}

function allowedDistance(len) {
  if (len <= 2) return 0;
  if (len <= 4) return 1;
  if (len <= 8) return 2;
  return 3;
}

function tokenMatches(tokenClean, tokenPhon, targetClean, targetWords, targetPhon, targetPhonWords) {
  if (targetClean.includes(tokenClean)) return true;
  if (tokenPhon && tokenPhon.length >= 2 && targetPhon.includes(tokenPhon)) return true;

  const maxDist = allowedDistance(tokenClean.length);
  if (maxDist === 0) return false;

  for (const word of targetWords) {
    if (word.length < 2) continue;
    if (damerauLevenshtein(tokenClean, word, maxDist) <= maxDist) return true;
    if (word.length > tokenClean.length && tokenClean.length >= 4) {
      const prefix = word.slice(0, tokenClean.length);
      if (damerauLevenshtein(tokenClean, prefix, 1) <= 1) return true;
    }
  }

  if (tokenPhon && tokenPhon.length >= 3) {
    const phonMax = allowedDistance(tokenPhon.length);
    for (const pword of targetPhonWords) {
      if (pword.length < 2) continue;
      if (damerauLevenshtein(tokenPhon, pword, phonMax) <= phonMax) return true;
    }
  }

  return false;
}

export function fuzzyMatchText(query, targetText) {
  const raw = String(query ?? "").trim();
  if (!raw) return true;

  const cleanQuery = stripAccents(raw).replace(/[^a-z0-9\s]/g, " ");
  const tokens = cleanQuery.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;

  const targetClean = stripAccents(targetText).replace(/[^a-z0-9\s]/g, " ");
  const targetWords = targetClean.split(/\s+/).filter(Boolean);
  const targetPhon = spanishPhonetic(targetText);
  const targetPhonWords = targetPhon.split(/\s+/).filter(Boolean);

  return tokens.every((t) =>
    tokenMatches(t, spanishPhonetic(t), targetClean, targetWords, targetPhon, targetPhonWords)
  );
}
