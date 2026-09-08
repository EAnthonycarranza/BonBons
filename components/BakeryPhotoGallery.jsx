import Image from "next/image";

// `styled` marks a commissioned photo rather than one of Bonnie's own, so the
// gallery can label it. The section heading must not claim otherwise.
const photos = [
  { src: "/products/bonbons-variety-styled.webp", width: 1536, height: 1024, alt: "Styled image of pink sprinkle, Biscoff crumb, strawberry, chocolate candy, and cookies-and-cream cake pops in clear wrappers", caption: "A little of everything", note: "Hand-finished, one pop at a time", styled: true },
  { src: "/products/bonbons-real-gift-box.jpg", width: 729, height: 570, alt: "Six individually wrapped Bon Bon’s cake pops arranged in a gift box with blue paper filling", caption: "Packed with care", note: "A peek at a past bakery box" },
  { src: "/products/bonbons-colorful-pops-styled.webp", width: 1448, height: 1086, alt: "Styled image of an assortment of Bon Bon’s pink, purple, cream, and chocolate cake pops with colorful toppings", caption: "Every batch has personality", note: "Colors, crumbs, and all the little details", styled: true },
];

export default function BakeryPhotoGallery() {
  return (
    <section className="sec bakery-gallery" id="from-the-kitchen" aria-labelledby="bakery-gallery-title">
      <div className="wrap">
        <div className="sec-top rv-anim">
          <div>
            <div className="eyebrow">Our cake pops</div>
            <h2 id="bakery-gallery-title">Straight from <em>our kitchen.</em></h2>
          </div>
          <p>The cake pops, the finishing touches, the boxes ready to go. A few sweet moments from Bon Bon’s.</p>
        </div>
        <div className="bakery-photo-grid">
          {photos.map((photo) => (
            <figure className="bakery-photo rv-anim" key={photo.src}>
              <a href={photo.src} target="_blank" rel="noopener noreferrer" aria-label={`View full photo: ${photo.caption}`}>
                <Image src={photo.src} alt={photo.alt} width={photo.width} height={photo.height} sizes="(max-width:760px) 85vw, 33vw" />
                {photo.styled && <span className="styled-photo-label bakery-styled-label">Styled photo</span>}
                <span className="photo-enlarge" aria-hidden="true">↗</span>
              </a>
              <figcaption><b>{photo.caption}</b><span>{photo.note}</span></figcaption>
            </figure>
          ))}
        </div>
        <p className="bakery-gallery-note">Photos show past batches and packaging; the ones marked “Styled photo” are styled images based on Bon Bon’s own. Available flavors are listed in the menu; your four-pack contains four cake pops.</p>
      </div>
    </section>
  );
}
