"use client";
import { useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useCart } from "./CartProvider";
import ProductThumbnail from "./ProductThumbnail";
import BundleNudge from "./BundleNudge";
import { money } from "@/lib/format";
import { trapFocus } from "@/lib/focus-trap";

export default function CartDrawer() {
  const {
    items,
    remove,
    setQty,
    subtotal,
    open,
    setOpen,
    count,
    singlePopCount,
    suggestedFourPacks,
    potentialSavings,
    convertSinglesToFourPacks,
  } = useCart();
  const closeRef = useRef(null);
  const drawerRef = useRef(null);
  const lastFocus = useRef(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    if (open) {
      lastFocus.current = document.activeElement;
      closeRef.current?.focus();
      document.body.style.overflow = "hidden";
    } else {
      if (lastFocus.current instanceof HTMLElement) lastFocus.current.focus();
    }
    return () => {
      if (open) document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && open) setOpen(false);
      if (open) trapFocus(drawerRef.current, e);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  return (
    <>
      <div
        className={`overlay${open ? " open" : ""}`}
        onClick={() => setOpen(false)}
      />
      <aside
        ref={drawerRef}
        className={`drawer${open ? " open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawerTitle"
        aria-hidden={!open}
        inert={!open}
      >
        <div className="drawer-top">
          <h2 id="drawerTitle">Your request{count ? ` (${count})` : ""}</h2>
          <button
            ref={closeRef}
            className="x"
            onClick={() => setOpen(false)}
            aria-label="Close order request"
          >
            ×
          </button>
        </div>

        <div className="drawer-body">
          {items.length === 0 ? (
            <div className="drawer-empty">
              <Image
                className="drawer-empty-photo"
                src="/products/bonbons-real-assortment.jpg"
                alt="Bon Bon’s wrapped cake-pop assortment"
                width={150}
                height={150}
              />
              <p>Your request list is empty.</p>
              <p style={{ fontSize: "13.5px", marginTop: 6 }}>
                Add one cake pop, or mix a four-pack for $10.
              </p>
            </div>
          ) : (
            items.map((i) => (
              <div className="ci" key={i.key}>
                <div
                  className="ph"
                  style={{ background: `rgba(${i.tint},.16)` }}
                >
                  <ProductThumbnail item={i} />
                </div>
                <div className="info">
                  <b>{i.name}</b>
                  <span>{i.desc}</span>
                  <div className="stepper" style={{ marginTop: 8 }}>
                    <button
                      type="button"
                      onClick={() => setQty(i.key, i.qty - 1)}
                      aria-label={`One fewer ${i.name}`}
                    >
                      −
                    </button>
                    <output key={i.qty} aria-label={`${i.name} quantity`}>{i.qty}</output>
                    <button
                      type="button"
                      onClick={() => setQty(i.key, i.qty + 1)}
                      aria-label={`One more ${i.name}`}
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="right">
                  <b>{money(i.price * i.qty)}</b>
                  <br />
                  <button className="ci-rm" aria-label={`Remove ${i.name}`} onClick={() => remove(i.key)}>
                    Remove
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="drawer-foot">
          <BundleNudge
            compact
            singlePopCount={singlePopCount}
            suggestedFourPacks={suggestedFourPacks}
            potentialSavings={potentialSavings}
            onConvert={convertSinglesToFourPacks}
          />
          <div className="dtot">
            <span>Estimated total</span>
            <b>{money(subtotal)}</b>
          </div>
          <div className="dnote">
            Pickup only. Final price and pickup details are confirmed by the
            owner.
          </div>
          <Link
            href="/cart"
            className="btn btn-pink btn-block"
            onClick={() => setOpen(false)}
            aria-disabled={items.length === 0}
            tabIndex={items.length === 0 ? -1 : undefined}
            style={
              items.length === 0
                ? { opacity: 0.45, pointerEvents: "none" }
                : undefined
            }
          >
            Review pickup request
          </Link>
        </div>
      </aside>
    </>
  );
}
