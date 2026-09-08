"use client";
import { useState } from "react";
import { useCart } from "./CartProvider";

export default function WeeklyBoxAddToCart({ box, cartKey, remaining }) {
  const { add, setOpen } = useCart();
  const [qty, setQty] = useState(1);
  const max = Math.max(1, Math.min(50, remaining));

  return (
    <div className="wb-add">
      <div className="stepper" aria-label="Quantity">
        <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="One fewer box">−</button>
        <output key={qty} aria-label="Box quantity">{qty}</output>
        <button type="button" onClick={() => setQty((q) => Math.min(max, q + 1))} aria-label="One more box">+</button>
      </div>
      <button
        className="btn btn-pink wb-add-btn"
        onClick={() => {
          add({
            key: cartKey,
            name: box.title,
            desc: box.items.map((item) => `${item.name}${Number(item.qty) > 1 ? ` \u00d7${item.qty}` : ""}`).join(", "),
            price: box.price,
            qty,
            icon: "i-favor",
            color: "#FF2E9A",
            tint: "255,46,154",
            bundleEligible: false,
            image: box.image,
          });
          setOpen(true);
        }}
      >
        Add this box to my request
      </button>
      {remaining < 50 ? (
        <p className="wb-add-note">Up to {max} {max === 1 ? "box" : "boxes"} per request while stock lasts.</p>
      ) : null}
    </div>
  );
}
