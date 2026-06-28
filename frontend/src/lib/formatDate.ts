export function formatDate(dateStr: string | undefined | null, style: 'full' | 'date' = 'full'): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (style === 'date') {
      return d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
    }
    return d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}
