/** ذخیره‌سازی در حافظه — برای توسعه بدون پایگاه داده و تست‌ها (با ری‌استارت سرور پاک می‌شود) */
import { PAID_STATUSES, type CommerceRepo, type Customer, type OrderRecord, type PaymentRecord } from './repo.ts';
import { newOrderNumber, type OrderDraft } from '../orders.ts';

export class MemoryRepo implements CommerceRepo {
  orders = new Map<string, OrderRecord & { draft: OrderDraft; customer: Customer; accountPhone: string; createdAt: number; paidAt?: number }>();
  payments = new Map<string, PaymentRecord & { raw?: unknown; cardPan?: string }>();
  private seq = 0;

  async createOrder(draft: OrderDraft, customer: Customer, accountPhone?: string) {
    const id = `o${++this.seq}`;
    const phone = accountPhone ?? customer.phone;
    const rec = { id, number: newOrderNumber(), status: 'PENDING_PAYMENT' as OrderRecord['status'], total: draft.total, customerPhone: phone, draft, customer, accountPhone: phone, createdAt: Date.now() };
    this.orders.set(id, rec);
    return this.pickOrder(rec);
  }
  private pickOrder(o: OrderRecord): OrderRecord { return { id: o.id, number: o.number, status: o.status, total: o.total, customerPhone: o.customerPhone, createdAt: o.createdAt }; }
  async listOrdersByAccount(phone: string, limit = 20) {
    return [...this.orders.values()].filter((o) => o.accountPhone === phone).sort((a, b) => b.createdAt - a.createdAt).slice(0, limit).map((o) => this.pickOrder(o));
  }
  async paidSpendByAccount(phone: string, since: number) {
    return [...this.orders.values()].filter((o) => o.accountPhone === phone && PAID_STATUSES.includes(o.status) && (o.paidAt ?? 0) >= since).reduce((s, o) => s + o.draft.subtotal, 0);
  }
  async getOrder(id: string) { const o = this.orders.get(id); return o ? this.pickOrder(o) : null; }
  async getOrderByNumber(n: string) { for (const o of this.orders.values()) if (o.number === n) return this.pickOrder(o); return null; }
  async createPayment(i: { orderId: string; gateway: string; amount: number }) {
    const p: PaymentRecord = { id: `p${++this.seq}`, orderId: i.orderId, gateway: i.gateway, amount: i.amount, status: 'INITIATED', token: null };
    this.payments.set(p.id, p); return { ...p };
  }
  async attachToken(id: string, token: string, raw?: unknown) { const p = this.payments.get(id); if (p) { p.token = token; p.raw = raw; } }
  async findPayment(gateway: string, token: string) {
    for (const p of this.payments.values()) if (p.gateway === gateway && p.token === token) return { ...p };
    return null;
  }
  async failPayment(id: string, status: 'FAILED' | 'CANCELLED', raw?: unknown) {
    const p = this.payments.get(id); if (p && p.status === 'INITIATED') { p.status = status; p.raw = raw; }
  }
  async completePayment(id: string, r: { refId: string; cardPan?: string; raw?: unknown }) {
    const p = this.payments.get(id);
    if (!p || p.status !== 'INITIATED') return false;
    p.status = 'SUCCEEDED'; p.refId = r.refId; p.cardPan = r.cardPan; p.raw = r.raw;
    const o = this.orders.get(p.orderId); if (o) { o.status = 'PAID'; o.paidAt = Date.now(); }
    return true;
  }
}
