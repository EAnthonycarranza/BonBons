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
import { PricesProvider } from "@/components/PricesProvider";
import { getShopSettings } from "@/lib/weekly-box-data";
import { money } from "@/lib/format";
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

export async function generateMetadata() {
  // The headline prices come from the shop settings so the title and
  // description cannot drift from what the shop actually charges.
  const { singlePopPrice, fourPackPrice } = await getShopSettings();
  const headline = `${SITE.name} — Cake Pops ${money(singlePopPrice)} Each or 4 for ${money(fourPackPrice)}`;
  return {
    metadataBase: new URL(
      process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
    ),
    title: { default: headline, template: `%s · ${SITE.name}` },
    description:
      `Hand-rolled, hand-dipped cake pops sold as ${money(singlePopPrice)} singles or selected four-packs for ${money(fourPackPrice)}. Pickup only, with custom and event orders available.`,
    icons: { icon: "/favicon.png", apple: "/apple-touch-icon.png" },
    openGraph: { title: headline, description: SITE.tagline, type: "website" },
  };
}

export const viewport = {
  themeColor: "#0A0711",
};

export default async function RootLayout({ children }) {
  const { singlePopPrice, fourPackPrice, pretzelRodPrice, pretzelPairPrice } = await getShopSettings();
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body>
        <a className="skip" href="#main">
          Skip to main content
        </a>
        <IconSprite />
        <PricesProvider singlePopPrice={singlePopPrice} fourPackPrice={fourPackPrice} pretzelRodPrice={pretzelRodPrice} pretzelPairPrice={pretzelPairPrice}>
        <CartProvider>
          <StorefrontOnly><SiteHeader /></StorefrontOnly>
          <main id="main">{children}</main>
          <StorefrontOnly><SiteFooter /><MobileBar /><CartDrawer /><Toast /></StorefrontOnly>
        </CartProvider>
        </PricesProvider>
        <Reveal />
      </body>
    </html>
  );
}
