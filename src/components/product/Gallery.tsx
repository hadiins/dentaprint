'use client';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { imagesForSelection, type ProductImage } from '@/lib/media/gallery';
import { useSelection } from './SelectionContext';

export default function Gallery({ images, icon, name }: { images: ProductImage[]; icon: string; name: string }) {
  const { selected } = useSelection();
  const list = imagesForSelection(images, selected[0]);
  const [i, setI] = useState(0);
  const [zoom, setZoom] = useState(false);
  useEffect(() => setI(0), [selected[0]]); // با تغییر رنگ، عکس همان رنگ نمایش داده شود
  useEffect(() => {
    if (!zoom) return;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setZoom(false); if (e.key === 'ArrowLeft') setI((x) => (x + 1) % list.length); if (e.key === 'ArrowRight') setI((x) => (x - 1 + list.length) % list.length); };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, [zoom, list.length]);

  if (list.length === 0) return <div className="pd-media" aria-hidden>{icon}</div>;
  const cur = list[Math.min(i, list.length - 1)];
  return (
    <div className="gallery">
      <button type="button" className="pd-media has-img" onClick={() => setZoom(true)} aria-label="بزرگ‌نمایی تصویر">
        <Image src={cur.url} alt={cur.alt || name} fill priority sizes="(max-width: 900px) 100vw, 600px" style={{ objectFit: 'contain' }} />
        {cur.optionValue && <span className="img-tag">رنگ {cur.optionValue}</span>}
      </button>
      {list.length > 1 && (
        <div className="thumbs" role="tablist" aria-label="تصاویر محصول">
          {list.map((im, j) => (
            <button key={im.url} type="button" role="tab" aria-selected={j === i} className={`thumb${j === i ? ' on' : ''}`} onClick={() => setI(j)}>
              <Image src={im.url} alt="" fill sizes="80px" style={{ objectFit: 'cover' }} />
            </button>
          ))}
        </div>
      )}
      {zoom && (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label={name} onClick={() => setZoom(false)}>
          <Image src={cur.url} alt={cur.alt || name} fill sizes="100vw" style={{ objectFit: 'contain' }} />
          <button type="button" className="x-btn" aria-label="بستن" onClick={() => setZoom(false)}>✕</button>
        </div>
      )}
    </div>
  );
}
