'use client';
import { useRouter } from 'next/navigation';

export default function LogoutButton() {
  const router = useRouter();
  return (
    <button className="btn btn-glass" onClick={async () => { await fetch('/api/auth/logout', { method: 'POST' }); router.replace('/'); router.refresh(); }}>
      خروج از حساب
    </button>
  );
}
