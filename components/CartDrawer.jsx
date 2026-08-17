"use client";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { useCart } from "./CartProvider";
import { Icon } from "./Icons";
import { money } from "@/lib/format";
import { SITE } from "@/lib/sample-data";

export default function CartDrawer() {
  const { items, remove, setQty, subtotal, open, setOpen, count } = useCart();
  const closeRef = useRef(null);
  const lastFocus = useRef(null);

  useEffect(() => {
    if (open) {
      lastFocus.current = document.activeElement;
      closeRef.current?.focus();
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      if (lastFocus.current instanceof HTMLElement) lastFocus.current.focus();
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape" && open) setOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  const remaining = SITE.freeDeliveryOver - subtotal;

  return (
    <>
      <div className={`overlay${open ? " open" : ""}`} onClick={() => setOpen(false)} />
      <aside
        className={`drawer${open ? " open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawerTitle"
        aria-hidden={!open}
      >
        <div className="drawer-top">
          <h2 id="drawerTitle">Your cart{count ? ` (${count})` : ""}</h2>
          <button ref={closeRef} className="x" onClick={() => setOpen(false)} aria-label="Close cart">×</button>
        </div>

        <div className="drawer-body">
          {items.length === 0 ? (
            <div className="drawer-empty">
              <Icon name="i-bag" />
              <p>Your cart is empty.</p>
              <p style={{ fontSize: "13.5px", marginTop: 6 }}>Add a ready-made box, or build your own.</p>
            </div>
          ) : (
            items.map((i) => (
              <div className="ci" key={i.key}>
                <div className="ph" style={{ background: `rgba(${i.tint},.16)` }}>
                  <Icon name={i.icon} style={{ color: i.color }} />
                </div>
                <div className="info">
                  <b>{i.name}</b>
                  <span>{i.desc}</span>
                  <div className="stepper" style={{ marginTop: 8 }}>
                    <button type="button" onClick={() => setQty(i.key, i.qty - 1)} aria-label={`One fewer ${i.name}`}>−</button>
                    <output>{i.qty}</output>
                    <button type="button" onClick={() => setQty(i.key, i.qty + 1)} aria-label={`One more ${i.name}`}>+</button>
                  </div>
                </div>
                <div className="right">
                  <b>{money(i.price * i.qty)}</b>
                  <br />
                  <button className="ci-rm" onClick={() => remove(i.key)}>Remove</button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="drawer-foot">
          <div className="dtot"><span>Subtotal</span><b>{money(subtotal)}</b></div>
          <div className="dnote">
            {items.length === 0
              ? `Free local delivery over ${money(SITE.freeDeliveryOver)}.`
              : remaining > 0
                ? `${money(remaining)} more for free local delivery.`
                : "Free local delivery unlocked."}
          </div>
          <Link
            href="/cart"
            className="btn btn-pink btn-block"
            onClick={() => setOpen(false)}
            aria-disabled={items.length === 0}
            style={items.length === 0 ? { opacity: .45, pointerEvents: "none" } : undefined}
          >
            Review order
          </Link>
        </div>
      </aside>
    </>
  );
}
