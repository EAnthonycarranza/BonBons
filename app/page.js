import { getProducts } from "@/lib/products";
import { getFeaturedWeeklyBox, getShopSettings } from "@/lib/weekly-box-data";
import { getPublishedPage } from "@/lib/page-content-data";
import { pageText } from "@/lib/page-content";
import { money } from "@/lib/format";
import HomeContent from "@/components/HomeContent";

export const dynamic = "force-dynamic";
export async function generateMetadata() {
  const [content, settings] = await Promise.all([getPublishedPage("home"),getShopSettings()]);
  return { title: content.title, description: pageText(content.description,{singlePrice:money(settings.singlePopPrice),pairPrice:money(settings.treatPairPrice)}) };
}
export default async function HomePage() {
  const [products, weeklyBox, settings, content] = await Promise.all([getProducts(),getFeaturedWeeklyBox(),getShopSettings(),getPublishedPage("home")]);
  return <HomeContent content={content} products={products} weeklyBox={weeklyBox} settings={settings}/>;
}
