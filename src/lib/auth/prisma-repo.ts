import type { PrismaClient } from '@prisma/client';
import type { AuthRepo, AuthUser } from './types';

const include = { partner: { include: { tier: { select: { slug: true } } } } } as const;
type Row = { id: string; phone: string; fullName: string | null; role: AuthUser['role'];
  partner: { orgName: string; status: NonNullable<AuthUser['partner']>['status']; verification: NonNullable<AuthUser['partner']>['verification']; tierLocked: boolean; tier: { slug: string } | null } | null };

const toUser = (u: Row): AuthUser => ({
  id: u.id, phone: u.phone, fullName: u.fullName, role: u.role,
  partner: u.partner ? { orgName: u.partner.orgName, status: u.partner.status, verification: u.partner.verification, tierSlug: u.partner.tier?.slug ?? null, tierLocked: u.partner.tierLocked } : null,
});

export function createPrismaAuthRepo(prisma: PrismaClient): AuthRepo {
  return {
    async createOtp(i) {
      await prisma.otpCode.create({ data: { phone: i.phone, codeHash: i.codeHash, expiresAt: new Date(i.expiresAt), ip: i.ip, createdAt: new Date(i.now) } });
    },
    async latestOtp(phone) {
      const o = await prisma.otpCode.findFirst({ where: { phone }, orderBy: { createdAt: 'desc' } });
      return o ? { id: o.id, phone: o.phone, codeHash: o.codeHash, expiresAt: o.expiresAt.getTime(), attempts: o.attempts, consumedAt: o.consumedAt?.getTime() ?? null, createdAt: o.createdAt.getTime() } : null;
    },
    async countOtpsSince(w, since) {
      return prisma.otpCode.count({ where: { createdAt: { gte: new Date(since) }, ...(w.phone ? { phone: w.phone } : {}), ...(w.ip ? { ip: w.ip } : {}) } });
    },
    async incrementOtpAttempts(id) { await prisma.otpCode.update({ where: { id }, data: { attempts: { increment: 1 } } }); },
    async consumeOtp(id, now) {
      const r = await prisma.otpCode.updateMany({ where: { id, consumedAt: null }, data: { consumedAt: new Date(now) } });
      return r.count === 1;
    },
    async findOrCreateUser(phone, opts = {}) {
      const u = await prisma.user.upsert({ where: { phone }, update: opts.makeAdmin ? { role: 'ADMIN' } : {}, create: { phone, role: opts.makeAdmin ? 'ADMIN' : 'CUSTOMER' }, include });
      return toUser(u);
    },
    async createSession(i) {
      await prisma.session.create({ data: { tokenHash: i.tokenHash, userId: i.userId, expiresAt: new Date(i.expiresAt), ip: i.ip, userAgent: i.userAgent } });
    },
    async getSessionUser(tokenHash, now) {
      const s = await prisma.session.findUnique({ where: { tokenHash }, include: { user: { include } } });
      if (!s || s.expiresAt.getTime() <= now) return null;
      return toUser(s.user);
    },
    async deleteSession(tokenHash) { await prisma.session.deleteMany({ where: { tokenHash } }); },
    async updateProfile(userId, d) { if (d.fullName) await prisma.user.update({ where: { id: userId }, data: { fullName: d.fullName } }); },
  };
}
