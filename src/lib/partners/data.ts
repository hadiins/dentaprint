/** دادهٔ مدارک همکاران (Prisma) */
import { prisma } from '../prisma';
import { verificationAfterReview, type DocKind, type DocStatus } from './documents';

export async function partnerOfUser(userId: string) {
  return prisma.partnerProfile.findUnique({ where: { userId }, select: { id: true, status: true, verification: true, orgName: true } });
}

export async function listDocs(partnerId: string) {
  return prisma.partnerDocument.findMany({ where: { partnerId }, orderBy: { createdAt: 'desc' } });
}
export const countDocs = (partnerId: string) => prisma.partnerDocument.count({ where: { partnerId } });

export async function createDoc(d: { partnerId: string; kind: DocKind; fileKey: string; originalName: string; contentType: string; size: number }) {
  return prisma.partnerDocument.create({ data: d });
}

/** حذف توسط خود همکار — فقط مدرک بررسی‌نشدهٔ خودش */
export async function deleteOwnPendingDoc(userId: string, docId: string): Promise<{ ok: true; key: string } | { ok: false; error: string }> {
  const doc = await prisma.partnerDocument.findUnique({ where: { id: docId }, include: { partner: { select: { userId: true } } } });
  if (!doc || doc.partner.userId !== userId) return { ok: false, error: 'مدرک پیدا نشد.' };
  if (doc.status !== 'PENDING') return { ok: false, error: 'مدرک بررسی‌شده قابل حذف نیست.' };
  const r = await prisma.partnerDocument.deleteMany({ where: { id: docId, status: 'PENDING' } });
  return r.count ? { ok: true, key: doc.fileKey } : { ok: false, error: 'مدرک هم‌زمان بررسی شد.' };
}

export async function docForDownload(docId: string) {
  return prisma.partnerDocument.findUnique({ where: { id: docId }, include: { partner: { select: { userId: true } } } });
}

/**
 * بررسی مدرک توسط مدیر + به‌روزرسانی خودکار سطح تأیید همکار
 * (تأیید پروانه/کد اقتصادی ← «تأیید با مدرک»؛ رد آخرین مدرک معتبر ← «تأیید پایه»)
 */
export async function reviewDoc(docId: string, status: Exclude<DocStatus, 'PENDING'>, note: string | null, adminId: string) {
  return prisma.$transaction(async (tx) => {
    const doc = await tx.partnerDocument.update({
      where: { id: docId }, data: { status, reviewNote: note, reviewedAt: new Date(), reviewedBy: adminId },
      include: { partner: { include: { user: { select: { phone: true } } } } },
    });
    const all = await tx.partnerDocument.findMany({ where: { partnerId: doc.partnerId }, select: { kind: true, status: true } });
    const before = doc.partner.verification;
    // اگر همکار هنوز هیچ تأییدی ندارد، با مدرک غیررسمی سطح تأیید تغییر نمی‌کند
    const after = verificationAfterReview(before, all as { kind: DocKind; status: DocStatus }[]);
    if (after !== before) await tx.partnerProfile.update({ where: { id: doc.partnerId }, data: { verification: after } });
    return { partnerId: doc.partnerId, phone: doc.partner.user.phone, kind: doc.kind as DocKind, before, after };
  });
}
