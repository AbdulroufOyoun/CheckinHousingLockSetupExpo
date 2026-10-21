export function formatDateTime(value: string | undefined | null, locale: string): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  const lang = locale.startsWith('ar') ? 'ar-SA' : 'en-GB';
  return d.toLocaleString(lang, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
