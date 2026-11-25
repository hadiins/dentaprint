import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { sniffDoc, checkDocUpload, docKey, isSafeDocKey, canUploadDoc, canDeleteDoc, verificationAfterReview, downloadName, DOC_LIMITS } from '../src/lib/partners/documents.ts';
import { getPrivateStorage, getMediaStorage } from '../src/lib/media/storage.ts';

const PDF = new Uint8Array([...Buffer.from('%PDF-1.7\n'), ...new Array(20).fill(32)]);
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe1, ...new Array(20).fill(0)]);

test('تشخیص PDF و عکس؛ رد HTML و فایل اجرایی', () => {
  assert.equal(sniffDoc(PDF), 'pdf'); assert.equal(sniffDoc(JPEG), 'jpeg');
  assert.equal(sniffDoc(new TextEncoder().encode('<html><script>alert(1)</script>')), null);
  assert.equal(sniffDoc(new Uint8Array([0x4d, 0x5a, 0x90, 0, 3, 0, 0, 0, 4, 0])), null); // MZ = exe
  assert.equal(sniffDoc(new TextEncoder().encode('PK\u0003\u0004 zip')), null);
});

test('بررسی بارگذاری مدرک: حجم و نوع', () => {
  assert.deepEqual(checkDocUpload('p.pdf', PDF), { ok: true, fileKind: 'pdf' });
  const big = new Uint8Array(DOC_LIMITS.maxBytes + 1); big.set(PDF);
  assert.equal(checkDocUpload('big.pdf', big).ok, false);
  assert.equal(checkDocUpload('x.docx', new TextEncoder().encode('PK\u0003\u0004 docx content')).ok, false);
});

test('کلید مدرک امن و غیرقابل حدس', () => {
  const k = docKey('cmpartner1', 'a'.repeat(24), 'pdf');
  assert.equal(k, `partners/cmpartner1/${'a'.repeat(24)}.pdf`);
  assert.ok(isSafeDocKey(k));
  assert.throws(() => docKey('p', 'short', 'pdf'));
  for (const bad of ['products/a/bbbbbbbbbbbbbbbb.pdf', 'partners/../x/bbbbbbbbbbbbbbbb.pdf', 'partners/a/bbbb.pdf', 'partners/a/bbbbbbbbbbbbbbbb.exe']) assert.equal(isSafeDocKey(bad), false, bad);
});

test('اجازهٔ بارگذاری و حذف', () => {
  assert.equal(canUploadDoc('PENDING', 0), null);
  assert.equal(canUploadDoc('APPROVED', 3), null);
  assert.ok(canUploadDoc('REJECTED', 0));
  assert.ok(canUploadDoc('SUSPENDED', 0));
  assert.ok(canUploadDoc('APPROVED', DOC_LIMITS.maxDocsPerPartner));
  assert.equal(canDeleteDoc('PENDING'), true); assert.equal(canDeleteDoc('ACCEPTED'), false); assert.equal(canDeleteDoc('REJECTED'), false);
});

test('سطح تأیید بعد از بررسی مدارک', () => {
  assert.equal(verificationAfterReview('BASIC', [{ kind: 'LICENSE', status: 'ACCEPTED' }]), 'DOCUMENTS');
  assert.equal(verificationAfterReview('NONE', [{ kind: 'ECONOMIC_CODE', status: 'ACCEPTED' }]), 'DOCUMENTS');
  assert.equal(verificationAfterReview('BASIC', [{ kind: 'NATIONAL_ID', status: 'ACCEPTED' }, { kind: 'WORKSPACE_PHOTO', status: 'ACCEPTED' }]), 'BASIC');
  assert.equal(verificationAfterReview('NONE', [{ kind: 'NATIONAL_ID', status: 'ACCEPTED' }]), 'NONE'); // تأیید پایه فقط با تصمیم مدیر
  assert.equal(verificationAfterReview('DOCUMENTS', [{ kind: 'LICENSE', status: 'REJECTED' }]), 'BASIC');
  assert.equal(verificationAfterReview('BASIC', [{ kind: 'LICENSE', status: 'PENDING' }]), 'BASIC');
});

test('نام فایل دانلود امن', () => {
  assert.equal(downloadName('LICENSE', 'pdf', 'پروانه "لابراتوار"\r\n.pdf'), 'پروانه لابراتوار.pdf');
  assert.equal(downloadName('NATIONAL_ID', 'jpg', null), 'national_id.jpg');
});

test('ذخیره‌ساز خصوصی: پوشهٔ جدا، بدون آدرس عمومی', async () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'dp-priv-'));
  try {
    const s = getPrivateStorage({ PRIVATE_UPLOAD_DIR: dir });
    const key = docKey('p1', 'b'.repeat(20), 'pdf');
    await s.put(key, PDF, 'application/pdf');
    const g = await s.get!(key);
    assert.equal(g?.contentType, 'application/pdf'); assert.equal(g?.data.length, PDF.length);
    assert.throws(() => s.url(key));
    assert.notEqual(path.resolve(dir), path.resolve(process.cwd(), 'uploads'));
    // ذخیره‌ساز عمومی نمی‌تواند فایل خصوصی را بخواند (پوشهٔ متفاوت)
    assert.equal(await getMediaStorage({ UPLOAD_DIR: path.join(dir, 'public') }).get!(key), null);
    assert.throws(() => getPrivateStorage({ MEDIA_STORAGE: 's3', S3_ENDPOINT: 'x' }), /S3_PRIVATE_BUCKET/);
    assert.throws(() => getPrivateStorage({ PRIVATE_UPLOAD_DIR: path.join(dir, 'pub', 'docs'), UPLOAD_DIR: path.join(dir, 'pub') }), /خارج از/);
    assert.throws(() => getPrivateStorage({ PRIVATE_UPLOAD_DIR: path.join(process.cwd(), 'public', 'docs'), UPLOAD_DIR: path.join(dir, 'u') }), /خارج از/);
    assert.throws(() => getPrivateStorage({ PRIVATE_UPLOAD_DIR: path.join(dir, 'u'), UPLOAD_DIR: path.join(dir, 'u') }), /خارج از/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
