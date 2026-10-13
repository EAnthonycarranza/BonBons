import BoxBuilder from "@/components/BoxBuilder";
import { getProducts } from "@/lib/products";
import { getShopSettings } from "@/lib/weekly-box-data";
import { money } from "@/lib/format";
import { MIXED_PACK_RULE } from "@/lib/bundles";
export const metadata={title:"Choose your treat pack",description:`Two cake pops or a mixed four-pack. ${MIXED_PACK_RULE}`};
export const dynamic="force-dynamic";
export default async function BuildABoxPage({searchParams}) {
  const [products,settings,query]=await Promise.all([getProducts(),getShopSettings(),searchParams]);
  const initialOffer=query?.offer==="cakepop"?"cakepop":"mixed";
  return <section className="light flat sec"><div className="wrap"><div className="page-masthead rv-anim"><div><div className="eyebrow">Cake pops: 2 for {money(settings.treatPairPrice)} · Mix four: {money(settings.fourPackPrice)}</div><h1>Your favorites.<br/><em>Your kind of mix.</em></h1><p>Pair two cake pops, or mix four treats from across our menu. {MIXED_PACK_RULE}</p></div></div><BoxBuilder key={initialOffer+products.map(p=>`${p.slug}:${p.stockQuantity}`).join(",")} products={products} initialOffer={initialOffer}/></div></section>;
}
