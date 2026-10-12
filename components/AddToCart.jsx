"use client";
import { useState } from "react";
import { useCart } from "./CartProvider";
import { stockState } from "@/supabase/functions/_shared/menu";
import { bundleGroupForCategory } from "@/lib/bundles";

export default function AddToCart({ product }) {
  const { add, setOpen, ready } = useCart();
  const [qty, setQty] = useState(1);
  const availability = stockState(product.stockQuantity, product.lowStockThreshold);
  const maxQty = Math.min(50, availability.remaining ?? 50);
  const soldOut = availability.state === "sold_out";

  return (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginTop: 24 }}>
      <div className="stepper" aria-label="Quantity">
        <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="One fewer">−</button>
        <output key={qty} aria-label="Treat quantity">{qty}</output>
        <button type="button" onClick={() => setQty((q) => Math.min(maxQty, q + 1))} aria-label="One more" disabled={soldOut || qty >= maxQty}>+</button>
      </div>
      <button
        className="btn btn-pink"
        disabled={soldOut || !ready}
        onClick={() => {
          add({
            key: product.slug, name: product.name, desc: product.blurb,
            price: product.price, qty, icon: product.icon,
            color: product.color, tint: product.tint,
            bundleEligible: product.bundleEligible,
            bundleGroup: bundleGroupForCategory(product.category), category: product.category,
            image: product.image,
          });
          setOpen(true);
        }}
      >
        {soldOut ? "Sold out" : "Add to pickup request"}
      </button>
    </div>
  );
}
