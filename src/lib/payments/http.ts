import type { FetchLike } from './types.ts';

export async function postJson<T = unknown>(f: FetchLike, url: string, body: unknown, timeoutMs = 15000): Promise<{ status: number; data: T | null }> {
  const res = await f(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  let data: T | null = null;
  try { data = (await res.json()) as T; } catch { /* پاسخ غیر JSON */ }
  return { status: res.status, data };
}

export const errMsg = (e: unknown) => (e instanceof Error ? (e.name === 'TimeoutError' ? 'پاسخی از درگاه دریافت نشد (اتمام زمان).' : e.message) : 'خطای ناشناخته در ارتباط با درگاه');
