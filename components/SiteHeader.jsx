"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useCart } from "./CartProvider";
import { Icon } from "./Icons";
import { trapFocus } from "@/lib/focus-trap";

const LINKS = [
  {
    href: "/shop",
    label: "Shop Cake Pops",
    note: "$4 each · everyday favorites",
  },
  {
    href: "/build-a-box",
    label: "Build a Four-Pack",
    note: "Choose four flavors for $10",
  },
  { href: "/about", label: "About", note: "Meet the maker behind Bon Bon's" },
  { href: "/faq", label: "FAQ", note: "Pickup, payment, and lead times" },
];

export default function SiteHeader() {
  const { count, setOpen } = useCart();
  const [menu, setMenu] = useState(false);
  const [stuck, setStuck] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [announceReady, setAnnounceReady] = useState(false);
  const menuButtonRef = useRef(null);
  const headerRef = useRef(null);
  const panelRef = useRef(null);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Read the dismissal after mount so server and client markup match.
  useEffect(() => {
    try {
      setDismissed(localStorage.getItem("bb_announce") === "off");
    } catch {}
    setAnnounceReady(true);
  }, []);

  useEffect(() => {
    setMenu(false);
  }, [pathname]);

  useEffect(() => {
    if (!menu) return;
    panelRef.current?.querySelector("a")?.focus({ preventScroll: true });
    const onKey = (event) => {
      if (event.key === "Escape") {
        setMenu(false);
        menuButtonRef.current?.focus();
      }
      trapFocus(headerRef.current, event);
    };
    const wideScreen = window.matchMedia("(min-width: 1081px)");
    const onResize = () => { if (wideScreen.matches) setMenu(false); };
    wideScreen.addEventListener("change", onResize);
    document.addEventListener("keydown", onKey);
    document.body.classList.add("mobile-nav-open");
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.classList.remove("mobile-nav-open");
      wideScreen.removeEventListener("change", onResize);
    };
  }, [menu]);

  return (
    <>
      {announceReady && !dismissed && (
        <div className="announce">
          <div className="announce-in">
            <span>Cake pops $4 each</span>
            <span className="dot" aria-hidden="true">
              ·
            </span>
            <span className="hide-sm">Four-pack $10</span>
            <span className="dot hide-sm" aria-hidden="true">
              ·
            </span>
            <Link href="/build-a-box">Build a four-pack</Link>
          </div>
          <button
            className="announce-x"
            aria-label="Dismiss announcement"
            onClick={() => {
              setDismissed(true);
              try {
                localStorage.setItem("bb_announce", "off");
              } catch {}
            }}
          >
            ×
          </button>
        </div>
      )}

      <header
        ref={headerRef}
        className={`nav${stuck ? " stuck" : ""}${menu ? " menu-open" : ""}`}
      >
        <div className="wrap nav-in">
          <Link
            className="brand"
            href="/"
            aria-label="Bon Bon's Sweets and More, home"
          >
            <Image
              src="/logo-transparent.png"
              alt="Bon Bon's Sweets & More"
              width={140}
              height={140}
              priority
              style={{ height: 50, width: "auto" }}
            />
            <span className="brand-wordmark" aria-hidden="true">
              <strong>Bon Bon&apos;s</strong>
              <small>Sweets &amp; More</small>
            </span>
          </Link>

          <nav className="nav-links" aria-label="Main">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                aria-current={pathname === l.href ? "page" : undefined}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="nav-actions">
            <button
              className="cart-btn"
              onClick={() => {
                setMenu(false);
                setOpen(true);
              }}
              aria-label={`Open pickup request, ${count} items`}
            >
              <Icon name="i-bag" width="17" height="17" />
              <span>Order</span>
              <span
                key={count}
                className="count"
                data-empty={count === 0 ? "true" : "false"}
              >
                {count}
              </span>
            </button>
            <Link className="btn btn-pink btn-sm" href="/build-a-box">
              4 for $10
            </Link>
            <button
              ref={menuButtonRef}
              className="burger"
              aria-label={
                menu ? "Close navigation menu" : "Open navigation menu"
              }
              aria-expanded={menu}
              aria-controls="mobile-navigation"
              onClick={() => setMenu((m) => !m)}
            >
              <span className="burger-lines" aria-hidden="true" />
            </button>
          </div>
        </div>

        <nav
          ref={panelRef}
          className={`mobile-menu${menu ? " open" : ""}`}
          id="mobile-navigation"
          aria-label="Mobile navigation"
          aria-hidden={!menu}
          inert={!menu}
        >
          <div className="wrap mobile-menu-inner">
            <div className="mobile-menu-heading">
              <span>Menu</span>
              <small>$4 singles · $10 four-packs</small>
            </div>
            <div className="mobile-menu-links">
              {LINKS.map((link, index) => (
                <Link
                  className="mobile-menu-link"
                  style={{ "--item-index": index }}
                  key={link.href}
                  href={link.href}
                  aria-current={pathname === link.href ? "page" : undefined}
                  onClick={() => setMenu(false)}
                >
                  <span className="mobile-menu-number">0{index + 1}</span>
                  <span className="mobile-menu-copy">
                    <b>{link.label}</b>
                    <small>{link.note}</small>
                  </span>
                  <span className="mobile-menu-arrow" aria-hidden="true">
                    →
                  </span>
                </Link>
              ))}
            </div>
            <Link
              className="mobile-menu-cta"
              href="/quote"
              onClick={() => setMenu(false)}
            >
              <span>
                <small>Planning something special?</small>
                <b>Ask about custom or event pops</b>
              </span>
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </nav>
      </header>
      <button
        className={`mobile-menu-backdrop${menu ? " open" : ""}`}
        type="button"
        aria-label="Close navigation menu"
        tabIndex={menu ? 0 : -1}
        onClick={() => setMenu(false)}
      />
    </>
  );
}
