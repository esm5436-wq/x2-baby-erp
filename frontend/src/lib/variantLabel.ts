export function normalizeVariantDim(val: string | undefined | null): string {
  if (!val || val === 'متعدد' || val === 'واحد') return '';
  return val;
}

export function variantLabel(
  v: { size?: string; color?: string } | null | undefined,
  separator: string = ' / '
): string {
  if (!v) return '';
  return [normalizeVariantDim(v.size), normalizeVariantDim(v.color)].filter(Boolean).join(separator);
}

export function variantSizeOrDash(v: { size?: string } | null | undefined): string {
  const s = v && normalizeVariantDim(v.size);
  return s || '—';
}

export function variantColorOrDash(v: { color?: string } | null | undefined): string {
  const c = v && normalizeVariantDim(v.color);
  return c || '—';
}