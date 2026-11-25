'use server';
/** عملیات پنل مدیریت — هر عملیات دوباره دسترسی مدیر را بررسی می‌کند */
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/server/admin-auth';
import { changeOrderStatus, decidePartner, saveProduct, setProductActive } from '@/lib/admin/data';
import { STATUS_NOTIFY, affectsSpend } from '@/lib/admin/order-workflow';
import { partnerNotifyEvent } from '@/lib/admin/partner-review';
import { parseProductForm } from '@/lib/admin/product-input';
import { notify, parseTemplates, type NotifyData, type NotifyEvent } from '@/lib/notify';
import { getSmsProvider } from '@/lib/sms/registry';
import { getCommerceSettings } from '@/lib/settings';
import { activeTiers } from '@/lib/commerce-config';
import { CATEGORIES } from '@/lib/catalog';
import { evaluatePartnerByPhone } from '@/lib/server/tier-eval';
import type { OrderStatus } from '@/lib/payments/repo';
import type { PartnerStatus, VerificationLevel } from '@/lib/auth/types';
import { reviewDoc } from '@/lib/partners/data';
import { DOC_KIND_LABEL } from '@/lib/partners/documents';
import { VERIFICATION_LABEL } from '@/lib/admin/partner-review';
import { evaluatePartner } from '@/lib/server/tier-eval';
import { saveSeller } from '@/lib/invoice/seller';
import { issueInvoiceForOrder } from '@/lib/invoice/issue';
import { toEnDigits } from '@/lib/format';
import type { SellerInfo } from '@/lib/invoice/build';

function back(path: string, msg: { ok?: string; error?: string }): never {
  const q = new URLSearchParams(Object.entries(msg).filter(([, v]) => v) as [string, string][]);
  redirect(`${path}?${q}`);
}
async function sendSms(event: NotifyEvent, phone: string, data: NotifyData): Promise<string> {
  const r = await notify(getSmsProvider(), parseTemplates(process.env.SMS_TEMPLATES), event, phone, data).catch(() => 'failed' as const);
  return r === 'sent' ? ' پیامک ارسال شد.' : r === 'failed' ? ' (ارسال پیامک ناموفق بود)' : '';
}

export async function decidePartnerAction(form: FormData) {
  const admin = await requireAdmin();
  const id = String(form.get('id'));
  const path = `/admin/partners/${id}`;
  const tiers = activeTiers(await getCommerceSettings());
  const r = await decidePartner(id, {
    status: String(form.get('status')) as PartnerStatus,
    verification: String(form.get('verification')) as VerificationLevel,
    tierSlug: String(form.get('tier') || '') || null,
    tierLocked: form.get('tierLocked') === 'on',
    adminNotes: String(form.get('adminNotes') ?? '').trim() || undefined,
  }, tiers, admin.id);
  if (!r.ok) back(path, { error: r.errors.join(' | ') });
  const ok = r;
  const status = String(form.get('status')) as PartnerStatus;
  const ev = partnerNotifyEvent(ok.prevStatus, status, ok.prevTier, String(form.get('tier') || '') || null);
  const smsMsg = ev ? await sendSms(ev, ok.phone, { tier: ok.tierName ?? '', name: ok.orgName }) : '';
  revalidatePath('/admin/partners');
  back(path, { ok: 'تغییرات ذخیره شد.' + smsMsg });
}

export async function changeOrderStatusAction(form: FormData) {
  const admin = await requireAdmin();
  const id = String(form.get('id'));
  const to = String(form.get('to')) as OrderStatus;
  const path = `/admin/orders/${id}`;
  const r = await changeOrderStatus(id, to, { trackingCode: String(form.get('trackingCode') ?? ''), note: String(form.get('note') ?? '').trim(), adminId: admin.id });
  if (!r.ok) back(path, { error: r.error });
  if (!('phone' in r)) back(path, { error: 'خطای ناشناخته' });
  const ok = r;
  const ev = STATUS_NOTIFY[to];
  const smsMsg = ev ? await sendSms(ev, ok.phone, { order: ok.number, tracking: ok.trackingCode }) : '';
  if (affectsSpend(to)) await evaluatePartnerByPhone(ok.phone).catch(() => undefined);
  revalidatePath('/admin/orders');
  back(path, { ok: 'وضعیت سفارش به‌روز شد.' + smsMsg });
}

export type ProductFormState = { errors: string[] };

export async function saveProductAction(_prev: ProductFormState, form: FormData): Promise<ProductFormState> {
  await requireAdmin();
  const id = String(form.get('id') || '') || null;
  const tiers = activeTiers(await getCommerceSettings()).map((t) => t.id);
  const raw: Record<string, string> = {};
  form.forEach((v, k) => { if (typeof v === 'string') raw[k] = v; });
  const parsed = parseProductForm(raw, { categories: CATEGORIES.map((c) => c.slug), tiers });
  if (!parsed.ok) return { errors: parsed.errors };
  const r = await saveProduct(id, parsed.value);
  if (!r.ok) return { errors: r.errors };
  revalidatePath('/', 'layout');
  redirect(`/admin/products/${r.id}?ok=${encodeURIComponent('محصول ذخیره شد.')}`);
}

export async function toggleProductAction(form: FormData) {
  await requireAdmin();
  await setProductActive(String(form.get('id')), form.get('active') === 'true');
  revalidatePath('/', 'layout');
  redirect('/admin/products');
}

export async function reviewDocumentAction(form: FormData) {
  const admin = await requireAdmin();
  const docId = String(form.get('docId')), partnerId = String(form.get('partnerId'));
  const decision = String(form.get('decision'));
  const note = String(form.get('note') ?? '').trim().slice(0, 300) || null;
  const path = `/admin/partners/${partnerId}`;
  if (decision !== 'ACCEPTED' && decision !== 'REJECTED') back(path, { error: 'تصمیم نامعتبر' });
  if (decision === 'REJECTED' && !note) back(path, { error: 'برای رد مدرک، دلیل را بنویسید تا همکار بداند چه چیزی را اصلاح کند.' });
  const r = await reviewDoc(docId, decision as 'ACCEPTED' | 'REJECTED', note, admin.id);
  let msg = decision === 'ACCEPTED' ? 'مدرک تأیید شد.' : 'مدرک رد شد.';
  if (r.after !== r.before) {
    msg += ` سطح تأیید: ${VERIFICATION_LABEL[r.after]}.`;
    const t = await evaluatePartner(r.partnerId).catch(() => ({ changed: false }));
    if ('to' in t && t.changed) msg += ` سطح همکاری به‌روز شد.`;
  }
  msg += await sendSms(decision === 'ACCEPTED' ? 'document_accepted' : 'document_rejected', r.phone, { doc: DOC_KIND_LABEL[r.kind] });
  revalidatePath(path);
  back(path, { ok: msg });
}

export async function saveSellerAction(form: FormData) {
  await requireAdmin();
  const str = (k: string) => String(form.get(k) ?? '').trim();
  const digits = (k: string) => toEnDigits(str(k));
  const s: SellerInfo = {
    legalName: str('legalName'), brandName: str('brandName') || 'دنتاپرینت', economicCode: digits('economicCode'), nationalId: digits('nationalId'),
    registrationNo: digits('registrationNo'), address: str('address'), postalCode: digits('postalCode'), phone: str('phone'), email: str('email'), website: str('website'),
    vatEnabled: form.get('vatEnabled') === 'on', vatRate: Number(toEnDigits(str('vatRate')).replace('/', '.')) || 0,
    pricesIncludeVat: str('pricesIncludeVat') !== 'false', currency: str('currency') === 'IRT' ? 'IRT' : 'IRR', footerNote: str('footerNote'),
  };
  const errors = await saveSeller(s);
  if (errors.length) back('/admin/seller', { error: errors.join(' | ') });
  back('/admin/seller', { ok: 'اطلاعات فروشنده ذخیره شد.' });
}

export async function issueInvoiceAction(form: FormData) {
  await requireAdmin();
  const id = String(form.get('id'));
  const r = await issueInvoiceForOrder(id).catch(() => null);
  back(`/admin/orders/${id}`, r ? { ok: `فاکتور ${r.number} صادر شد.` } : { error: 'صدور فاکتور ممکن نشد (سفارش باید پرداخت‌شده باشد).' });
}
