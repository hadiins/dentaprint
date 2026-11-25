import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { sniffImage, checkUpload, imageKey, isSafeKey, contentTypeOf, MEDIA_LIMITS } from '../src/lib/media/validate.ts';
import { createLocalStorage, getMediaStorage } from '../src/lib/media/storage.ts';
import { imagesForSelection, primaryImage, moveItem, defaultAlt } from '../src/lib/media/gallery.ts';

const pad = (head: number[], n = 32) => new Uint8Array([...head, ...new Array(n).fill(0)]);
const JPEG = pad([0xff, 0xd8, 0xff, 0xe0]);
const PNG = pad([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const WEBP = pad([...Buffer.from('RIFF'), 0, 0, 0, 0, ...Buffer.from('WEBPVP8 ')]);
const AVIF = pad([0, 0, 0, 0x1c, ...Buffer.from('ftypavif')]);

test('تشخیص نوع واقعی فایل از بایت‌های ابتدایی', () => {
  assert.equal(sniffImage(JPEG), 'jpeg'); assert.equal(sniffImage(PNG), 'png');
  assert.equal(sniffImage(WEBP), 'webp'); assert.equal(sniffImage(AVIF), 'avif');
  assert.equal(sniffImage(pad([...Buffer.from('GIF89a')])), null);
  assert.equal(sniffImage(new TextEncoder().encode('<?php system($_GET["c"]); ?>   ')), null);
  assert.equal(sniffImage(pad([...Buffer.from('<svg xmlns=')])), null); // SVG ممکن است اسکریپت داشته باشد
  assert.equal(sniffImage(new Uint8Array([0xff, 0xd8])), null);
});

test('بررسی بارگذاری: حجم، خالی، نوع', () => {
  assert.deepEqual(checkUpload('a.jpg', JPEG), { ok: true, kind: 'jpeg' });
  assert.equal(checkUpload('empty.jpg', new Uint8Array()).ok, false);
  const big = new Uint8Array(MEDIA_LIMITS.maxBytes + 1); big.set([0xff, 0xd8, 0xff]);
  const r = checkUpload('big.jpg', big); assert.ok(!r.ok && r.error.includes('مگابایت'));
  assert.equal(checkUpload('fake.jpg', new TextEncoder().encode('not an image at all')).ok, false);
});

test('کلید امن و جلوگیری از پیمایش مسیر', () => {
  assert.equal(imageKey('ckx123', 'a1b2c3d4e5f6'), 'products/ckx123/a1b2c3d4e5f6.webp');
  assert.equal(imageKey('../../etc', 'a1b2c3d4e5f6'), 'products/etc/a1b2c3d4e5f6.webp');
  assert.throws(() => imageKey('id', 'short'));
  assert.ok(isSafeKey('products/abc/def123.webp'));
  for (const k of ['../secret.webp', 'products/../../x.webp', '/etc/passwd', 'a/b.exe', 'a\\b.webp', 'products/a/.webp', 'products//x.webp']) assert.equal(isSafeKey(k), false, k);
  assert.equal(contentTypeOf('a/b.webp'), 'image/webp'); assert.equal(contentTypeOf('a/b.JPG'), 'image/jpeg');
});

test('ذخیره‌ساز محلی: ذخیره، خواندن، حذف، و رد کلید ناامن', async () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'dp-media-'));
  try {
    const s = createLocalStorage(dir);
    await s.put('products/p1/abcdef123456.webp', WEBP, 'image/webp');
    assert.ok(existsSync(path.join(dir, 'products/p1/abcdef123456.webp')));
    const g = await s.get!('products/p1/abcdef123456.webp');
    assert.equal(g?.contentType, 'image/webp'); assert.equal(g?.data.length, WEBP.length);
    assert.equal(s.url('products/p1/abcdef123456.webp'), '/media/products/p1/abcdef123456.webp');
    assert.equal(await s.get!('products/p1/missing1234.webp'), null);
    await s.delete('products/p1/abcdef123456.webp');
    assert.equal(await s.get!('products/p1/abcdef123456.webp'), null);
    await assert.rejects(() => s.put('../escape.webp', WEBP, 'image/webp'));
    await assert.rejects(() => s.get!('products/../../etc/passwd.webp'));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('انتخاب ذخیره‌ساز از تنظیمات', () => {
  assert.equal(getMediaStorage({}).id, 'local');
  assert.throws(() => getMediaStorage({ MEDIA_STORAGE: 's3', S3_BUCKET: 'b' }), /S3_ENDPOINT/);
  assert.equal(getMediaStorage({ MEDIA_STORAGE: 's3', S3_ENDPOINT: 'https://s3.ir', S3_BUCKET: 'b', S3_ACCESS_KEY: 'k', S3_SECRET_KEY: 's', MEDIA_PUBLIC_URL: 'https://cdn.x.ir/' }).url('products/a/b1234567.webp'), 'https://cdn.x.ir/products/a/b1234567.webp');
});

const IMGS = [
  { url: '/1', alt: 'عمومی ۱' }, { url: '/a2', alt: 'A2', optionValue: 'A2' },
  { url: '/2', alt: 'عمومی ۲' }, { url: '/a3', alt: 'A3', optionValue: 'A3' },
];

test('گالری: عکس رنگ انتخابی اول، رنگ‌های دیگر پنهان، عکس اصلی کارت', () => {
  assert.deepEqual(imagesForSelection(IMGS, 'A2').map((i) => i.url), ['/a2', '/1', '/2']);
  assert.deepEqual(imagesForSelection(IMGS, null).map((i) => i.url), ['/1', '/a2', '/2', '/a3']);
  assert.deepEqual(imagesForSelection(IMGS, 'B1').map((i) => i.url), ['/1', '/2']);
  assert.deepEqual(imagesForSelection([{ url: '/x', alt: '', optionValue: 'A1' }], 'B1').map((i) => i.url), ['/x']);
  assert.equal(primaryImage(IMGS)?.url, '/1');
  assert.equal(primaryImage([{ url: '/c', alt: '', optionValue: 'A1' }])?.url, '/c');
  assert.equal(primaryImage([]), undefined);
});

test('جابه‌جایی عکس و متن جایگزین پیش‌فرض', () => {
  assert.deepEqual(moveItem([1, 2, 3, 4], 3, 0), [4, 1, 2, 3]);
  assert.deepEqual(moveItem([1, 2, 3], 0, 5), [1, 2, 3]);
  assert.equal(defaultAlt('کامپوزیت', 'A2', 1), 'کامپوزیت — رنگ A2 — تصویر 2');
  assert.equal(defaultAlt('کامپوزیت'), 'کامپوزیت');
});
