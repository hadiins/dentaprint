import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCategory, getGroup, getProduct, getRelated } from '@/lib/catalog';
import BuyBox from '@/components/product/BuyBox';
import Gallery from '@/components/product/Gallery';
import SelectionProvider from '@/components/product/SelectionContext';
import ProductCard from '@/components/ProductCard';

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const p = await getProduct((await params).slug);
  if (!p) return { title: 'محصول یافت نشد' };
  const img = p.images?.[0];
  return {
    title: p.name, description: `${p.short} — ${p.description}`.slice(0, 160), alternates: { canonical: `/products/${p.slug}` },
    openGraph: img ? { images: [{ url: img.url, alt: img.alt, width: img.width ?? undefined, height: img.height ?? undefined }] } : undefined,
  };
}

export default async function ProductPage({ params }: { params: Params }) {
  const p = await getProduct((await params).slug);
  if (!p) notFound();
  const cat = getCategory(p.category);
  const group = getGroup(cat?.group);
  const related = await getRelated(p);
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'Product', name: p.name, sku: p.sku, description: p.description,
    category: cat?.name, brand: { '@type': 'Brand', name: 'دنتاپرینت' },
    ...(p.images?.length ? { image: p.images.map((i) => new URL(i.url, process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').toString()) } : {}),
    offers: { '@type': 'Offer', priceCurrency: 'IRR', price: p.retailPrice * 10, availability: p.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock' },
  };

  return (
    <main className="page"><div className="wrap">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <nav className="crumbs" aria-label="مسیر"><Link href="/">خانه</Link><span>/</span><Link href="/products">فروشگاه</Link>{group && <><span>/</span><Link href={`/products?group=${group.slug}`}>{group.name}</Link></>}<span>/</span><Link href={`/products?category=${p.category}`}>{cat?.name}</Link></nav>
      <SelectionProvider>
      <div className="pd">
        <Gallery images={p.images ?? []} icon={p.icon} name={p.name} />
        <div className="pd-info">
          <span className="eyebrow">{cat?.name} · کد کالا {p.sku}</span>
          <h1>{p.name}</h1>
          <p className="lead">{p.description}</p>
          <BuyBox p={p} />
          <table className="specs"><tbody>{Object.entries(p.specs).map(([k, v]) => <tr key={k}><td>{k}</td><td>{v}</td></tr>)}</tbody></table>
          {p.irc && <div className="note-box">✅ دارای کد ثبت ادارهٔ کل تجهیزات پزشکی (IRC): <b dir="ltr">{p.irc}</b></div>}
          {p.type === 'RESIN' && <div className="note-box">⚠️ دور از نور مستقیم و در دمای ۱۵ تا ۲۵ درجه نگهداری شود. برگهٔ اطلاعات ایمنی (SDS) و پروفایل چاپ همراه محصول ارسال می‌شود.</div>}
        </div>
      </div>
      </SelectionProvider>
      {related.length > 0 && (
        <section style={{ paddingBottom: 0 }}>
          <div className="head"><div><span className="eyebrow">محصولات مرتبط</span><h2>از همین دسته</h2></div></div>
          <div className="pgrid">{related.map((r) => <ProductCard key={r.slug} p={r} />)}</div>
        </section>
      )}
    </div></main>
  );
}
