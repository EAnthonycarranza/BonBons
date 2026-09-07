"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useCart } from "./CartProvider";
import { Icon } from "./Icons";
import { money } from "@/lib/format";
import { isStyledProductPhoto } from "@/lib/product-photos";

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
    <article className="prod rv-anim" data-motion="card">
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
            aria-label={`Add ${product.name} to pickup request`}
          >
            <Icon name={added ? "i-check" : "i-plus"} />
          </button>
        </div>
      </div>
    </article>
  );
}
