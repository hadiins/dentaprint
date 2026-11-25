export type Role = 'CUSTOMER' | 'PARTNER' | 'ADMIN';
export type PartnerStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
export type VerificationLevel = 'NONE' | 'BASIC' | 'DOCUMENTS';

export interface PartnerInfo {
  orgName: string;
  status: PartnerStatus;
  verification: VerificationLevel;
  tierSlug: string | null;
  tierLocked: boolean;
}

export interface AuthUser { id: string; phone: string; fullName: string | null; role: Role; partner: PartnerInfo | null }

export interface OtpRecord { id: string; phone: string; codeHash: string; expiresAt: number; attempts: number; consumedAt: number | null; createdAt: number }

/** ذخیره‌سازی ورود؛ دو پیاده‌سازی: حافظه (توسعه/تست) و Prisma */
export interface AuthRepo {
  createOtp(i: { phone: string; codeHash: string; expiresAt: number; ip: string | null; now: number }): Promise<void>;
  latestOtp(phone: string): Promise<OtpRecord | null>;
  countOtpsSince(where: { phone?: string; ip?: string }, since: number): Promise<number>;
  incrementOtpAttempts(id: string): Promise<void>;
  /** اتمی: فقط اگر قبلاً مصرف نشده باشد true */
  consumeOtp(id: string, now: number): Promise<boolean>;
  findOrCreateUser(phone: string, opts?: { makeAdmin?: boolean }): Promise<AuthUser>;
  createSession(i: { tokenHash: string; userId: string; expiresAt: number; ip: string | null; userAgent: string | null }): Promise<void>;
  getSessionUser(tokenHash: string, now: number): Promise<AuthUser | null>;
  deleteSession(tokenHash: string): Promise<void>;
  updateProfile(userId: string, data: { fullName?: string }): Promise<void>;
}

/** اطلاعات قابل نمایش کاربر برای مرورگر (بدون داده‌های حساس) */
export interface Viewer { loggedIn: boolean; name: string | null; phone: string | null; isAdmin: boolean; partnerTier: string | null; partnerStatus: string | null }
