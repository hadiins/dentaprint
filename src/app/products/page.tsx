import type { Metadata } from 'next';
import Link from 'next/link';
import { CATEGORY_GROUPS, TYPE_LABELS, categoriesOf, getCategory, getGroup, getProducts, type ProductType, type SortKey } from '@/lib/catalog';
import ProductCard from '@/components/ProductCard';
import PriceSwitch from '@/components/PriceSwitch';
import { fa } from '@/lib/format';

export const metadata: Metadata = { title: 'فروشگاه', description: 'خرید رزین چاپگر سه‌بعدی، دندان مصنوعی، آکریل، کامپوزیت، باندینگ و تجهیزات لابراتوار و کلینیک دندانپزشکی' };

type SP = Promise<{ [k: string]: string | string[] | undefined }>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const TYPES = TYPE_LABELS;

export default async function ProductsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const category = getCategory(one(sp.category))?.slug;
  const group = category ? getCategory(category)!.group : getGroup(one(sp.group))?.slug;
  const typeRaw = one(sp.type);
  const type = typeRaw && typeRaw in TYPES ? (typeRaw as ProductType) : undefined;
  const q = one(sp.q) ?? '';
  const sortRaw = one(sp.sort);
  const sort: SortKey = sortRaw === 'cheap' || sortRaw === 'expensive' || sortRaw === 'discount' ? sortRaw : 'popular';
  const inStock = one(sp.stock) === '1';
  const products = await getProducts({ category, group, type, q, sort, inStock });
  const title = category ? getCategory(category)!.name : group ? getGroup(group)!.name : type ? TYPES[type] : 'همهٔ محصولات';

  const href = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { category, group: category ? undefined : group, type, q: q || undefined, sort: sort !== 'popular' ? sort : undefined, stock: inStock ? '1' : undefined, ...patch };
    Object.entries(merged).forEach(([k, v]) => { if (v) p.set(k, v); });
    const s = p.toString();
    return s ? `/products?${s}` : '/products';
  };

  return (
    <main className="page"><div className="wrap">
      <nav className="crumbs" aria-label="مسیر"><Link href="/">خانه</Link><span>/</span><Link href="/products">فروشگاه</Link>{group && <><span>/</span><Link href={`/products?group=${group}`}>{getGroup(group)!.name}</Link></>}{category && <><span>/</span><span>{title}</span></>}{!group && type && <><span>/</span><span>{title}</span></>}</nav>
      <div className="page-head">
        <div><span className="eyebrow">فروشگاه</span><h1>{title}</h1><p style={{ color: 'var(--muted)' }}>{fa(products.length)} محصول</p></div>
        <PriceSwitch />
      </div>

      <div className="chips">
        <Link href={href({ category: undefined, group: undefined, type: undefined })} className={!category && !group && !type ? 'on' : ''}>همه</Link>
        {CATEGORY_GROUPS.map((g) => <Link key={g.slug} href={href({ group: g.slug, category: undefined, type: undefined })} className={group === g.slug && !category ? 'on' : ''}>{g.icon} {g.name}</Link>)}
      </div>
      {group && (
        <div className="chips sub">
          {categoriesOf(group).map((c) => <Link key={c.slug} href={href({ category: c.slug, group: undefined, type: undefined })} className={category === c.slug ? 'on' : ''}>{c.icon} {c.name}</Link>)}
        </div>
      )}

      <form className="filterbar" action="/products" method="get">
        {category && <input type="hidden" name="category" value={category} />}
        {!category && group && <input type="hidden" name="group" value={group} />}
        {type && <input type="hidden" name="type" value={type} />}
        <input type="search" name="q" defaultValue={q} placeholder="جستجو: رزین مدل، گاید، کیورینگ…" aria-label="جستجو" />
        <select name="sort" defaultValue={sort} aria-label="مرتب‌سازی">
          <option value="popular">محبوب‌ترین</option><option value="cheap">ارزان‌ترین</option>
          <option value="expensive">گران‌ترین</option><option value="discount">بیشترین تخفیف</option>
        </select>
        <label><input type="checkbox" name="stock" value="1" defaultChecked={inStock} /> فقط موجود</label>
        <button className="btn btn-main" style={{ padding: '10px 22px' }}>اعمال</button>
      </form>

      {products.length
        ? <div className="pgrid">{products.map((p) => <ProductCard key={p.slug} p={p} />)}</div>
        : <div className="empty">محصولی با این مشخصات پیدا نشد. <Link href="/products" style={{ color: 'var(--c1)' }}>حذف فیلترها</Link></div>}
    </div></main>
  );
}
