'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { CommerceSettings } from '@/lib/commerce-config';
import { activeTiers } from '@/lib/commerce-config';
import type { Viewer } from '@/lib/auth/types';

/* ---------- Toast ---------- */
const ToastCtx = createContext<(msg: string) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

/* ---------- Cart (فعلاً در مرورگر؛ مرحلهٔ بعد در سرور) ---------- */
type CartItems = Record<string, number>;
interface CartApi { items: CartItems; count: number; add: (slug: string, qty: number) => void; setQty: (slug: string, qty: number) => void; clear: () => void }
const CartCtx = createContext<CartApi>({ items: {}, count: 0, add: () => {}, setQty: () => {}, clear: () => {} });
export const useCart = () => useContext(CartCtx);

/* ---------- Price view ----------
 * در نسخهٔ نمایشی، کاربر می‌تواند قیمت سطوح مختلف را ببیند.
 * در نسخهٔ نهایی این مقدار از نشست (session) کاربر واردشده خوانده می‌شود.
 */
export type PriceView = 'retail' | string;
interface PriceApi { view: PriceView; setView: (v: PriceView) => void; /** کاربر نمی‌تواند نوع قیمت را عوض کند */ locked: boolean; /** قیمت از حساب همکار است */ fromAccount: boolean; previewAllowed: boolean }
const PriceCtx = createContext<PriceApi>({ view: 'retail', setView: () => {}, locked: true, fromAccount: false, previewAllowed: false });
/** نوع قیمت مؤثر: همکار واردشده ← سطح خودش؛ حالت نمایشی ← انتخاب کاربر؛ در غیر این صورت مصرف‌کننده */
export const usePriceView = () => useContext(PriceCtx);

const ViewerCtx = createContext<Viewer>({ loggedIn: false, name: null, phone: null, isAdmin: false, partnerTier: null, partnerStatus: null });
export const useViewer = () => useContext(ViewerCtx);

/* ---------- تنظیمات تجاری (سطوح، پله‌ها، ارسال) — از سرور می‌آید ---------- */
const CommerceCtx = createContext<CommerceSettings | null>(null);
export function useCommerce() {
  const s = useContext(CommerceCtx);
  if (!s) throw new Error('useCommerce must be used inside <Providers>');
  return { ...s, active: activeTiers(s) };
}

export default function Providers({ children, commerce, viewer, allowTierPreview }: { children: ReactNode; commerce: CommerceSettings; viewer: Viewer; allowTierPreview: boolean }) {
  const [msg, setMsg] = useState('');
  const [show, setShow] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const toast = useCallback((m: string) => {
    setMsg(m); setShow(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setShow(false), 2200);
  }, []);

  const [items, setItems] = useState<CartItems>({});
  const [view, setViewState] = useState<PriceView>('retail');
  useEffect(() => {
    try {
      setItems(JSON.parse(localStorage.getItem('dp_cart') || '{}'));
      setViewState(localStorage.getItem('dp_price_view') || 'retail');
    } catch { /* ignore */ }
  }, []);
  const persist = (next: CartItems) => { setItems(next); try { localStorage.setItem('dp_cart', JSON.stringify(next)); } catch { /* ignore */ } };
  const add = (slug: string, qty: number) => persist({ ...items, [slug]: (items[slug] || 0) + qty });
  const setQty = (slug: string, qty: number) => { const n = { ...items }; if (qty <= 0) delete n[slug]; else n[slug] = qty; persist(n); };
  const clear = () => persist({});
  const count = Object.values(items).reduce((s, q) => s + q, 0);
  const setView = (v: PriceView) => { setViewState(v); try { localStorage.setItem('dp_price_view', v); } catch { /* ignore */ } };
  const partnerTier = viewer.partnerTier && activeTiers(commerce).some((t) => t.id === viewer.partnerTier) ? viewer.partnerTier : null;
  const price: PriceApi = partnerTier
    ? { view: partnerTier, setView: () => {}, locked: true, fromAccount: true, previewAllowed: false }
    : allowTierPreview
      ? { view, setView, locked: false, fromAccount: false, previewAllowed: true }
      : { view: 'retail', setView: () => {}, locked: true, fromAccount: false, previewAllowed: false };

  return (
    <ToastCtx.Provider value={toast}>
      <CommerceCtx.Provider value={commerce}>
      <CartCtx.Provider value={{ items, count, add, setQty, clear }}>
        <ViewerCtx.Provider value={viewer}>
        <PriceCtx.Provider value={price}>
          {children}
          <div className={`toast${show ? ' show' : ''}`} role="status" aria-live="polite">{msg}</div>
        </PriceCtx.Provider>
        </ViewerCtx.Provider>
      </CartCtx.Provider>
      </CommerceCtx.Provider>
    </ToastCtx.Provider>
  );
}
