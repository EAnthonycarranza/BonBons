import BoxBuilder from "@/components/BoxBuilder";
import { getProducts } from "@/lib/products";
import { getShopSettings } from "@/lib/weekly-box-data";
import { money } from "@/lib/format";
export const metadata={title:"Choose your treat pack",description:"Two cake pops or a mixed four-pack. Maximum one rice crispy treat and two Oreos per mixed pack."};
export const dynamic="force-dynamic";
export default async function BuildABoxPage({searchParams}) {
  const [products,settings,query]=await Promise.all([getProducts(),getShopSettings(),searchParams]);
  const initialOffer=query?.offer==="cakepop"?"cakepop":"mixed";
  return <section className="light flat sec"><div className="wrap"><div className="page-masthead rv-anim"><div><div className="eyebrow">Cake pops: 2 for {money(settings.treatPairPrice)} · Mix four: {money(settings.fourPackPrice)}</div><h1>Your favorites.<br/><em>Your kind of mix.</em></h1><p>Pair two cake pops, or mix four treats from across our menu. Each mixed four-pack can include at most one rice crispy treat and two Oreos.</p></div></div><BoxBuilder key={initialOffer+products.map(p=>`${p.slug}:${p.stockQuantity}`).join(",")} products={products} initialOffer={initialOffer}/></div></section>;
}
