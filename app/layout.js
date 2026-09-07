import "./globals.css";
import "./storefront.css";
import "./experience.css";
import "./photography.css";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import { CartProvider } from "@/components/CartProvider";
import CartDrawer from "@/components/CartDrawer";
import Toast from "@/components/Toast";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import MobileBar from "@/components/MobileBar";
import Reveal from "@/components/Reveal";
import { IconSprite } from "@/components/Icons";
import { SITE } from "@/lib/sample-data";
import StorefrontOnly from "@/components/StorefrontOnly";

const display = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});
const sans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  ),
  title: {
    default: `${SITE.name} — Cake Pops $4 Each or 4 for $10`,
    template: `%s · ${SITE.name}`,
  },
  description:
    "Hand-rolled, hand-dipped cake pops sold as $4 singles or selected four-packs for $10. Pickup only, with custom and event orders available.",
  icons: {
    icon: "/favicon.png",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: `${SITE.name} — Cake Pops $4 Each or 4 for $10`,
    description: SITE.tagline,
    type: "website",
  },
};

export const viewport = {
  themeColor: "#0A0711",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body>
        <a className="skip" href="#main">
          Skip to main content
        </a>
        <IconSprite />
        <CartProvider>
          <StorefrontOnly><SiteHeader /></StorefrontOnly>
          <main id="main">{children}</main>
          <StorefrontOnly><SiteFooter /><MobileBar /><CartDrawer /><Toast /></StorefrontOnly>
        </CartProvider>
        <Reveal />
      </body>
    </html>
  );
}
