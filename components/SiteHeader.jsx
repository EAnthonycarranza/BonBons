"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useCart } from "./CartProvider";
import { Icon } from "./Icons";

const LINKS = [
  { href: "/shop", label: "Shop" },
  { href: "/build-a-box", label: "Build a Box" },
  { href: "/dessert-tables", label: "Dessert Tables" },
  { href: "/occasions", label: "Occasions" },
  { href: "/about", label: "About" },
  { href: "/faq", label: "FAQ" },
];

export default function SiteHeader() {
  const { count, setOpen } = useCart();
  const [menu, setMenu] = useState(false);
  const [stuck, setStuck] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [announceReady, setAnnounceReady] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Read the dismissal after mount so server and client markup match.
  useEffect(() => {
    try { setDismissed(localStorage.getItem("bb_announce") === "off"); } catch {}
    setAnnounceReady(true);
  }, []);

  useEffect(() => { setMenu(false); }, [pathname]);

  return (
    <>
      {announceReady && !dismissed && (
        <div className="announce">
          <div className="announce-in">
            <span>Free local delivery over $75</span>
            <span className="dot" aria-hidden="true">·</span>
            <span className="hide-sm">Order 72 hours ahead</span>
            <span className="dot hide-sm" aria-hidden="true">·</span>
            <Link href="/quote">Now booking fall parties</Link>
          </div>
          <button
            className="announce-x"
            aria-label="Dismiss announcement"
            onClick={() => {
              setDismissed(true);
              try { localStorage.setItem("bb_announce", "off"); } catch {}
            }}
          >×</button>
        </div>
      )}

      <header className={`nav${stuck ? " stuck" : ""}`}>
        <div className="wrap nav-in">
          <Link className="brand" href="/" aria-label="Bon Bon's Sweets and More, home">
            <Image src="/logo-transparent.png" alt="Bon Bon's Sweets & More" width={140} height={140} priority style={{ height: 50, width: "auto" }} />
          </Link>

          <nav className="nav-links" aria-label="Main">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} aria-current={pathname === l.href ? "page" : undefined}>
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="nav-actions">
            <button className="cart-btn" onClick={() => setOpen(true)} aria-label={`Open cart, ${count} items`}>
              <Icon name="i-bag" width="17" height="17" />
              <span>Cart</span>
              <span className="count" data-empty={count === 0 ? "true" : "false"}>{count}</span>
            </button>
            <Link className="btn btn-pink btn-sm" href="/quote">Get a Quote</Link>
            <button
              className="burger"
              aria-label="Menu"
              aria-expanded={menu}
              onClick={() => setMenu((m) => !m)}
            ><span /></button>
          </div>
        </div>

        <div className={`mobile-menu${menu ? " open" : ""}`}>
          {LINKS.map((l) => <Link key={l.href} href={l.href}>{l.label}</Link>)}
          <Link href="/quote">Get a Quote</Link>
        </div>
      </header>
    </>
  );
}
