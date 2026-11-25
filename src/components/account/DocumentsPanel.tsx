'use client';
import { useRouter } from 'next/navigation';
import { useRef, useState, type FormEvent } from 'react';
import { DOC_KINDS, DOC_KIND_LABEL, DOC_LIMITS, DOC_STATUS_LABEL, type DocKind, type DocStatus } from '@/lib/partners/documents';
import { fa } from '@/lib/format';
import { useToast } from '../Providers';

export interface DocRow { id: string; kind: DocKind; status: DocStatus; originalName: string | null; reviewNote: string | null; createdAt: string; size: number; isPdf: boolean }

export default function DocumentsPanel({ docs, canUpload, blockReason, needsDocsFor }: { docs: DocRow[]; canUpload: boolean; blockReason?: string | null; needsDocsFor?: string | null }) {
  const router = useRouter();
  const toast = useToast();
  const [kind, setKind] = useState<DocKind>('LICENSE');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const file = useRef<HTMLInputElement>(null);
  const hasGranting = docs.some((d) => d.status === 'ACCEPTED' && DOC_KINDS.find((k) => k.id === d.kind)?.grantsDocuments);

  async function upload(e: FormEvent) {
    e.preventDefault();
    const f = file.current?.files?.[0];
    if (!f) return setErr('فایل را انتخاب کنید.');
    if (f.size > DOC_LIMITS.maxBytes) return setErr('حجم فایل بیشتر از ۱۰ مگابایت است.');
    setErr(''); setBusy(true);
    const fd = new FormData(); fd.append('kind', kind); fd.append('file', f);
    const r = await fetch('/api/account/documents', { method: 'POST', body: fd });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) return setErr(d.error ?? 'بارگذاری ناموفق بود');
    if (file.current) file.current.value = '';
    toast('✓ مدرک ارسال شد و پس از بررسی نتیجه اعلام می‌شود'); router.refresh();
  }
  async function remove(id: string) {
    if (!confirm('این مدرک حذف شود؟')) return;
    const r = await fetch(`/api/account/documents/${id}`, { method: 'DELETE' });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) return toast(d.error ?? 'حذف ناموفق بود');
    toast('مدرک حذف شد'); router.refresh();
  }

  return (
    <section className="acc-card" id="documents">
      <h3>مدارک همکاری</h3>
      <p>فایل‌ها کاملاً خصوصی‌اند و فقط شما و کارشناسان دنتاپرینت آن‌ها را می‌بینند. اطلاعات مکان (GPS) از عکس‌ها حذف می‌شود.</p>
      {needsDocsFor && !hasGranting && <div className="hint">برای سطح {needsDocsFor}، پروانهٔ فعالیت یا کد اقتصادی را بارگذاری کنید. داشتن پروانه برای همکاری الزامی نیست؛ بدون آن هم می‌توانید از سطوح دیگر استفاده کنید.</div>}
      {hasGranting && <span className="state ok">✓ مدرک رسمی شما تأیید شده است</span>}

      {docs.length > 0 && (
        <ul className="doc-list">
          {docs.map((d) => (
            <li key={d.id}>
              <span className="doc-ic">{d.isPdf ? '📄' : '🖼️'}</span>
              <div style={{ flex: 1 }}>
                <b>{DOC_KIND_LABEL[d.kind]}</b>
                <small>{d.originalName} · {fa(Math.round(d.size / 1024))} کیلوبایت · {new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium' }).format(new Date(d.createdAt))}</small>
                {d.reviewNote && <small className="note">یادداشت کارشناس: {d.reviewNote}</small>}
              </div>
              <span className={`state ${d.status === 'ACCEPTED' ? 'ok' : d.status === 'REJECTED' ? 'bad' : 'wait'}`}>{DOC_STATUS_LABEL[d.status]}</span>
              <a href={`/api/documents/${d.id}`} target="_blank" rel="noopener" className="link">مشاهده</a>
              {d.status === 'PENDING' && <button className="link" style={{ color: '#ff6b6b' }} onClick={() => remove(d.id)}>حذف</button>}
            </li>
          ))}
        </ul>
      )}

      {canUpload ? (
        <form onSubmit={upload} className="doc-form">
          <select value={kind} onChange={(e) => setKind(e.target.value as DocKind)} aria-label="نوع مدرک">
            {DOC_KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
          </select>
          <input ref={file} type="file" accept="application/pdf,image/jpeg,image/png,image/webp" aria-label="فایل مدرک" />
          <button className="btn btn-main" disabled={busy}>{busy ? 'در حال ارسال…' : 'ارسال مدرک'} <span className="arr">←</span></button>
          <small style={{ color: 'var(--muted)' }}>{DOC_KINDS.find((k) => k.id === kind)?.hint} · PDF یا عکس، حداکثر ۱۰ مگابایت</small>
          {err && <div className="err" role="alert">{err}</div>}
        </form>
      ) : blockReason && <div className="hint">{blockReason}</div>}
    </section>
  );
}
