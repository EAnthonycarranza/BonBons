"use client";
import { useMemo, useState } from "react";
import { useCart } from "./CartProvider";
import Image from "next/image";
import { money } from "@/lib/format";
import { BOX_SIZES } from "@/lib/sample-data";
import {
  getBundleGroup,
  isCakePopProduct,
  bundleLimitType,
  mixedPackLimitFor,
  MIXED_PACK_RULE,
  assertBundleSelection,
} from "@/lib/bundles";
import { categoryName } from "@/lib/menu-categories";
import { stockState } from "@/supabase/functions/_shared/menu";
import { usePrices } from "./PricesProvider";
import "./box-builder.css";

export default function BoxBuilder({ products = [], initialOffer = "mixed" }) {
  const { singlePopPrice, treatPairPrice, fourPackPrice } = usePrices();
  const treats = products
    .filter(
      (product) =>
        product.bundleEligible !== false &&
        Number(product.unitCount || 1) === 1,
    )
    .map((p) => ({
      id: p.slug,
      name: p.name,
      note: p.blurb,
      image: p.image || "/logo-transparent.png",
      category: p.category,
      categoryLabel: categoryName(p),
      treatType: p.treatType,
      ingredients: p.ingredients,
      stock: stockState(p.stockQuantity, p.lowStockThreshold),
    }));
  const emptyCounts = () => Object.fromEntries(treats.map((t) => [t.id, 0]));
  const { add, setOpen, ready } = useCart();
  const [sizeId, setSizeId] = useState(initialOffer);
  const [counts, setCounts] = useState(emptyCounts);
  const [category, setCategory] = useState("all");
  const allowedTreats = treats.filter(
    (treat) => sizeId !== "cakepop" || isCakePopProduct(treat),
  );
  const categories = [...new Set(allowedTreats.map((treat) => treat.category))];

  const size = useMemo(
    () => ({
      ...(BOX_SIZES.find((s) => s.id === sizeId) || BOX_SIZES[0]),
      price: sizeId === "cakepop" ? treatPairPrice : fourPackPrice,
    }),
    [sizeId, treatPairPrice, fourPackPrice],
  );
  const picked = useMemo(
    () => Object.values(counts).reduce((n, v) => n + v, 0),
    [counts],
  );

  const remaining = size.pieces - picked;
  const full = remaining === 0;
  const packLabel = money(size.price);
  const categoryCount = (cat, values = counts) =>
    treats
      .filter((t) => bundleLimitType(t) === cat)
      .reduce((n, t) => n + (values[t.id] || 0), 0);
  const atCategoryLimit = (t, values = counts) =>
    sizeId === "mixed" &&
    categoryCount(bundleLimitType(t), values) >= mixedPackLimitFor(t);

  function step(id, delta) {
    setCounts((prev) => {
      const treat = treats.find((treat) => treat.id === id);
      if (
        delta > 0 &&
        (atCategoryLimit(treat, prev) ||
          (sizeId === "cakepop" && !isCakePopProduct(treat)))
      )
        return prev;
      const next = prev[id] + delta;
      if (
        next < 0 ||
        next > (treats.find((treat) => treat.id === id)?.stock.remaining ?? 50)
      )
        return prev;
      const total = Object.values(prev).reduce((n, v) => n + v, 0);
      if (delta > 0 && total >= size.pieces) return prev; // never overfill
      return { ...prev, [id]: next };
    });
  }

  function changeSize(nextId) {
    setSizeId(nextId);
    setCategory("all");
    setCounts(emptyCounts());
  }

  function addBox() {
    if (!full || selectionError) return;
    assertBundleSelection(
      sizeId,
      treats
        .filter((t) => counts[t.id] > 0)
        .map((t) => ({ ...t, qty: counts[t.id] })),
    );
    const group = getBundleGroup(sizeId);
    const contents = treats
      .filter((t) => counts[t.id] > 0)
      .map((t) => `${t.name} x${counts[t.id]}`)
      .join(", ");
    add({
      key: `${group.cartPrefix}${treats
        .filter((t) => counts[t.id] > 0)
        .map((t) => `${t.id}:${counts[t.id]}`)
        .sort()
        .join("+")}`,
      name: group.orderName,
      desc: contents,
      price: size.price,
      qty: 1,
      bundleEligible: false,
      flavors: treats
        .filter((t) => counts[t.id] > 0)
        .map((t) => ({ slug: t.id, qty: counts[t.id] })),
      icon: "i-favor",
      color: "#FFD34E",
      tint: "255,211,78",
    });
    setCounts(emptyCounts());
    setOpen(true);
  }

  const lines = treats.filter((t) => counts[t.id] > 0);
  const selectedTypeCount = new Set(lines.map(bundleLimitType)).size;
  let selectionError = "";
  if (full) {
    try {
      assertBundleSelection(
        sizeId,
        lines.map((t) => ({ ...t, qty: counts[t.id] })),
      );
    } catch (error) {
      selectionError = error.message;
    }
  }
  const selectedPhotos = lines.flatMap((t) =>
    Array.from({ length: counts[t.id] }, () => t),
  );

  if (!treats.length)
    return (
      <div className="b-card">
        <h2>The next batch is on its way.</h2>
        <p>
          Please check back for available treats, or contact Bonnie to ask
          what’s baking.
        </p>
      </div>
    );

  return (
    <div className="builder">
      <div>
        <div className="b-card rv-anim" style={{ marginBottom: 18 }}>
          <h3>1. Choose your offer</h3>
          <p className="hint">
            Cake pops: {money(singlePopPrice)} each or two for{" "}
            {money(treatPairPrice)}. Mix four treats for {money(fourPackPrice)}.
            Changing offers starts a new pack.
          </p>
          <div
            className={`sizes${BOX_SIZES.length === 1 ? " sizes-single" : ""}`}
          >
            {BOX_SIZES.map((s) => (
              <div className="size" key={s.id}>
                <input
                  type="radio"
                  name="boxsize"
                  id={`sz-${s.id}`}
                  checked={sizeId === s.id}
                  onChange={() => changeSize(s.id)}
                />
                <label htmlFor={`sz-${s.id}`}>
                  <b>{s.label}</b>
                  <span>{s.pieces} pieces</span>
                  <em>
                    {money(s.id === "cakepop" ? treatPairPrice : fourPackPrice)}
                  </em>
                </label>
              </div>
            ))}
          </div>
        </div>

        <div className="b-card rv-anim">
          <h3>2. Pick your {size.pieces} treats</h3>
          <p className="hint">
            Choose {size.pieces} pieces total — {picked} picked,{" "}
            {Math.max(0, remaining)} to go.
          </p>
          {sizeId === "mixed" && (
            <p className="builder-limits" role="status">
              {MIXED_PACK_RULE}
              <br />
              Different flavors of the same treat count as one type.
              <br />
              Cake pops: {categoryCount("cake-pops")}/3 · Pretzel rods:{" "}
              {categoryCount("pretzel-rods")}/3 ·{" "}
              Rice crispy treats: {categoryCount("rice-crispy-treats")}/1 ·
              Oreos: {categoryCount("dipped-oreos")}/2
            </p>
          )}
          <div
            className="builder-category-tabs"
            role="group"
            aria-label="Filter treat types"
          >
            {[
              ["all", "All treats"],
              ...categories.map((key) => [
                key,
                allowedTreats.find((treat) => treat.category === key)
                  ?.categoryLabel,
              ]),
            ].map(([key, label]) => (
              <button
                type="button"
                key={key}
                aria-pressed={category === key}
                onClick={() => setCategory(key)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="treats">
            {allowedTreats
              .filter(
                (treat) => category === "all" || treat.category === category,
              )
              .map((t) => (
                <div
                  className={`treat${counts[t.id] ? " is-picked" : ""}`}
                  key={t.id}
                >
                  <Image
                    className="treat-photo"
                    src={t.image}
                    alt=""
                    width={70}
                    height={70}
                  />
                  <div className="tn">
                    <b>{t.name}</b>
                    <details className="builder-ingredients">
                      <summary>Ingredients</summary>
                      <p>
                        {t.ingredients ||
                          "Ingredients have not been listed yet. Please ask Bonnie for this product’s ingredients."}
                      </p>
                    </details>
                    <span>
                      {t.categoryLabel}
                      {t.stock.state === "sold_out"
                        ? " · Sold out"
                        : t.stock.tracked
                          ? ` · ${t.stock.remaining} left`
                          : ""}
                    </span>
                  </div>
                  <div className="stepper">
                    <button
                      type="button"
                      onClick={() => step(t.id, -1)}
                      disabled={counts[t.id] === 0}
                      aria-label={`One fewer ${t.name}`}
                    >
                      −
                    </button>
                    <output
                      key={counts[t.id]}
                      aria-label={`${t.name} quantity`}
                    >
                      {counts[t.id]}
                    </output>
                    <button
                      type="button"
                      onClick={() => step(t.id, 1)}
                      disabled={
                        full ||
                        atCategoryLimit(t) ||
                        t.stock.state === "sold_out" ||
                        counts[t.id] >= (t.stock.remaining ?? 50)
                      }
                      aria-label={`One more ${t.name}`}
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      <aside className="summary" aria-label="Box summary">
        <h3>Your box</h3>
        <div
          className={`pack-preview${size.pieces === 4 ? " pack-preview-four" : ""}`}
          aria-label={`${picked} of ${size.pieces} treats selected`}
        >
          {Array.from({ length: size.pieces }, (_, index) => (
            <div
              className={`pack-slot${selectedPhotos[index] ? " is-filled" : ""}`}
              key={index}
            >
              {selectedPhotos[index] ? (
                <Image
                  key={selectedPhotos[index].id}
                  src={selectedPhotos[index].image}
                  alt={selectedPhotos[index].name}
                  width={80}
                  height={80}
                />
              ) : (
                <span aria-hidden="true">{index + 1}</span>
              )}
            </div>
          ))}
        </div>
        <div className="pack-progress" aria-hidden="true">
          <span style={{ width: `${(picked / size.pieces) * 100}%` }} />
        </div>
        <div aria-live="polite">
          {lines.length === 0 ? (
            <div className="sum-line empty">Nothing added yet.</div>
          ) : (
            lines.map((t) => (
              <div className="sum-line" key={t.id}>
                <span>{t.name}</span>
                <span>x{counts[t.id]}</span>
              </div>
            ))
          )}
        </div>
        <div className="sum-total">
          <span>Box total</span>
          <b>{money(size.price)}</b>
        </div>
        {!full && (
          <div className="fill-warn">
            {sizeId === "mixed" && picked === 3 && selectedTypeCount === 1
              ? "Add a different treat type to complete your mix."
              : `${remaining} more piece${remaining === 1 ? "" : "s"} to fill this box.`}
          </div>
        )}
        {selectionError && (
          <p className="fill-warn" role="alert">{selectionError}</p>
        )}
        <div style={{ marginTop: 18 }}>
          <button
            className="btn btn-pink btn-block"
            disabled={!full || Boolean(selectionError) || !ready}
            onClick={addBox}
          >
            {`Add ${size.pieces} ${sizeId === "cakepop" ? "cake pops" : "treats"} for ${packLabel} to request`}
          </button>
        </div>
        <p className="sum-note">
          Allergy and dietary notes can be added when you send the request.
          Every box is made for an arranged pickup.
        </p>
      </aside>
    </div>
  );
}
