/** پیام موفقیت/خطا از پارامترهای آدرس (?ok= / ?error=) */
export default function Flash({ ok, error }: { ok?: string; error?: string }) {
  if (!ok && !error) return null;
  return <div className={`flash ${error ? 'bad' : 'ok'}`} role={error ? 'alert' : 'status'}>{error ? error.split(' | ').map((e) => <div key={e}>⚠️ {e}</div>) : `✓ ${ok}`}</div>;
}
export const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';
export const faDate = (d: Date | number) => new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(d));
