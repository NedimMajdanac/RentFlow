export function parseDecimal(value: unknown): number | null {
  const t = String(value ?? '').trim().replace(',', '.');
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
}

export function toNumberOrNull(value: unknown): number | null {
  const n = parseDecimal(value);
  return n === null || Number.isNaN(n) ? null : n;
}