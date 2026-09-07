"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import MenuManager from "./MenuManager";
import AdminOrders from "./AdminOrders";
import AdminSettings from "./AdminSettings";
import AdminIcon from "./AdminIcon";

const SECTIONS = [
  { id: "menu", label: "Cake-pop menu", icon: "menu", note: "Flavors & availability" },
  { id: "orders", label: "Pickup orders", icon: "orders", note: "Requests & confirmations" },
  { id: "settings", label: "Shop settings", icon: "settings", note: "Pickup, contact & payment" },
];

export default function AdminDashboard({ dbReady }) {
  const router = useRouter();
  const [section, setSection] = useState("menu");
  const [visited, setVisited] = useState({ menu: true });
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState("");
  async function logout() {
    setLoggingOut(true); setError("");
    try {
      const response = await fetch("/api/admin/logout", { method: "POST" });
      if (!response.ok) throw new Error("Could not log out. Please try again.");
      router.refresh();
    } catch (err) { setError(err.message); setLoggingOut(false); }
  }
  return <div className="admin-application">
    <aside className="admin-sidebar">
      <Link className="admin-brand" href="/"><Image src="/logo-transparent.png" alt="Bon Bon’s Sweets & More" width={58} height={58}/><span><b>Bon Bon&apos;s</b><small>THE SHOP DESK</small></span></Link>
      <div className="admin-workspace-label">Your workspace</div>
      <nav aria-label="Admin navigation">{SECTIONS.map(item=><button key={item.id} type="button" aria-label={item.label} className={section===item.id?"is-active":""} aria-current={section===item.id?"page":undefined} onClick={()=>{setVisited(current=>({...current,[item.id]:true}));setSection(item.id);}}><AdminIcon name={item.icon}/><span><b>{item.label}</b><small>{item.note}</small></span>{section===item.id?<i/>:null}</button>)}</nav>
      <div className="admin-sidebar-note"><span>Made with love.<br/>Managed with care.</span><p>Your menu, orders, and everyday details—all right here.</p></div>
      <div className="admin-sidebar-bottom"><Link href="/" target="_blank"><AdminIcon name="external"/>Open website</Link><button onClick={logout} disabled={loggingOut}><AdminIcon name="logout"/>{loggingOut?"Logging out…":"Log out"}</button><div className="admin-staff"><span>B</span><div><b>Bon Bon&apos;s team</b><small>Administrator</small></div></div></div>
    </aside>
    <div className="admin-main">
      <header className="admin-topbar"><div><span>Workspace</span><span className="admin-breadcrumb-separator">/</span><b>{SECTIONS.find(item=>item.id===section).label}</b></div><span className="admin-staff-badge">Staff only</span></header>
      <div className="admin-content">
        {!dbReady?<p className="admin-alert is-error" role="alert">The database is not connected. Changes and customer requests cannot be saved yet.</p>:null}
        {error?<p className="admin-alert is-error" role="alert">{error}</p>:null}
        <div hidden={section!=="menu"}><MenuManager/></div>
        {visited.orders?<div hidden={section!=="orders"}><AdminOrders dbReady={dbReady}/></div>:null}
        {visited.settings?<div hidden={section!=="settings"}><AdminSettings/></div>:null}
      </div>
      <footer className="admin-bottomline"><span>Bon Bon&apos;s Sweets &amp; More</span><span>San Antonio, Texas · Pickup only</span></footer>
    </div>
  </div>;
}
