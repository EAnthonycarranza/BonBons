"use client";
import { useMemo, useState } from "react";
import { useCart } from "./CartProvider";
import { Icon } from "./Icons";
import { money } from "@/lib/format";
import { BOX_SIZES, BOX_TREATS } from "@/lib/sample-data";

const emptyCounts = () => Object.fromEntries(BOX_TREATS.map((t) => [t.id, 0]));

export default function BoxBuilder() {
  const { add, setOpen } = useCart();
  const [sizeId, setSizeId] = useState(BOX_SIZES[0].id);
  const [counts, setCounts] = useState(emptyCounts);

  const size = useMemo(
    () => BOX_SIZES.find((s) => s.id === sizeId) || BOX_SIZES[0],
    [sizeId]
  );
  const picked = useMemo(
    () => Object.values(counts).reduce((n, v) => n + v, 0),
    [counts]
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
        const biggest = Object.keys(next).reduce((a, b) => (next[b] > next[a] ? b : a));
        if (!next[biggest]) break;
        next[biggest] -= 1;
        total -= 1;
      }
      return next;
    });
  }

  function addBox() {
    const contents = BOX_TREATS.filter((t) => counts[t.id] > 0)
      .map((t) => `${t.name} x${counts[t.id]}`)
      .join(", ");
    add({
      key: `box-${size.pieces}-${contents}`,
      name: `Custom Box (${size.pieces} pc)`,
      desc: contents,
      price: size.price,
      qty: 1,
      icon: "i-favor",
      color: "#FFD34E",
      tint: "255,211,78",
    });
    setCounts(emptyCounts());
    setOpen(true);
  }

  const lines = BOX_TREATS.filter((t) => counts[t.id] > 0);

  return (
    <div className="builder">
      <div>
        <div className="b-card" style={{ marginBottom: 18 }}>
          <h3>1. Choose your box size</h3>
          <p className="hint">Bigger boxes bring the per-piece price down.</p>
          <div className="sizes">
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

        <div className="b-card">
          <h3>2. Fill it with treats</h3>
          <p className="hint">
            Choose {size.pieces} pieces total — {picked} picked, {Math.max(0, remaining)} to go.
          </p>
          <div className="treats">
            {BOX_TREATS.map((t) => (
              <div className="treat" key={t.id}>
                <Icon name={t.icon} className="ico" style={{ color: t.color }} />
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
                  >−</button>
                  <output aria-label={`${t.name} quantity`}>{counts[t.id]}</output>
                  <button
                    type="button"
                    onClick={() => step(t.id, 1)}
                    disabled={full}
                    aria-label={`One more ${t.name}`}
                  >+</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <aside className="summary" aria-label="Box summary">
        <h3>Your box</h3>
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
          <button className="btn btn-pink btn-block" disabled={!full} onClick={addBox}>
            Add box to cart
          </button>
        </div>
        <p className="sum-note">
          Allergy and dietary notes can be added when you check out. Every box is made
          within 72 hours of pickup or delivery.
        </p>
      </aside>
    </div>
  );
}
