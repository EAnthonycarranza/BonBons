import { notFound } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { callBonbonsAdmin } from "@/lib/supabase-data";
import { validatePageContent } from "@/lib/page-content";
import { getProducts } from "@/lib/products";
import { getFeaturedWeeklyBox,getShopSettings } from "@/lib/weekly-box-data";
import BoxBuilder from "@/components/BoxBuilder";
import { callSupabaseData,toProduct } from "@/lib/supabase-data";
import HomeContent from "@/components/HomeContent";
import AboutContent from "@/components/AboutContent";
import "@/components/page-editor.css";

export const dynamic="force-dynamic";
export const metadata={title:"Private page draft preview",robots:{index:false,follow:false}};
export default async function PagePreview({params}) {
  const {slug}=await params;
  if(!["home","about","packs"].includes(slug)||!(await isAdmin()))notFound();
  if(slug==="packs") {
    const {data}=await callSupabaseData("list_products");
    const products=data.map(toProduct).filter(product=>!product.deletedAt);
    return <><div className="page-preview-notice">Private pack preview · Includes hidden products. Customers see only published products.<a href="/admin">Back to the Shop Desk</a></div><section className="light flat sec"><div className="wrap"><h1>Preview your treat packs.</h1><BoxBuilder products={products}/></div></section></>;
  }
  const pages=await callBonbonsAdmin("page_list");
  const page=pages.find(page=>page.slug===slug);
  const content=validatePageContent(slug,page.draft_content);
  const [products,weeklyBox,settings]=await Promise.all([getProducts(),getFeaturedWeeklyBox(),getShopSettings()]);
  return <><div className="page-preview-notice">Private {slug==="home"?"Home":"About"} draft preview · Customers see the published version.<a href="/admin">Back to the Shop Desk</a></div>{slug==="home"?<HomeContent content={content} products={products} weeklyBox={weeklyBox} settings={settings}/>:<AboutContent content={content}/>}</>;
}
