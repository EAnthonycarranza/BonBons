"use client";

import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import AdminIcon from "./AdminIcon";
import { ADMIN_MOBILE_QUERY } from "@/lib/admin-layout";

export default function AdminMobileNav({ sections, section, onSelect, onLogout, loggingOut }) {
  const [open, setOpen] = useState(false);
  const dialog = useRef(null);
  const trigger = useRef(null);
  const id = useId();
  const active = sections.find(item => item.id === section);

  useEffect(() => {
    if (!open) return;
    const sheet = dialog.current;
    const overflow = document.body.style.overflow;
    sheet.showModal();
    document.body.style.overflow = "hidden";
    sheet.querySelector('[aria-current="page"]')?.focus({ preventScroll: true });
    const media = window.matchMedia(ADMIN_MOBILE_QUERY);
    const onResize = event => { if (!event.matches) { sheet.close(); setOpen(false); } };
    media.addEventListener("change", onResize);
    return () => { sheet.close(); if (overflow !== "hidden") document.body.style.overflow = overflow; media.removeEventListener("change", onResize); };
  }, [open]);

  function close() { dialog.current?.close(); setOpen(false); trigger.current?.focus({ preventScroll: true }); }

  return (
    <div className="admin-mobile-header">
      <div className="admin-mobile-brand-row">
        <Link href="/" className="admin-mobile-brand"><Image src="/logo-transparent.png" alt="" width={42} height={42}/><span><b>Bon Bon&apos;s</b><small>THE SHOP DESK</small></span></Link>
        <Link href="/" target="_blank" rel="noopener noreferrer" className="admin-mobile-website" aria-label="Open website"><AdminIcon name="external"/><span>View shop</span></Link>
      </div>
      <button ref={trigger} type="button" className="admin-mobile-switcher" aria-label="Switch workspace" aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? id : undefined} onClick={() => setOpen(true)}>
        <span className="admin-mobile-section-icon"><AdminIcon name={active.icon}/></span>
        <span><small>Your workspace</small><b>{active.label}</b></span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m7 10 5 5 5-5"/></svg>
      </button>
      {open && <dialog ref={dialog} id={id} className="admin-nav-sheet" aria-labelledby={`${id}-title`} onCancel={event => { event.preventDefault(); close(); }} onClick={event => {
        if (event.target !== event.currentTarget) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close();
      }}>
        <header><div><span className="admin-kicker">The shop desk</span><h2 id={`${id}-title`}>Your workspace</h2><p>Everything you need, one tap away.</p></div><button type="button" className="admin-icon-btn" onClick={close} aria-label="Close navigation"><AdminIcon name="close"/></button></header>
        <nav aria-label="Admin navigation">{sections.map(item => <button key={item.id} type="button" aria-current={section === item.id ? "page" : undefined} onClick={() => { close(); onSelect(item.id); }}><span className="admin-nav-icon"><AdminIcon name={item.icon}/></span><span><b>{item.label}</b><small>{item.note}</small></span><AdminIcon name={section === item.id ? "check" : "arrow"}/></button>)}</nav>
        <footer><span><i/>Staff workspace</span><button type="button" onClick={onLogout} disabled={loggingOut}><AdminIcon name="logout"/>{loggingOut ? "Logging out…" : "Log out"}</button></footer>
      </dialog>}
    </div>
  );
}
