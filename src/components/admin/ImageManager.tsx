'use client';
import Image from 'next/image';
import { useRef, useState, type DragEvent } from 'react';
import { moveItem } from '@/lib/media/gallery';
import { MEDIA_LIMITS } from '@/lib/media/validate';
import { fa } from '@/lib/format';
import { useToast } from '../Providers';

interface Img { id: string; url: string; alt: string; optionValue: string | null; width: number | null; height: number | null }

/** مدیریت عکس‌های محصول: بارگذاری چندتایی، ترتیب، عکس اصلی، رنگ، متن جایگزین، حذف */
export default function ImageManager({ productId, initial, colorOption }: { productId: string; initial: Img[]; colorOption?: { name: string; values: string[] } }) {
  const toast = useToast();
  const [imgs, setImgs] = useState<Img[]>(initial);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const base = `/api/admin/products/${productId}/images`;
  const left = MEDIA_LIMITS.maxImagesPerProduct - imgs.length;

  async function upload(files: FileList | File[]) {
    const list = Array.from(files);
    if (!list.length) return;
    if (list.length > left) { setErrors([`فقط ${fa(left)} عکس دیگر می‌توانید اضافه کنید.`]); return; }
    const big = list.filter((f) => f.size > MEDIA_LIMITS.maxBytes);
    if (big.length) { setErrors(big.map((f) => `«${f.name}» بیشتر از ۸ مگابایت است.`)); return; }
    setBusy(true); setErrors([]);
    const fd = new FormData(); list.forEach((f) => fd.append('files', f));
    const r = await fetch(base, { method: 'POST', body: fd });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    if (d.images) setImgs(d.images);
    if (d.errors?.length) setErrors(d.errors); else if (!r.ok) setErrors([d.error ?? 'بارگذاری ناموفق بود']);
    else toast(`✓ ${fa(list.length)} عکس اضافه شد`);
    if (input.current) input.current.value = '';
  }

  async function reorder(next: Img[]) {
    const prev = imgs; setImgs(next);
    const r = await fetch(base, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ order: next.map((i) => i.id) }) });
    if (!r.ok) { setImgs(prev); toast('ذخیرهٔ ترتیب ناموفق بود'); }
  }

  async function patch(id: string, d: Partial<Pick<Img, 'alt' | 'optionValue'>>) {
    setImgs((l) => l.map((i) => (i.id === id ? { ...i, ...d } : i)));
    const r = await fetch(`/api/admin/images/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) });
    if (!r.ok) toast('ذخیره ناموفق بود');
  }

  async function remove(id: string) {
    if (!confirm('این عکس حذف شود؟')) return;
    const r = await fetch(`/api/admin/images/${id}`, { method: 'DELETE' });
    if (r.ok) { setImgs((l) => l.filter((i) => i.id !== id)); toast('عکس حذف شد'); } else toast('حذف ناموفق بود');
  }

  const onDrop = (e: DragEvent) => { e.preventDefault(); setDrag(false); if (!busy) upload(e.dataTransfer.files); };

  return (
    <section className="admin-card">
      <div className="admin-head"><h3>عکس‌های محصول ({fa(imgs.length)} از {fa(MEDIA_LIMITS.maxImagesPerProduct)})</h3></div>
      <div className={`dropzone${drag ? ' over' : ''}`} onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={onDrop}
        onClick={() => !busy && left > 0 && input.current?.click()} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && input.current?.click()}>
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple hidden onChange={(e) => e.target.files && upload(e.target.files)} />
        {busy ? '⏳ در حال بارگذاری و بهینه‌سازی…' : left > 0 ? '📷 عکس‌ها را اینجا رها کنید یا کلیک کنید — JPG، PNG، WebP تا ۸ مگابایت، حداقل ۳۰۰ پیکسل' : 'به حداکثر تعداد عکس رسیده‌اید.'}
      </div>
      <small style={{ color: 'var(--muted)' }}>عکس‌ها خودکار به WebP تبدیل، تا ۱۶۰۰ پیکسل کوچک و اطلاعات مکان (EXIF) حذف می‌شوند. عکس اول = عکس اصلی. پس‌زمینهٔ سفید یا روشن یکدست بهترین نتیجه را دارد.</small>
      {errors.length > 0 && <div className="flash bad">{errors.map((e) => <div key={e}>⚠️ {e}</div>)}</div>}
      {imgs.length > 0 && (
        <div className="img-grid">
          {imgs.map((im, i) => (
            <div key={im.id} className="img-card">
              <div className="img-box">
                <Image src={im.url} alt={im.alt} fill sizes="200px" style={{ objectFit: 'contain' }} />
                {i === 0 && <span className="img-tag">عکس اصلی</span>}
              </div>
              <input value={im.alt} onChange={(e) => setImgs((l) => l.map((x) => (x.id === im.id ? { ...x, alt: e.target.value } : x)))} onBlur={(e) => patch(im.id, { alt: e.target.value })} placeholder="متن جایگزین (برای گوگل)" aria-label="متن جایگزین" />
              {colorOption && (
                <select value={im.optionValue ?? ''} onChange={(e) => patch(im.id, { optionValue: e.target.value || null })} aria-label={colorOption.name}>
                  <option value="">همهٔ {colorOption.name}ها (عمومی)</option>
                  {colorOption.values.map((v) => <option key={v} value={v}>{colorOption.name} {v}</option>)}
                </select>
              )}
              <div className="img-actions">
                <button type="button" disabled={i === 0} onClick={() => reorder(moveItem(imgs, i, i - 1))} aria-label="جلوتر">→</button>
                <button type="button" disabled={i === 0} onClick={() => reorder(moveItem(imgs, i, 0))}>اصلی کن</button>
                <button type="button" disabled={i === imgs.length - 1} onClick={() => reorder(moveItem(imgs, i, i + 1))} aria-label="عقب‌تر">←</button>
                <button type="button" className="danger" onClick={() => remove(im.id)} aria-label="حذف">🗑</button>
              </div>
              {im.width && <small style={{ color: 'var(--muted)', fontSize: 11 }} dir="ltr">{im.width}×{im.height}</small>}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
