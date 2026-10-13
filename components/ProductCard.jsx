"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useCart } from "./CartProvider";
import { Icon } from "./Icons";
import { money } from "@/lib/format";
import { isStyledProductPhoto, isProductFlyer } from "@/lib/product-photos";
import { stockLabel } from "@/lib/weekly-box";
import { stockState } from "@/supabase/functions/_shared/menu";
import { bundleGroupForCategory } from "@/lib/bundles";
import { saleDescription } from "@/lib/menu-categories";
import {
  isMysteryBag,
  bagContents,
  sellingContainer,
} from "@/lib/product-offerings";

export default function ProductCard({ product }) {
  const { add, ready } = useCart();
  const [added, setAdded] = useState(false);
  const availability = stockState(
    product.stockQuantity,
    product.lowStockThreshold,
  );
  const soldOut = availability.state === "sold_out";

  function onAdd(e) {
    e.preventDefault();
    e.stopPropagation();
    if (soldOut || !ready) return;
    add({
      key: product.slug,
      name: product.name,
      desc: saleDescription(product),
      price: product.price,
      qty: 1,
      bundleEligible: product.bundleEligible,
      offeringType: product.offeringType,
      bonusDescription: product.bonusDescription,
      bundleGroup: bundleGroupForCategory(product.category, product.treatType),
      category: product.category,
      treatType: product.treatType,
      unitCount: product.unitCount,
      unitLabel: product.unitLabel,
      image: product.image,
      icon: product.icon,
      color: product.color,
      tint: product.tint,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 900);
  }

  return (
    <article
      className={`prod rv-anim${soldOut ? " is-sold-out" : ""}`}
      data-motion="card"
    >
      <Link href={`/shop/${product.slug}`} style={{ display: "block" }}>
        <div
          className={`ph${product.image ? " photo" : ""}${isProductFlyer(product.image) ? " is-flyer" : ""}`}
          style={{
            background: `linear-gradient(150deg,rgba(${product.tint},.22),rgba(${product.tint},.04))`,
          }}
        >
          {product.image ? (
            <Image
              src={product.image}
              alt={
                isProductFlyer(product.image)
                  ? `${product.name} flyer from Bon Bon's`
                  : `${isStyledProductPhoto(product.image) ? "Styled image of " : ""}${product.name} by Bon Bon's`
              }
              fill
              sizes="(max-width: 560px) 100vw, (max-width: 1080px) 50vw, 25vw"
            />
          ) : (
            <div className="flavor-photo-pending">
              <Image
                src="/logo-transparent.png"
                alt="Bon Bon's Sweets & More"
                width={150}
                height={150}
              />
              <span>Product photo coming soon</span>
            </div>
          )}
          {product.badge ? (
            <span className={`badge ${product.badgeClass || ""}`}>
              {product.badge}
            </span>
          ) : null}
          {isStyledProductPhoto(product.image) && (
            <span className="styled-photo-label">Styled photo</span>
          )}
          {soldOut ? <span className="stock-flag is-out">Sold out</span> : null}
        </div>
      </Link>
      <div className="meta">
        <h3>
          <Link href={`/shop/${product.slug}`}>{product.name}</Link>
        </h3>
        <div className="d">{product.blurb}</div>
        {(product.unitCount > 1 || isMysteryBag(product)) && (
          <p className="product-batch-size">
            {isMysteryBag(product)
              ? bagContents(product)
              : `${product.unitCount} ${product.unitLabel}`}{" "}
            per {sellingContainer(product)}
          </p>
        )}
        <Link
          href={`/shop/${product.slug}#ingredients`}
          className="product-ingredients-link"
        >
          View ingredients →
        </Link>
        {availability.state === "low" ? (
          <p className="stock-line is-low">{stockLabel(availability)}</p>
        ) : null}
        <div className="bot">
          <span className="p">
            {money(product.price)}{" "}
            <small>
              {isMysteryBag(product)
                ? "per bag"
                : product.unitCount > 1
                  ? "per batch"
                  : product.unit}
            </small>
          </span>
          <button
            className={`add${added ? " added" : ""}`}
            onClick={onAdd}
            disabled={soldOut || !ready}
            aria-label={
              soldOut
                ? `${product.name} is sold out`
                : `Add ${product.name} to pickup request`
            }
          >
            <Icon name={added ? "i-check" : "i-plus"} />
          </button>
        </div>
      </div>
    </article>
  );
}
