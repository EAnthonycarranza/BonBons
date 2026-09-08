import Link from "next/link";
import Image from "next/image";
import { OCCASIONS } from "@/lib/sample-data";

export const metadata = {
  title: "Occasions",
  description:
    "Custom cake pops for weddings, showers, birthdays, quinces, gifting, and corporate events.",
};

export default function OccasionsPage() {
  return (
    <section className="sec">
      <div className="wrap">
        <div className="sec-top">
          <div>
            <div className="eyebrow">Occasions</div>
            <h1>
              Little pops.
              <br />
              <em>Big occasions.</em>
            </h1>
            <p>
              See how custom cake pops can be flavored, finished, and packaged
              for your kind of celebration.
            </p>
          </div>
        </div>

        <div className="occasion-grid">
          {OCCASIONS.map((o, index) => (
            <Link
              key={o.slug}
              href={`/occasions/${o.slug}`}
              className="occasion-photo-card rv-anim"
            >
              <Image
                src={
                  [
                    "/products/bonbons-assortment-styled.webp",
                    "/products/bonbons-real-party-box.jpg",
                    "/products/bonbons-real-gift-box.jpg",
                    "/products/bonbons-colorful-pops-styled.webp",
                  ][index % 4]
                }
                alt=""
                fill
                sizes="(max-width:760px) 100vw, 50vw"
              />
              <div>
                <h2>{o.title}</h2>
                <p>{o.short}</p>
                <span className="text-link">
                  Make it special <span aria-hidden="true">↗</span>
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
