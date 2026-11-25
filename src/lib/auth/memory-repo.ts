/** ذخیره‌سازی ورود در حافظه — برای توسعه بدون پایگاه داده و تست‌ها */
import type { AuthRepo, AuthUser, OtpRecord, PartnerInfo } from './types.ts';

export class MemoryAuthRepo implements AuthRepo {
  otps: (OtpRecord & { ip: string | null })[] = [];
  users = new Map<string, AuthUser>();
  sessions = new Map<string, { userId: string; expiresAt: number }>();
  private seq = 0;

  private demoPartners: Record<string, string>;
  /** demoPartners: { '09121111111': 'silver' } ← این شماره‌ها در حالت نمایشی همکار تأییدشده‌اند */
  constructor(demoPartners: Record<string, string> = {}) { this.demoPartners = demoPartners; }

  async createOtp(i: { phone: string; codeHash: string; expiresAt: number; ip: string | null; now: number }) {
    this.otps.push({ id: `otp${++this.seq}`, phone: i.phone, codeHash: i.codeHash, expiresAt: i.expiresAt, attempts: 0, consumedAt: null, createdAt: i.now, ip: i.ip });
  }
  async latestOtp(phone: string) {
    const list = this.otps.filter((o) => o.phone === phone);
    const o = list[list.length - 1];
    return o ? { ...o } : null;
  }
  async countOtpsSince(w: { phone?: string; ip?: string }, since: number) {
    return this.otps.filter((o) => o.createdAt >= since && (!w.phone || o.phone === w.phone) && (!w.ip || o.ip === w.ip)).length;
  }
  async incrementOtpAttempts(id: string) { const o = this.otps.find((x) => x.id === id); if (o) o.attempts++; }
  async consumeOtp(id: string, now: number) {
    const o = this.otps.find((x) => x.id === id);
    if (!o || o.consumedAt) return false;
    o.consumedAt = now; return true;
  }
  async findOrCreateUser(phone: string, opts: { makeAdmin?: boolean } = {}) {
    let u = [...this.users.values()].find((x) => x.phone === phone);
    if (!u) {
      const tier = this.demoPartners[phone];
      const partner: PartnerInfo | null = tier ? { orgName: 'لابراتوار نمونه', status: 'APPROVED', verification: 'BASIC', tierSlug: tier, tierLocked: false } : null;
      u = { id: `u${++this.seq}`, phone, fullName: null, role: partner ? 'PARTNER' : 'CUSTOMER', partner };
      this.users.set(u.id, u);
    }
    if (opts.makeAdmin && u.role !== 'ADMIN') u.role = 'ADMIN';
    return { ...u };
  }
  async createSession(i: { tokenHash: string; userId: string; expiresAt: number }) { this.sessions.set(i.tokenHash, { userId: i.userId, expiresAt: i.expiresAt }); }
  async getSessionUser(tokenHash: string, now: number) {
    const s = this.sessions.get(tokenHash);
    if (!s || s.expiresAt <= now) return null;
    const u = this.users.get(s.userId);
    return u ? { ...u } : null;
  }
  async deleteSession(tokenHash: string) { this.sessions.delete(tokenHash); }
  async updateProfile(userId: string, d: { fullName?: string }) { const u = this.users.get(userId); if (u && d.fullName) u.fullName = d.fullName; }
}

export function parseDemoPartners(v?: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const pair of (v ?? '').split(',')) { const [phone, tier] = pair.split(':').map((s) => s?.trim()); if (phone && tier) out[phone] = tier; }
  return out;
}
