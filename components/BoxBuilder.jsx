"use client";
import { useMemo, useState } from "react";
import { useCart } from "./CartProvider";
import Image from "next/image";
import { money } from "@/lib/format";
import { BOX_SIZES } from "@/lib/sample-data";

export default function BoxBuilder({ products = [] }) {
  const treats = products.map((p) => ({ id: p.slug, name: p.name, note: p.blurb, image: p.image || "/logo-transparent.png" }));
  const emptyCounts = () => Object.fromEntries(treats.map((t) => [t.id, 0]));
  const { add, setOpen } = useCart();
  const [sizeId, setSizeId] = useState(BOX_SIZES[0].id);
  const [counts, setCounts] = useState(emptyCounts);

  const size = useMemo(
    () => BOX_SIZES.find((s) => s.id === sizeId) || BOX_SIZES[0],
    [sizeId],
  );
  const picked = useMemo(
    () => Object.values(counts).reduce((n, v) => n + v, 0),
    [counts],
  );

  const remaining = size.pieces - picked;
  const full = remaining === 0;

  function step(id, delta) {
    setCounts((prev) => {
      const next = prev[id] + delta;
      if (next < 0) return prev;
      const total = Object.values(prev).reduce((n, v) => n + v, 0);
      if (delta > 0 && total >= size.pieces) return prev; // never overfill
      return { ...prev, [id]: next };
    });
  }

  /**
   * Shrinking the box can leave more pieces selected than it holds. Trim from
   * the largest pile down until it fits, rather than clearing the whole build.
   */
  function changeSize(nextId) {
    const nextSize = BOX_SIZES.find((s) => s.id === nextId) || BOX_SIZES[0];
    setSizeId(nextId);
    setCounts((prev) => {
      let total = Object.values(prev).reduce((n, v) => n + v, 0);
      if (total <= nextSize.pieces) return prev;
      const next = { ...prev };
      while (total > nextSize.pieces) {
        const biggest = Object.keys(next).reduce((a, b) =>
          next[b] > next[a] ? b : a,
        );
        if (!next[biggest]) break;
        next[biggest] -= 1;
        total -= 1;
      }
      return next;
    });
  }

  function addBox() {
    const contents = treats.filter((t) => counts[t.id] > 0)
      .map((t) => `${t.name} x${counts[t.id]}`)
      .join(", ");
    add({
      key: `box-${size.pieces}-${contents}`,
      name: `Cake Pop Four-Pack (${size.pieces} pc)`,
      desc: contents,
      price: size.price,
      qty: 1,
      bundleEligible: false,
      flavors: treats.filter((t) => counts[t.id] > 0).map((t) => ({ slug: t.id, qty: counts[t.id] })),
      icon: "i-favor",
      color: "#FFD34E",
      tint: "255,211,78",
    });
    setCounts(emptyCounts());
    setOpen(true);
  }

  const lines = treats.filter((t) => counts[t.id] > 0);
  const selectedPhotos = lines.flatMap((t) =>
    Array.from({ length: counts[t.id] }, () => t),
  );

  if (!treats.length) return <div className="b-card"><h2>The next batch is on its way.</h2><p>Please check back for available four-pack flavors, or contact Bonnie to ask what’s baking.</p></div>;

  return (
    <div className="builder">
      <div>
        <div className="b-card rv-anim" style={{ marginBottom: 18 }}>
          <h3>1. Your four-pack</h3>
          <p className="hint">
            Four cake pops for $10—a $6 savings compared with buying singles.
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
                  <em>{money(s.price)}</em>
                </label>
              </div>
            ))}
          </div>
        </div>

        <div className="b-card rv-anim">
          <h3>2. Pick your four flavors</h3>
          <p className="hint">
            Choose {size.pieces} pieces total — {picked} picked,{" "}
            {Math.max(0, remaining)} to go.
          </p>
          <div className="treats">
            {treats.map((t) => (
              <div className={`treat${counts[t.id] ? " is-picked" : ""}`} key={t.id}>
                <Image
                  className="treat-photo"
                  src={t.image}
                  alt=""
                  width={70}
                  height={70}
                />
                <div className="tn">
                  <b>{t.name}</b>
                  <span>{t.note}</span>
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
                  <output key={counts[t.id]} aria-label={`${t.name} quantity`}>
                    {counts[t.id]}
                  </output>
                  <button
                    type="button"
                    onClick={() => step(t.id, 1)}
                    disabled={full}
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
          className="pack-preview"
          aria-label={`${picked} of four cake pops selected`}
        >
          {Array.from({ length: size.pieces }, (_, index) => (
            <div className={`pack-slot${selectedPhotos[index] ? " is-filled" : ""}`} key={index}>
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
            {remaining} more piece{remaining === 1 ? "" : "s"} to fill this box.
          </div>
        )}
        <div style={{ marginTop: 18 }}>
          <button
            className="btn btn-pink btn-block"
            disabled={!full}
            onClick={addBox}
          >
            Add $10 four-pack to request
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
