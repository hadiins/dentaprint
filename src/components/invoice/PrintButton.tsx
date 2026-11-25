'use client';
export default function PrintButton() {
  return <button className="btn btn-main" onClick={() => window.print()}>🖨️ چاپ / ذخیره به‌صورت PDF</button>;
}
