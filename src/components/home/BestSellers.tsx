'use client';
import { useRef } from 'react';
import type { Product } from '@/lib/catalog-meta';
import ProductCard from '../ProductCard';
import PriceSwitch from '../PriceSwitch';

export default function BestSellers({ products }: { products: Product[] }) {
  const slider = useRef<HTMLDivElement>(null);
  // در چیدمان راست‌به‌چپ، حرکت به جلو یعنی اسکرول به سمت چپ (مقدار منفی)
  const go = (dir: 1 | -1) => slider.current?.scrollBy({ left: -320 * dir, behavior: 'smooth' });
  return (
    <section id="best" style={{ paddingTop: 0 }}><div className="wrap">
      <div className="head rv">
        <div><span className="eyebrow">پرفروش‌های این ماه</span><h2>انتخاب لابراتوارها</h2></div>
        <div className="head-act">
          <PriceSwitch />
          <div className="arrows">
            <button className="icon-btn" aria-label="قبلی" onClick={() => go(-1)}>→</button>
            <button className="icon-btn" aria-label="بعدی" onClick={() => go(1)}>←</button>
          </div>
        </div>
      </div>
      <div className="slider rv" ref={slider}>{products.map((p) => <ProductCard key={p.slug} p={p} />)}</div>
    </div></section>
  );
}
