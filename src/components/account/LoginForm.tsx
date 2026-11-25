'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { fa, normalizeIranMobile, toEnDigits } from '@/lib/format';

type Step = 'phone' | 'code' | 'name';

export default function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);
  useEffect(() => { if (step === 'code') codeRef.current?.focus(); }, [step]);

  async function post(url: string, body: unknown) {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const d = await r.json().catch(() => ({}));
    return { ok: r.ok, d };
  }

  async function sendCode(e?: FormEvent) {
    e?.preventDefault();
    const p = normalizeIranMobile(phone);
    if (!p) return setErr('شمارهٔ موبایل معتبر نیست (مثال: 09121234567).');
    setErr(''); setBusy(true);
    const { ok, d } = await post('/api/auth/otp/request', { phone: p });
    setBusy(false);
    if (!ok) { setErr(d.error ?? 'خطا در ارسال کد'); if (d.retryAfter) { setResendIn(d.retryAfter); setStep('code'); } return; }
    setPhone(p); setCode(''); setResendIn(d.resendIn ?? 90); setStep('code');
  }

  async function verify(e?: FormEvent, value = code) {
    e?.preventDefault();
    const c = toEnDigits(value);
    if (c.length !== 5) return setErr('کد ۵ رقمی را وارد کنید.');
    setErr(''); setBusy(true);
    const { ok, d } = await post('/api/auth/otp/verify', { phone, code: c });
    setBusy(false);
    if (!ok) { setErr(d.error ?? 'کد نادرست است'); return; }
    if (d.needsName) { setStep('name'); return; }
    router.replace(next); router.refresh();
  }

  async function saveName(e: FormEvent) {
    e.preventDefault();
    if (name.trim().length < 3) return setErr('نام را کامل وارد کنید.');
    setBusy(true);
    const { ok, d } = await post('/api/account/profile', { fullName: name.trim() });
    setBusy(false);
    if (!ok) return setErr(d.error ?? 'خطا');
    router.replace(next); router.refresh();
  }

  return (
    <div className="bform" style={{ position: 'static' }}>
      <div style={{ textAlign: 'center', fontSize: 46 }}>🦷</div>
      {step === 'phone' && (
        <form onSubmit={sendCode} style={{ display: 'grid', gap: 12 }} noValidate>
          <h3>ورود / ثبت‌نام</h3>
          <p>شمارهٔ موبایل خود را وارد کنید؛ کد تأیید برایتان پیامک می‌شود.</p>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="۰۹۱۲۱۲۳۴۵۶۷" inputMode="tel" autoComplete="tel" dir="ltr" style={{ textAlign: 'center', fontSize: 18 }} autoFocus />
          <div className="err" role="alert">{err}</div>
          <button className="btn btn-main" disabled={busy} style={{ justifyContent: 'center' }}>{busy ? 'در حال ارسال…' : 'دریافت کد'} <span className="arr">←</span></button>
          <small style={{ color: 'var(--muted)', fontSize: 12 }}>ورود شما به معنی پذیرش قوانین و حریم خصوصی دنتاپرینت است.</small>
        </form>
      )}
      {step === 'code' && (
        <form onSubmit={verify} style={{ display: 'grid', gap: 12 }} noValidate>
          <h3>کد تأیید</h3>
          <p>کد ۵ رقمی به <b dir="ltr">{phone}</b> ارسال شد. <button type="button" className="link" onClick={() => { setStep('phone'); setErr(''); }}>تغییر شماره</button></p>
          <input ref={codeRef} value={code} inputMode="numeric" autoComplete="one-time-code" maxLength={5} dir="ltr" placeholder="- - - - -"
            className="otp-input" aria-label="کد تأیید"
            onChange={(e) => { const v = toEnDigits(e.target.value).replace(/\D/g, '').slice(0, 5); setCode(v); if (v.length === 5) verify(undefined, v); }} />
          <div className="err" role="alert">{err}</div>
          <button className="btn btn-main" disabled={busy} style={{ justifyContent: 'center' }}>{busy ? 'در حال بررسی…' : 'ورود'} <span className="arr">←</span></button>
          <button type="button" className="btn btn-glass" disabled={busy || resendIn > 0} onClick={() => sendCode()} style={{ justifyContent: 'center' }}>
            {resendIn > 0 ? `ارسال دوباره تا ${fa(resendIn)} ثانیهٔ دیگر` : 'ارسال دوبارهٔ کد'}
          </button>
        </form>
      )}
      {step === 'name' && (
        <form onSubmit={saveName} style={{ display: 'grid', gap: 12 }} noValidate>
          <h3>خوش آمدید! 👋</h3>
          <p>برای تکمیل ثبت‌نام، نام خود را وارد کنید.</p>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="نام و نام خانوادگی" autoComplete="name" autoFocus />
          <div className="err" role="alert">{err}</div>
          <button className="btn btn-main" disabled={busy} style={{ justifyContent: 'center' }}>ادامه <span className="arr">←</span></button>
          <button type="button" className="link" onClick={() => { router.replace(next); router.refresh(); }}>بعداً</button>
        </form>
      )}
    </div>
  );
}
