import Link from "next/link";
import { getShopSettings } from "@/lib/weekly-box-data";
import { money } from "@/lib/format";
import Image from "next/image";
import { Icon } from "./Icons";
import { SITE } from "@/lib/sample-data";

export default async function SiteFooter() {
  const { singlePopPrice, fourPackPrice } = await getShopSettings();
  const singleLabel = money(singlePopPrice);
  const packLabel = money(fourPackPrice);

  return (
    <footer className="foot">
      <div className="wrap">
        <div className="foot-grid">
          <div className="brandcol">
            <Image
              src="/logo-transparent.png"
              alt={SITE.name}
              width={200}
              height={200}
              style={{ height: 88, width: "auto" }}
            />
            <div className="tag">{SITE.tagline}</div>
            <p>
              Handmade in San Antonio, with a little faith and a whole lot of
              love.
            </p>
            <div className="socials">
              <a
                href={SITE.instagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Follow ${SITE.name} on Instagram`}
              >
                <Icon name="i-ig" />
              </a>
              <a
                href={SITE.facebook}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Follow ${SITE.name} on Facebook`}
              >
                <Icon name="i-fb" />
              </a>
              <a
                href={SITE.tiktok}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Follow ${SITE.name} on TikTok`}
              >
                <Icon name="i-tt" />
              </a>
            </div>
            <div
              className="footer-social-names"
              aria-label="Social media profiles"
            >
              <a
                href={SITE.instagram}
                target="_blank"
                rel="noopener noreferrer"
              >
                Instagram
              </a>
              <span aria-hidden="true">·</span>
              <a href={SITE.facebook} target="_blank" rel="noopener noreferrer">
                Facebook
              </a>
              <span aria-hidden="true">·</span>
              <a href={SITE.tiktok} target="_blank" rel="noopener noreferrer">
                TikTok
              </a>
            </div>
          </div>

          <div>
            <h4>Cake Pops</h4>
            <ul>
              <li>
                <Link href="/shop">Shop all cake pops</Link>
              </li>
              <li>
                <Link href="/shop">Singles · {singleLabel} each</Link>
              </li>
              <li>
                <Link href="/build-a-box">Build a four-pack · {packLabel}</Link>
              </li>
              <li>
                <Link href="/shop">
                  Current flavors
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4>Custom &amp; Events</h4>
            <ul>
              <li>
                <Link href="/quote">Tell us what you need</Link>
              </li>
              <li>
                <Link href="/quote">
                  Custom color cake pops
                </Link>
              </li>
              <li>
                <Link href="/occasions">Event cake pop ideas</Link>
              </li>
              <li>
                <Link href="/faq">Ordering &amp; lead times</Link>
              </li>
            </ul>
          </div>

          <div>
            <h4>Pickup &amp; Payment</h4>
            <ul>
              <li>San Antonio · by appointment</li>
              <li>Pickup only—no delivery</li>
              <li><a href={SITE.paymentUrl} target="_blank" rel="noopener noreferrer">Payment options ↗</a></li>
              <li><a href={SITE.phoneHref}>{SITE.phone}</a></li>
              <li><a href={`mailto:${SITE.email}`}>{SITE.email}</a></li>
              <li>
                <Link href="/faq">How pickup works →</Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="foot-bot">
          <span>
            © {new Date().getFullYear()} {SITE.name}
          </span>
          <span>Made with care. Shared with love.</span>
          <span>
            <Link href="/admin">Staff login</Link>
          </span>
        </div>

        <div className="foot-credit">
          <a
            className="credit-btn"
            href="https://codingcarranza.com/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="credit-btn-mark" aria-hidden="true">
              <svg
                viewBox="0 0 24 24"
                width="13"
                height="13"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="8 6 3 12 8 18" />
                <polyline points="16 6 21 12 16 18" />
              </svg>
            </span>
            <span className="credit-btn-text">
              Website created by <strong>Coding Carranza</strong>
            </span>
            <span className="credit-btn-arrow" aria-hidden="true">
              &#8599;
            </span>
          </a>
        </div>
      </div>
    </footer>
  );
}
