import Image from "next/image";
import WeeklyBoxPosterImage from "./WeeklyBoxPosterImage";

/** Give social artwork its own uncropped frame; flavor photos use a mosaic. */
export default function WeeklyBoxArtwork({ box, presentation, priority = false }) {
  const photos = presentation.items.filter(item => item.image).slice(0, 3);
  return (
    <figure className={`weekly-artwork${presentation.boxImage ? " has-poster" : ""}`}>
      {presentation.boxImage ? (
        <a className="weekly-poster-link" href={presentation.boxImage} target="_blank" rel="noopener noreferrer" aria-label={`View the ${box.title} flyer full size (opens in a new tab)`}>
          <div className="weekly-poster-sheet">
            <WeeklyBoxPosterImage src={presentation.boxImage} alt={`${box.title} — this week’s announcement from Bon Bon’s`} priority={priority} />
          </div>
          <span className="weekly-poster-footer"><span>This week at Bon Bon’s</span><span>View full-size flyer <span aria-hidden="true">↗</span></span></span>
        </a>
      ) : photos.length ? (
        <div className={`weekly-photo-mosaic has-${photos.length}`}>
          {photos.map((item, index) => (
            <div className="weekly-photo-cell" key={`${item.slug || item.name}-${index}`}>
              <Image src={item.image} alt={`${item.name} cake pop`} fill priority={priority && index === 0} sizes="(max-width:760px) 60vw, 32vw" />
              <span>{item.name}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="weekly-box-photo weekly-photo-pending">
          <Image src="/logo-transparent.png" alt="Bon Bon’s Sweets & More" width={220} height={220} />
          <p>A little sweetness is on its way.<br />Box photo coming soon.</p>
        </div>
      )}
      {!presentation.boxImage && <figcaption><span>A taste of what’s inside</span></figcaption>}
    </figure>
  );
}
