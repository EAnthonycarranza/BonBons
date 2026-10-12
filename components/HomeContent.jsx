import Link from "next/link";
import Image from "next/image";
import ProductCard from "./ProductCard";
import NewsletterForm from "./NewsletterForm";
import SocialFeedAccordion from "./SocialFeedAccordion";
import BakeryPhotoGallery from "./BakeryPhotoGallery";
import WeeklyBoxTeaser from "./WeeklyBoxTeaser";
import { PageHeading, PageParagraphs, PageLink } from "./PageContentParts";
import { money } from "@/lib/format";
import "./home-content.css";
import { pageText } from "@/lib/page-content";

export default function HomeContent({ content, products, weeklyBox, settings }) {
  const values = { singlePrice: money(settings.singlePopPrice), pairPrice: money(settings.treatPairPrice), mixedPrice: money(settings.fourPackPrice), saving: money(Math.max(0, settings.singlePopPrice * 4 - settings.fourPackPrice)) };
  // Include every type of treat when the menu has it, then fill remaining spots.
  const featuredByCategory = new Map();
  for (const product of products) if (!featuredByCategory.has(product.category)) featuredByCategory.set(product.category, product);
  const featuredSlugs = content.sections.find(section=>section.id === "collection")?.fields.featuredProducts?.split(",").map(slug=>slug.trim()).filter(Boolean) || [];
  const selectedFavorites = featuredSlugs.map(slug=>products.find(product=>product.slug === slug)).filter(Boolean).slice(0,4);
  const favorites = selectedFavorites.length ? selectedFavorites : ["everyday","pretzel-rods","rice-crispy-treats","dipped-oreos","custom"].map(category=>featuredByCategory.get(category)).filter(Boolean).slice(0,4);
  return <>{content.sections.filter(section => section.enabled).map(section => {
    const f = section.fields;
    switch (section.id) {
      case "hero": return <section className="editorial-hero wrap" key={section.id}>
        <div className="editorial-hero-copy rv-anim"><div className="eyebrow lined-label">{f.eyebrow}</div><PageHeading fields={f} level={1}/><PageParagraphs text={f.body} values={values}/><div className="editorial-actions"><PageLink href={f.primaryHref} label={f.primaryLabel} className="btn btn-pink"/><PageLink href={f.secondaryHref} label={f.secondaryLabel} arrow="→"/></div><div className="hero-price-note"><span><b>{values.singlePrice}</b> {f.singleNote}</span><span><b>{values.pairPrice}</b> {f.pairNote}</span></div></div>
        <figure className="editorial-hero-photo rv-anim">{f.image && <div className="hero-photo-arch"><Image src={f.image} alt={f.imageAlt} fill priority sizes="(max-width:760px) 100vw,52vw"/></div>}<figcaption><span>{f.caption}</span><span>{f.captionNote}</span></figcaption><Link href="/build-a-box" className="photo-stamp" aria-label={`Mix four treats for ${values.mixedPrice}`}><small>{f.stampLabel}</small><b>4 for {values.mixedPrice}</b><span aria-hidden="true">↗</span></Link></figure>
      </section>;
      case "notes": return <div className="store-note wrap" key={section.id}>{section.items.map((item,index)=><span key={index}>{pageText(item.text, values)}</span>)}</div>;
      case "weekly": return <WeeklyBoxTeaser key={section.id} box={weeklyBox} products={products} content={f}/>;
      case "collection": return <section className="sec menu-section" key={section.id}><div className="wrap"><div className="sec-top rv-anim"><div><div className="eyebrow">{f.eyebrow}</div><PageHeading fields={f}/></div><PageLink href={f.actionHref} label={f.actionLabel}/></div><div className="grid home-product-grid">{favorites.map(product=><ProductCard key={product.slug} product={product}/>)}</div><p className="collection-note">{pageText(f.note, values)}</p></div></section>;
      case "banner": return f.image ? <section className="wrap flavor-banner rv-anim" key={section.id}>{f.href ? <Link href={f.href}><Image src={f.image} alt={f.imageAlt} width={2172} height={724} sizes="(max-width:760px) 100vw,1264px"/></Link> : <Image src={f.image} alt={f.imageAlt} width={2172} height={724} sizes="100vw"/>}</section> : null;
      case "pair": return <section className="wrap bundle-editorial rv-anim" key={section.id}>{f.image && <div className="bundle-photo"><Image src={f.image} alt={f.imageAlt} fill sizes="(max-width:760px) 100vw,50vw"/></div>}<div className="bundle-copy"><div className="eyebrow">{f.eyebrow}</div><PageHeading fields={f}/><PageParagraphs text={f.body} values={values}/><div className="bundle-price"><b>{values.mixedPrice}</b><span>{f.priceNote}<br/>{pageText(f.savingNote, values)}</span></div><PageLink href={f.actionHref} label={f.actionLabel} className="btn btn-pink"/><small>{pageText(f.note,values)}</small></div></section>;
      case "maker": return <section className="sec" key={section.id}><div className="wrap maker-teaser rv-anim"><figure className="maker-teaser-photo">{f.image && <Image src={f.image} alt={f.imageAlt} width={570} height={696} sizes="(max-width:760px) 90vw,38vw"/>}<figcaption>{f.caption}</figcaption></figure><div className="maker-teaser-copy"><div className="eyebrow">{f.eyebrow}</div><PageHeading fields={f}/><PageParagraphs text={f.body}/><PageLink href={f.actionHref} label={f.actionLabel}/></div></div></section>;
      case "gallery": return <BakeryPhotoGallery key={section.id} content={f} photos={section.items}/>;
      case "pickup": return <section className="pickup-editorial" key={section.id}><div className="wrap"><div className="sec-top rv-anim"><div><div className="eyebrow">{f.eyebrow}</div><PageHeading fields={f}/></div><PageParagraphs text={f.body}/></div><div className="pickup-steps rv-anim">{section.items.map((item,index)=><article key={index}><span>{String(index+1).padStart(2,"0")}</span><h3>{item.heading}</h3><p>{pageText(item.body,values)}</p></article>)}</div></div></section>;
      case "social": return <section className="sec" key={section.id}><div className="wrap"><SocialFeedAccordion content={f}/></div></section>;
      case "newsletter": return <section className="wrap newsletter-editorial rv-anim" key={section.id}><div><div className="eyebrow">{f.eyebrow}</div><PageHeading fields={f}/><PageParagraphs text={f.body}/></div><div className="news"><NewsletterForm/></div></section>;
      default: return null;
    }
  })}</>;
}
