import Image from "next/image";
import { PageHeading, PageParagraphs, PageLink } from "./PageContentParts";

export default function AboutContent({ content }) {
  return <>{content.sections.filter(section=>section.enabled).map(section=>{
    const f=section.fields;
    switch(section.id) {
      case "hero": return <section className="wrap story-hero" key={section.id}><div className="story-hero-copy rv-anim"><div className="eyebrow lined-label">{f.eyebrow}</div><PageHeading fields={f} level={1}/><PageParagraphs text={f.body}/><PageLink href={f.actionHref} label={f.actionLabel} arrow="↓"/></div><figure className="story-portrait rv-anim">{f.image && <Image src={f.image} alt={f.imageAlt} width={570} height={696} priority sizes="(max-width:760px) 100vw,45vw"/>}<figcaption><span>{f.caption}</span><small>{f.captionNote}</small></figcaption></figure></section>;
      case "beginnings": return <section className="sec story-chapter" id="our-story" key={section.id}><div className="wrap story-chapter-grid rv-anim"><div><div className="eyebrow">{f.eyebrow}</div><PageHeading fields={f}/></div><div className="story-prose"><PageParagraphs text={f.body}/></div></div></section>;
      case "faith": return <section className="faith-editorial" key={section.id}><div className="wrap rv-anim"><div className="eyebrow">{f.eyebrow}</div><PageHeading fields={f}/><PageParagraphs text={f.body}/><div className="faith-rule" aria-hidden="true"/></div></section>;
      case "family": return <section className="sec" key={section.id}><div className="wrap story-support rv-anim">{f.image && <div className="story-support-photo"><Image src={f.image} alt={f.imageAlt} fill sizes="(max-width:760px) 100vw,45vw"/></div>}<div><div className="eyebrow">{f.eyebrow}</div><PageHeading fields={f}/><PageParagraphs text={f.body}/><PageLink href={f.actionHref} label={f.actionLabel}/></div></div></section>;
      case "closing": return <section className="wrap closing-note rv-anim" key={section.id}><div className="eyebrow">{f.eyebrow}</div><PageHeading fields={f}/><div className="editorial-actions"><PageLink href={f.primaryHref} label={f.primaryLabel} className="btn btn-pink"/><PageLink href={f.secondaryHref} label={f.secondaryLabel} arrow="→"/></div></section>;
      default:return null;
    }
  })}</>;
}
