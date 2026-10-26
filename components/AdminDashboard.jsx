"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import MenuManager from "./MenuManager";
import AdminBoxesAndBags from "./AdminBoxesAndBags";
import AdminOrders from "./AdminOrders";
import AdminSettings from "./AdminSettings";
import AdminCoupons from "./AdminCoupons";
import AdminEvents from "./AdminEvents";
import PageContentManager from "./PageContentManager";
import AdminIcon from "./AdminIcon";
import AdminMobileNav from "./AdminMobileNav";
import { ADMIN_MOBILE_QUERY } from "@/lib/admin-layout";

const SECTIONS = [
  {
    id: "menu",
    label: "Treat menu",
    icon: "menu",
    note: "Products, flavors & availability",
  },
  {
    id: "collections",
    label: "Boxes & mystery bags",
    icon: "photo",
    note: "Weekly boxes, surprises & stock",
  },
  {
    id: "orders",
    label: "Orders & cart rentals",
    icon: "orders",
    note: "Pickup orders and event requests",
  },
  {
    id: "coupons",
    label: "Coupons",
    icon: "coupon",
    note: "Print codes & track redemptions",
  },
  {
    id: "events",
    label: "Events & email updates",
    icon: "pin",
    note: "Local calendar & subscribers",
  },
  {
    id: "pages",
    label: "Home & About pages",
    icon: "edit",
    note: "Content, photos & publishing",
  },
  {
    id: "settings",
    label: "Shop settings",
    icon: "settings",
    note: "Pickup, contact & payment",
  },
];

export default function AdminDashboard({ dbReady }) {
  const router = useRouter();
  const [section, setSection] = useState("menu");
  const [visited, setVisited] = useState({ menu: true });
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState("");
  const appRef = useRef(null);
  useEffect(() => {
    const viewport = window.visualViewport;
    const resize = () => {
      appRef.current?.style.setProperty("--admin-viewport-height", `${viewport?.height || window.innerHeight}px`);
      appRef.current?.style.setProperty("--admin-keyboard-inset", `${Math.max(0, window.innerHeight - (viewport?.height || window.innerHeight) - (viewport?.offsetTop || 0))}px`);
    };
    resize();
    viewport?.addEventListener("resize", resize);
    viewport?.addEventListener("scroll", resize);
    window.addEventListener("resize", resize);
    return () => { viewport?.removeEventListener("resize", resize); viewport?.removeEventListener("scroll", resize); window.removeEventListener("resize", resize); };
  }, []);
  function selectSection(id) {
    setVisited((current) => ({ ...current, [id]: true }));
    setSection(id);
    if (window.matchMedia(ADMIN_MOBILE_QUERY).matches) {
      window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
    }
  }
  async function logout() {
    setLoggingOut(true);
    setError("");
    try {
      const response = await fetch("/api/admin/logout", { method: "POST" });
      if (!response.ok) throw new Error("Could not log out. Please try again.");
      router.refresh();
    } catch (err) {
      setError(err.message);
      setLoggingOut(false);
    }
  }
  return (
    <div className="admin-application" ref={appRef}>
      <AdminMobileNav sections={SECTIONS} section={section} onSelect={selectSection} onLogout={logout} loggingOut={loggingOut}/>
      <aside className="admin-sidebar">
        <Link className="admin-brand" href="/">
          <Image
            src="/logo-transparent.png"
            alt="Bon Bon’s Sweets & More"
            width={58}
            height={58}
          />
          <span>
            <b>Bon Bon&apos;s</b>
            <small>THE SHOP DESK</small>
          </span>
        </Link>
        <div className="admin-workspace-label">Your workspace</div>
        <nav aria-label="Admin navigation">
          {SECTIONS.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-label={item.label}
              className={section === item.id ? "is-active" : ""}
              aria-current={section === item.id ? "page" : undefined}
              onClick={() => selectSection(item.id)}
            >
              <AdminIcon name={item.icon} />
              <span>
                <b>{item.label}</b>
                <small>{item.note}</small>
              </span>
              {section === item.id ? <i /> : null}
            </button>
          ))}
        </nav>
        <div className="admin-sidebar-note">
          <span>
            Made with love.
            <br />
            Managed with care.
          </span>
          <p>Your menu, orders, and everyday details—all right here.</p>
        </div>
        <div className="admin-sidebar-bottom">
          <Link href="/" target="_blank">
            <AdminIcon name="external" />
            Open website
          </Link>
          <button onClick={logout} disabled={loggingOut}>
            <AdminIcon name="logout" />
            {loggingOut ? "Logging out…" : "Log out"}
          </button>
          <div className="admin-staff">
            <span>B</span>
            <div>
              <b>Bon Bon&apos;s team</b>
              <small>Administrator</small>
            </div>
          </div>
        </div>
      </aside>
      <div className="admin-main">
        <header className="admin-topbar">
          <div>
            <span>Workspace</span>
            <span className="admin-breadcrumb-separator">/</span>
            <b>{SECTIONS.find((item) => item.id === section).label}</b>
          </div>
          <span className="admin-staff-badge">Staff only</span>
        </header>
        <div className="admin-content">
          {!dbReady ? (
            <p className="admin-alert is-error" role="alert">
              The database is not connected. Changes and customer requests
              cannot be saved yet.
            </p>
          ) : null}
          {error ? (
            <p className="admin-alert is-error" role="alert">
              {error}
            </p>
          ) : null}
          <div hidden={section !== "menu"}>
            <MenuManager />
          </div>
          {visited.collections ? (
            <div hidden={section !== "collections"}>
              <AdminBoxesAndBags />
            </div>
          ) : null}
          {visited.orders ? (
            <div hidden={section !== "orders"}>
              <AdminOrders dbReady={dbReady} />
            </div>
          ) : null}
          {visited.coupons ? (
            <div hidden={section !== "coupons"}>
              <AdminCoupons />
            </div>
          ) : null}
          {visited.events ? (
            <div hidden={section !== "events"}>
              <AdminEvents />
            </div>
          ) : null}
          {visited.pages ? (
            <div hidden={section !== "pages"}>
              <PageContentManager />
            </div>
          ) : null}
          {visited.settings ? (
            <div hidden={section !== "settings"}>
              <AdminSettings />
            </div>
          ) : null}
        </div>
        <footer className="admin-bottomline">
          <span>Bon Bon&apos;s Sweets &amp; More</span>
          <span>San Antonio, Texas · Pickup only</span>
        </footer>
      </div>
    </div>
  );
}
