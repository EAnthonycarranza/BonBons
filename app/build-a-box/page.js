import BoxBuilder from "@/components/BoxBuilder";
import { getProducts } from "@/lib/products";
import { getShopSettings } from "@/lib/weekly-box-data";
import { money } from "@/lib/format";

export const metadata={title:"Mix & match two treats",description:"Choose any two available flavors across cake pops, pretzel rods, rice crispy treats, and dipped Oreos."};
export const dynamic="force-dynamic";
export default async function BuildABoxPage() {
  const [all,settings]=await Promise.all([getProducts(),getShopSettings()]);
  const products=all;
  return <section className="light flat sec"><div className="wrap"><div className="page-masthead rv-anim"><div><div className="eyebrow">Any 2 flavors for {money(settings.treatPairPrice)}</div><h1>Two little treats.<br/><em>Made your way.</em></h1><p>Mix Cake Pops, Pretzel Rods, Dipped Rice Crispy Treats, and Dipped Oreos. Pick two of the same favorite, or try a little of each. Every available flavor can go in your two-treat mix.</p></div></div><BoxBuilder key={products.map(product=>`${product.slug}:${product.stockQuantity}`).join(",")} products={products}/></div></section>;
}
