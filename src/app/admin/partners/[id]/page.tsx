import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPartner } from '@/lib/admin/data';
import { PARTNER_STATUS_LABEL, VERIFICATION_LABEL } from '@/lib/admin/partner-review';
import { decidePartnerAction, reviewDocumentAction } from '../../actions';
import { DOC_KIND_LABEL, DOC_STATUS_LABEL, type DocKind, type DocStatus } from '@/lib/partners/documents';
import { getCommerceSettings } from '@/lib/settings';
import { activeTiers } from '@/lib/commerce-config';
import { tierProgress } from '@/lib/tier-progress';
import DbRequired from '@/components/admin/DbRequired';
import Flash, { one, faDate } from '@/components/admin/Flash';
import { fa, toman } from '@/lib/format';

type P = Promise<{ id: string }>; type SP = Promise<{ [k: string]: string | string[] | undefined }>;

export default async function PartnerDetail({ params, searchParams }: { params: P; searchParams: SP }) {
  if (!process.env.DATABASE_URL) return <DbRequired />;
  const [{ id }, sp, settings] = await Promise.all([params, searchParams, getCommerceSettings()]);
  const p = await getPartner(id, settings.evaluationWindowDays);
  if (!p) notFound();
  const tiers = activeTiers(settings);
  const current = tiers.find((t) => t.id === p.tier?.slug) ?? null;
  const prog = tierProgress(current, p.spend, p.verification, tiers);
  return (
    <div className="admin">
      <Link href="/admin/partners" className="link">→ بازگشت به فهرست همکاران</Link>
      <h1 className="admin-h1">{p.orgName}</h1>
      <Flash ok={one(sp.ok)} error={one(sp.error)} />
      <div className="account">
        <section className="admin-card">
          <h3>اطلاعات</h3>
          <table className="specs"><tbody>
            <tr><td>مسئول</td><td>{p.user.fullName ?? '—'}</td></tr>
            <tr><td>موبایل</td><td dir="ltr" style={{ textAlign: 'right' }}>{p.user.phone}</td></tr>
            <tr><td>شهر / آدرس</td><td>{p.city}{p.address ? ` — ${p.address}` : ''}</td></tr>
            <tr><td>پروانه</td><td>{p.hasLicense ? `دارد ${p.licenseNumber ?? ''}` : 'ندارد'}</td></tr>
            <tr><td>کد اقتصادی</td><td>{p.economicCode ?? '—'}</td></tr>
            <tr><td>وضعیت</td><td>{PARTNER_STATUS_LABEL[p.status]} · {VERIFICATION_LABEL[p.verification]}</td></tr>
            <tr><td>خرید {fa(Math.round(settings.evaluationWindowDays / 30))} ماه اخیر</td><td>{toman(p.spend)} ({fa(p.paidOrders)} سفارش)</td></tr>
            <tr><td>سطح بعدی</td><td>{prog.next ? `${prog.next.name} — ${toman(prog.remaining)} باقی‌مانده${prog.nextNeedsDocs ? ' (نیاز به مدرک)' : ''}` : 'بالاترین سطح'}</td></tr>
            <tr><td>تاریخ درخواست</td><td>{faDate(p.createdAt)}</td></tr>
          </tbody></table>
          <h3 style={{ fontSize: 16 }} id="docs">مدارک ({fa(p.documents.length)})</h3>
          {p.documents.length === 0 ? <p style={{ color: 'var(--muted)', fontSize: 13 }}>همکار هنوز مدرکی بارگذاری نکرده است.</p> : (
            <ul className="doc-list">{p.documents.map((d) => (
              <li key={d.id} style={{ flexWrap: 'wrap' }}>
                <span className="doc-ic">{d.contentType === 'application/pdf' ? '📄' : '🖼️'}</span>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <b>{DOC_KIND_LABEL[d.kind as DocKind]}</b>
                  <small>{d.originalName} · {fa(Math.round(d.size / 1024))} KB · {faDate(d.createdAt)}</small>
                  {d.reviewNote && <small className="note">یادداشت: {d.reviewNote}</small>}
                </div>
                <span className={`state ${d.status === 'ACCEPTED' ? 'ok' : d.status === 'REJECTED' ? 'bad' : 'wait'}`}>{DOC_STATUS_LABEL[d.status as DocStatus]}</span>
                <a href={`/api/documents/${d.id}`} target="_blank" rel="noopener" className="link">مشاهده</a>
                <a href={`/api/documents/${d.id}?download=1`} className="link">دانلود</a>
                <form action={reviewDocumentAction} className="doc-review">
                  <input type="hidden" name="docId" value={d.id} /><input type="hidden" name="partnerId" value={p.id} />
                  <input name="note" placeholder="یادداشت / دلیل رد" defaultValue={d.reviewNote ?? ''} />
                  <button name="decision" value="ACCEPTED" className="btn btn-main" style={{ padding: '7px 14px' }} disabled={d.status === 'ACCEPTED'}>تأیید</button>
                  <button name="decision" value="REJECTED" className="btn btn-glass" style={{ padding: '7px 14px' }} disabled={d.status === 'REJECTED'}>رد</button>
                </form>
              </li>))}
            </ul>)}
          <small style={{ color: 'var(--muted)' }}>تأیید پروانه یا کد اقتصادی، سطح تأیید را خودکار «تأیید با مدرک» می‌کند و سطوح نیازمند مدرک باز می‌شوند.</small>
          {p.tierHistory.length > 0 && (<>
            <h3 style={{ fontSize: 16 }}>تاریخچهٔ سطح</h3>
            <ul className="plain">{p.tierHistory.map((h) => <li key={h.id}><small>{faDate(h.createdAt)} — {h.reason === 'ADMIN' ? 'توسط مدیر' : 'ارتقای خودکار'}</small></li>)}</ul>
          </>)}
        </section>

        <form action={decidePartnerAction} className="admin-card">
          <input type="hidden" name="id" value={p.id} />
          <h3>تصمیم مدیر</h3>
          <label className="fld"><span>وضعیت</span>
            <select name="status" defaultValue={p.status === 'PENDING' ? 'APPROVED' : p.status}>
              {Object.entries(PARTNER_STATUS_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select></label>
          <label className="fld"><span>سطح تأیید</span>
            <select name="verification" defaultValue={p.verification === 'NONE' ? 'BASIC' : p.verification}>
              {Object.entries(VERIFICATION_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select></label>
          <label className="fld"><span>سطح همکاری</span>
            <select name="tier" defaultValue={p.tier?.slug ?? tiers[0]?.id}>
              {tiers.map((t) => <option key={t.id} value={t.id}>{t.icon} {t.name} — {fa(t.discountPercent)}٪{t.requiresDocuments ? ' (نیاز به مدرک)' : ''}</option>)}
            </select></label>
          <label className="admin-row"><input type="checkbox" name="tierLocked" defaultChecked={p.tierLocked} /> قفل سطح (ارتقا/تنزل خودکار انجام نشود)</label>
          <label className="fld"><span>یادداشت داخلی</span><textarea name="adminNotes" rows={3} defaultValue={p.adminNotes ?? ''} placeholder="مثلاً: تماس گرفته شد، محل کار تأیید شد" /></label>
          <button className="btn btn-main">ذخیرهٔ تصمیم <span className="arr">←</span></button>
          <small style={{ color: 'var(--muted)' }}>با تأیید یا تغییر سطح، در صورت تعریف الگو، به همکار پیامک ارسال می‌شود.</small>
        </form>
      </div>
    </div>
  );
}
