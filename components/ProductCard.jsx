"use client";
import { useState } from "react";
import Link from "next/link";
import { useCart } from "./CartProvider";
import { Icon } from "./Icons";
import { money } from "@/lib/format";

export default function ProductCard({ product }) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);

  function onAdd(e) {
    e.preventDefault();
    e.stopPropagation();
    add({
      key: product.slug,
      name: product.name,
      desc: product.blurb,
      price: product.price,
      qty: 1,
      icon: product.icon,
      color: product.color,
      tint: product.tint,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 900);
  }

  return (
    <article className="prod">
      <Link href={`/shop/${product.slug}`} style={{ display: "block" }}>
        <div
          className="ph"
          style={{ background: `linear-gradient(150deg,rgba(${product.tint},.22),rgba(${product.tint},.04))` }}
        >
          {product.badge ? (
            <span className={`badge ${product.badgeClass || ""}`}>{product.badge}</span>
          ) : null}
          <Icon name={product.icon} style={{ color: product.color }} />
        </div>
      </Link>
      <div className="meta">
        <h3><Link href={`/shop/${product.slug}`}>{product.name}</Link></h3>
        <div className="d">{product.blurb}</div>
        <div className="bot">
          <span className="p">{money(product.price)} <small>{product.unit}</small></span>
          <button
            className={`add${added ? " added" : ""}`}
            onClick={onAdd}
            aria-label={`Add ${product.name} to cart`}
          >
            <Icon name={added ? "i-check" : "i-plus"} />
          </button>
        </div>
      </div>
    </article>
  );
}
