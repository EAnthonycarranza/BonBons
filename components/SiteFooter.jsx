import Link from "next/link";
import Image from "next/image";
import { Icon } from "./Icons";
import { SITE } from "@/lib/sample-data";

export default function SiteFooter() {
  return (
    <footer className="foot">
      <div className="wrap">
        <div className="foot-grid">
          <div className="brandcol">
            <Image src="/logo-transparent.png" alt={SITE.name} width={200} height={200} style={{ height: 88, width: "auto" }} />
            <div className="tag">{SITE.tagline}</div>
            <div className="socials">
              <a href="#" aria-label="Instagram"><Icon name="i-ig" /></a>
              <a href="#" aria-label="Facebook"><Icon name="i-fb" /></a>
              <a href="#" aria-label="TikTok"><Icon name="i-tt" /></a>
            </div>
          </div>

          <div>
            <h4>Shop</h4>
            <ul>
              <li><Link href="/shop">All treats</Link></li>
              <li><Link href="/build-a-box">Build a box</Link></li>
              <li><Link href="/shop/party-favors">Party favors</Link></li>
              <li><Link href="/quote">Gift cards</Link></li>
            </ul>
          </div>

          <div>
            <h4>Services</h4>
            <ul>
              <li><Link href="/dessert-tables">Dessert tables</Link></li>
              <li><Link href="/occasions/weddings-showers">Weddings</Link></li>
              <li><Link href="/occasions/corporate">Corporate</Link></li>
              <li><Link href="/faq">Delivery areas</Link></li>
            </ul>
          </div>

          <div>
            <h4>Pickup &amp; Delivery</h4>
            <ul>
              <li>{SITE.hours}</li>
              <li>Local delivery available</li>
              <li><a href={SITE.phoneHref}>{SITE.phone}</a></li>
              <li><a href={`mailto:${SITE.email}`}>{SITE.email}</a></li>
            </ul>
            <div className="pay">
              <span>VISA</span><span>MC</span><span>AMEX</span><span>APPLE PAY</span>
            </div>
          </div>
        </div>

        <div className="foot-bot">
          <span>© {new Date().getFullYear()} {SITE.name}</span>
          <span><Link href="/admin">Staff login</Link></span>
        </div>
      </div>
    </footer>
  );
}
