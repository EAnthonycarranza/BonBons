"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useCart } from "./CartProvider";
import { Icon } from "./Icons";
import { money } from "@/lib/format";
import { isStyledProductPhoto } from "@/lib/product-photos";
import { stockLabel } from "@/lib/weekly-box";
import { stockState } from "@/supabase/functions/_shared/menu";

export default function ProductCard({ product }) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);
  const availability = stockState(product.stockQuantity, product.lowStockThreshold);
  const soldOut = availability.state === "sold_out";

  function onAdd(e) {
    e.preventDefault();
    e.stopPropagation();
    if (soldOut) return;
    add({
      key: product.slug,
      name: product.name,
      desc: product.blurb,
      price: product.price,
      qty: 1,
      bundleEligible: product.bundleEligible,
      image: product.image,
      icon: product.icon,
      color: product.color,
      tint: product.tint,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 900);
  }

  return (
    <article className={`prod rv-anim${soldOut ? " is-sold-out" : ""}`} data-motion="card">
      <Link href={`/shop/${product.slug}`} style={{ display: "block" }}>
        <div
          className={`ph${product.image ? " photo" : ""}`}
          style={{ background: `linear-gradient(150deg,rgba(${product.tint},.22),rgba(${product.tint},.04))` }}
        >
          {product.image ? (
            <Image
              src={product.image}
              alt={`${isStyledProductPhoto(product.image) ? "Styled image of " : ""}${product.name} by Bon Bon's`}
              fill
              sizes="(max-width: 560px) 100vw, (max-width: 1080px) 50vw, 25vw"
            />
          ) : <div className="flavor-photo-pending"><Image src="/logo-transparent.png" alt="Bon Bon's Sweets & More" width={150} height={150} /><span>Flavor photo coming soon</span></div>}
          {product.badge ? (
            <span className={`badge ${product.badgeClass || ""}`}>{product.badge}</span>
          ) : null}
          {isStyledProductPhoto(product.image) && <span className="styled-photo-label">Styled photo</span>}
          {soldOut ? <span className="stock-flag is-out">Sold out</span> : null}
        </div>
      </Link>
      <div className="meta">
        <h3><Link href={`/shop/${product.slug}`}>{product.name}</Link></h3>
        <div className="d">{product.blurb}</div>
        {availability.state === "low" ? (
          <p className="stock-line is-low">{stockLabel(availability)}</p>
        ) : null}
        <div className="bot">
          <span className="p">{money(product.price)} <small>{product.unit}</small></span>
          <button
            className={`add${added ? " added" : ""}`}
            onClick={onAdd}
            disabled={soldOut}
            aria-label={soldOut ? `${product.name} is sold out` : `Add ${product.name} to pickup request`}
          >
            <Icon name={added ? "i-check" : "i-plus"} />
          </button>
        </div>
      </div>
    </article>
  );
}
