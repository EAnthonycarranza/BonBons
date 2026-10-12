import Image from "next/image";
import { PAGE_DEFAULTS } from "@/lib/page-content";
import { PageHeading } from "./PageContentParts";

const defaultSection=PAGE_DEFAULTS.home.sections.find(section=>section.id==="gallery");
export default function BakeryPhotoGallery({content=defaultSection.fields,photos=defaultSection.items}) {
  return <section className="sec bakery-gallery" id="from-the-kitchen" aria-labelledby="bakery-gallery-title"><div className="wrap"><div className="sec-top rv-anim"><div><div className="eyebrow">{content.eyebrow}</div><div id="bakery-gallery-title"><PageHeading fields={content}/></div></div><p>{content.body}</p></div><div className="bakery-photo-grid">{photos.filter(photo=>photo.image).map((photo,index)=><figure className="bakery-photo rv-anim" key={index}><a href={photo.image} target="_blank" rel="noopener noreferrer" aria-label={`View full photo: ${photo.caption}`}><Image src={photo.image} alt={photo.imageAlt} width={1200} height={900} sizes="(max-width:760px) 85vw,33vw"/><span className="photo-enlarge" aria-hidden="true">↗</span></a><figcaption><b>{photo.caption}</b><span>{photo.note}</span></figcaption></figure>)}</div><p className="bakery-gallery-note">{content.note}</p></div></section>;
}
