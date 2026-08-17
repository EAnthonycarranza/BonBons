import "./globals.css";
import { CartProvider } from "@/components/CartProvider";
import CartDrawer from "@/components/CartDrawer";
import Toast from "@/components/Toast";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import MobileBar from "@/components/MobileBar";
import Reveal from "@/components/Reveal";
import { IconSprite } from "@/components/Icons";
import { SITE } from "@/lib/sample-data";

export const metadata = {
  metadataBase: new URL("https://eanthonycarranza.github.io"),
  title: {
    default: `${SITE.name} — Handmade Treats & Dessert Tables`,
    template: `%s · ${SITE.name}`,
  },
  description:
    "Handmade dipped strawberries, cake pops, custom cookies and full dessert tables. " +
    "Made to order for birthdays, showers, weddings and every celebration. Pickup or local delivery.",
  icons: {
    icon: "/favicon.png",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: `${SITE.name} — Handmade Treats & Dessert Tables`,
    description: SITE.tagline,
    type: "website",
  },
};

export const viewport = {
  themeColor: "#0A0711",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <a className="skip" href="#main">Skip to main content</a>
        <IconSprite />
        <CartProvider>
          <SiteHeader />
          <main id="main">{children}</main>
          <SiteFooter />
          <MobileBar />
          <CartDrawer />
          <Toast />
        </CartProvider>
        <Reveal />
      </body>
    </html>
  );
}
