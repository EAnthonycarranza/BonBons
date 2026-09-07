"use client";
import { useEffect, useState } from "react";
import AdminIcon from "./AdminIcon";
import PickupLocationManager from "./PickupLocationManager";
import { SITE } from "@/lib/sample-data";

export default function AdminSettings() {
  const [locations,setLocations] = useState([]);
  const [open,setOpen] = useState(false);
  const [error,setError] = useState("");
  const [loading,setLoading] = useState(true);
  const [email,setEmail] = useState(null);
  useEffect(()=>{
    let ignore=false;
    fetch("/api/admin/pickup-locations",{cache:"no-store"}).then(async response=>{ const data=await response.json(); if (!response.ok) throw new Error(data.error||"Could not load pickup locations."); if(!ignore)setLocations(data.locations||[]); }).catch(err=>!ignore&&setError(err.message)).finally(()=>!ignore&&setLoading(false));
    fetch("/api/admin/email",{cache:"no-store"}).then(response=>response.json()).then(data=>!ignore&&setEmail(data)).catch(()=>!ignore&&setEmail({connected:false}));
    return ()=>{ignore=true;};
  },[]);
  return <div className="admin-view">
    <header className="admin-page-head"><div><span className="admin-kicker">Shop settings</span><h1>The everyday details.</h1><p>Where customers find you, collect their pops, and pay.</p></div></header>
    <div className="admin-settings-grid">
      <section className="admin-setting-card"><header><span className="summary-icon"><AdminIcon name="pin"/></span><div><h2>Pickup locations</h2><p>Choose a saved address for each confirmed order.</p></div></header>
        {loading?<p className="admin-footnote">Loading locations…</p>:error?<p className="admin-alert is-error" role="alert">{error}</p>:<div className="admin-addresses">{locations.map(location=><div key={location.id}><b>{location.label}</b><p>{location.formattedAddress}</p><a className="admin-text-btn" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.formattedAddress)}`} target="_blank" rel="noopener noreferrer">Open Google Maps <AdminIcon name="external"/></a></div>)}</div>}
        <button className="admin-btn admin-btn-secondary" onClick={()=>setOpen(true)} disabled={loading||Boolean(error)}><AdminIcon name="edit"/>Manage pickup locations</button>
      </section>
      <section className="admin-setting-card"><header><span className="summary-icon"><AdminIcon name="phone"/></span><div><h2>Customer contact</h2><p>Shown on the website and in order emails.</p></div></header><dl className="admin-setting-facts"><div><dt>Email</dt><dd><a href={`mailto:${SITE.email}`}>{SITE.email}</a></dd></div><div><dt>Call or text</dt><dd><a href={SITE.phoneHref}>{SITE.phone}</a></dd></div></dl><p className="admin-footnote">Customer email replies go to Bon Bon&apos;s inbox.</p></section>
      <section className="admin-setting-card"><header><span className="summary-icon"><AdminIcon name="payment"/></span><div><h2>Payment options</h2><p>One familiar place for customers to pay.</p></div></header><div className="admin-payment-methods"><span>Venmo</span><span>Cash App</span><span>Zelle</span></div><p>Customers are directed to Bonnie&apos;s dot.cards profile after their order is confirmed. Payment is completed there, not on this website.</p><a className="admin-btn admin-btn-secondary" href={SITE.paymentUrl} target="_blank" rel="noopener noreferrer">Open payment options <AdminIcon name="external"/></a><p className="admin-footnote">Check that payment arrived before marking an order paid. Opening this link does not confirm payment.</p></section>
      <section className="admin-setting-card"><header><span className="summary-icon"><AdminIcon name="mail"/></span><div><h2>Order emails</h2><p>Receipts, confirmations, and pickup updates.</p></div></header><span className={`menu-status ${email?.connected?"is-live":""}`}>{!email?"Checking connection…":email.connected?"Email connected":"Email needs attention"}</span><p>A request receipt sends automatically. Confirmations and updates are sent when you choose from the order workspace.</p><p className="admin-footnote">Reply-to: {SITE.email}. The existing authenticated Gmail sender is retained until this inbox has its own mail credentials configured.</p></section>
    </div>
    <PickupLocationManager open={open} locations={locations} onClose={()=>setOpen(false)} onChanged={setLocations}/>
  </div>;
}
