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

type AnyVariant = { size?: string; color?: string; optionValues?: Record<string, string> | null };

export function getProductVariantColumns(p: { options?: { name: string }[]; variants?: AnyVariant[] }): string[] {
  if (p.options && p.options.length > 0) {
    return p.options.map(o => o.name);
  }
  const ovKeys = new Set<string>();
  (p.variants || []).forEach(v => {
    if (v.optionValues && typeof v.optionValues === 'object') {
      Object.keys(v.optionValues).forEach(k => { if (k) ovKeys.add(k); });
    }
  });
  if (ovKeys.size > 0) return Array.from(ovKeys);
  const cols: string[] = [];
  if ((p.variants || []).some(v => normalizeVariantDim(v.size))) cols.push('المقاس');
  if ((p.variants || []).some(v => normalizeVariantDim(v.color))) cols.push('اللون');
  return cols;
}

export function variantColumnValue(v: AnyVariant | null | undefined, column: string): string {
  if (!v) return '—';
  if (column === 'المقاس') return normalizeVariantDim(v.size) || normalizeVariantDim(v.optionValues?.['المقاس']) || '—';
  if (column === 'اللون') return normalizeVariantDim(v.color) || normalizeVariantDim(v.optionValues?.['اللون']) || '—';
  return normalizeVariantDim(v.optionValues?.[column]) || '—';
}

export function getOrderVariantColumns(items: { variantLabel?: string }[]): { hasSize: boolean; hasColor: boolean } {
  let hasSize = false;
  let hasColor = false;
  (items || []).forEach(item => {
    const parts = (item.variantLabel || '').split(' - ');
    if (parts.length >= 1 && parts[0]) hasSize = true;
    if (parts.length >= 2 && parts[1]) hasColor = true;
  });
  return { hasSize, hasColor };
}