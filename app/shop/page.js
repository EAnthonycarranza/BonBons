import Link from "next/link";
import Image from "next/image";
import { getProducts } from "@/lib/products";
import ProductCard from "@/components/ProductCard";
import { getShopSettings } from "@/lib/weekly-box-data";
import { money } from "@/lib/format";
import { CATEGORY_LABELS } from "@/lib/bundles";
import "./shop.css";

export const dynamic = "force-dynamic";
export async function generateMetadata() {
  const { singlePopPrice, treatPairPrice, fourPackPrice } = await getShopSettings();
  return { title: "Shop handmade treats", description: `Cake pops, pretzel rods, dipped rice crispy treats, and dipped Oreos. Cake pops ${money(singlePopPrice)} each or 2 for ${money(treatPairPrice)}. Mix four treats for ${money(fourPackPrice)}: maximum 1 rice crispy treat and 2 Oreos.` };
}
const CATEGORY_ORDER = ["everyday", "pretzel-rods", "rice-crispy-treats", "dipped-oreos", "custom"];
export default async function ShopPage() {
  const [products, settings] = await Promise.all([getProducts(),getShopSettings()]);
  const singleLabel=money(settings.singlePopPrice),pairLabel=money(settings.treatPairPrice),mixedLabel=money(settings.fourPackPrice);
  const categories=CATEGORY_ORDER.filter(category=>products.some(product=>product.category===category));
  return <section className="sec"><div className="wrap">
    <div className="page-masthead rv-anim"><div><div className="eyebrow">The treat shop</div><h1>A little crunch.<br/>A lot of <em>sweet.</em></h1><p>Cake Pops, Pretzel Rods, Dipped Rice Crispy Treats, and Dipped Oreos. Cake pops are {singleLabel} each or 2 for {pairLabel}. Mix any four treats for {mixedLabel}, with at most 1 rice crispy treat and 2 Oreos per four-pack.</p><Link className="text-link" href="/build-a-box">Mix & match 4 for {mixedLabel} <span aria-hidden="true">↗</span></Link></div><div className="page-masthead-photo"><Image src="/products/bonbons-assortment-styled.webp" alt="Styled assortment of Bon Bon's wrapped cake pops" fill priority sizes="280px"/></div></div>
    <nav className="treat-category-nav" aria-label="Treat categories">{categories.map(category=><a key={category} href={`#${category}`}>{CATEGORY_LABELS[category]}</a>)}</nav>
    {!products.length && <div className="b-card"><h2>The next batch is on its way.</h2><p>Check back for available treats, or contact Bonnie to ask what’s baking.</p></div>}
    {categories.map(category=><section className="treat-category" id={category} key={category} aria-labelledby={`${category}-heading`}><div className="category-heading"><h2 id={`${category}-heading`}>{CATEGORY_LABELS[category]}</h2><span>{["everyday","custom"].includes(category)?`${singleLabel} each · 2 for ${pairLabel} · 4 for ${mixedLabel}`:`Individual prices below · mix & match 4 for ${mixedLabel}`}</span></div><div className="grid live-menu-grid">{products.filter(product=>product.category===category).map(product=><ProductCard key={product.slug} product={product}/>)}</div></section>)}
  </div></section>;
}
