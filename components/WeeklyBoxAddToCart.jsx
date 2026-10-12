"use client";
import { useState } from "react";
import { useCart } from "./CartProvider";
import { weeklyBoxDescription } from "@/lib/weekly-box";

export default function WeeklyBoxAddToCart({ box, cartKey, remaining }) {
  const { add, setOpen, items, ready } = useCart();
  const [qty, setQty] = useState(1);
  const alreadyAdded = items.find(item => item.key === cartKey)?.qty || 0;
  const max = Math.max(0, Math.min(50, remaining) - alreadyAdded);
  const selectedQty = Math.min(qty, Math.max(1, max));

  return (
    <div className="wb-add">
      <div className="stepper" aria-label="Quantity">
        <button type="button" disabled={selectedQty <= 1 || max === 0} onClick={() => setQty(Math.max(1, selectedQty - 1))} aria-label="One fewer box">−</button>
        <output key={selectedQty} aria-label="Box quantity" aria-live="polite">{selectedQty}</output>
        <button type="button" disabled={selectedQty >= max} onClick={() => setQty(Math.min(max, selectedQty + 1))} aria-label="One more box">+</button>
      </div>
      <button
        className="btn btn-pink wb-add-btn"
        type="button"
        disabled={max === 0 || !ready}
        onClick={() => {
          if (max === 0) return;
          add({
            key: cartKey,
            name: box.title,
            desc: weeklyBoxDescription(box),
            price: box.price,
            qty: selectedQty,
            icon: "i-favor",
            color: "#FF2E9A",
            tint: "255,46,154",
            bundleEligible: false,
            image: box.image,
          });
          setOpen(true);
        }}
      >
        {max === 0 ? "Available boxes already added" : "Add to pickup request"}
      </button>
      <p className="wb-add-note">{alreadyAdded > 0 ? `${alreadyAdded} ${alreadyAdded === 1 ? "box is" : "boxes are"} already in your request.` : (box.boxType === "mystery" ? "An assortment selected by Bon Bon. No online payment." : "A curated selection, made to share. No online payment.")}</p>
    </div>
  );
}
