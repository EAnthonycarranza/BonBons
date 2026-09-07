"use client";
import { useState } from "react";
import { useCart } from "./CartProvider";

export default function AddToCart({ product }) {
  const { add, setOpen } = useCart();
  const [qty, setQty] = useState(1);

  return (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginTop: 24 }}>
      <div className="stepper" aria-label="Quantity">
        <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="One fewer">−</button>
        <output key={qty} aria-label="Cake pop quantity">{qty}</output>
        <button type="button" onClick={() => setQty((q) => Math.min(50, q + 1))} aria-label="One more">+</button>
      </div>
      <button
        className="btn btn-pink"
        onClick={() => {
          add({
            key: product.slug, name: product.name, desc: product.blurb,
            price: product.price, qty, icon: product.icon,
            color: product.color, tint: product.tint,
            bundleEligible: product.bundleEligible,
            image: product.image,
          });
          setOpen(true);
        }}
      >
        Add to pickup request
      </button>
    </div>
  );
}
