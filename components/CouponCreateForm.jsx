"use client";
import { useState } from "react";
import AdminIcon from "./AdminIcon";

export const INITIAL_COUPON_FORM = { name: "", mode: "single", discountAmount: "1", minimumSubtotal: "0", quantity: "1", maxRedemptions: "100", code: "", expiresOn: "" };
export default function CouponCreateForm({ initial = INITIAL_COUPON_FORM, busy, onCreate, onCancel }) {
  const [form, setForm] = useState(initial);
  const set = key => event => setForm(current => ({ ...current, [key]: event.target.value }));
  const shared = form.mode === "shared";
  const quantity = shared ? 1 : Number(form.quantity);
  const saving = busy;
  const loading = false;
  function create(event) { event.preventDefault(); onCreate({ ...form, quantity, maxRedemptions: shared ? Number(form.maxRedemptions) : 1, code: quantity === 1 ? form.code : "" }); }
  return <section className="coupon-create-panel"><div className="coupon-panel-head"><h2>Generate a batch</h2><button type="button" className="admin-btn admin-btn-secondary" disabled={busy} onClick={onCancel}>Close</button></div>
    <form className="coupon-create" onSubmit={create}>
      <div className="coupon-create-intro"><span className="coupon-symbol"><AdminIcon name="coupon" width="32" height="32"/></span><h2>Create coupon codes</h2><p>Start with $1 off, or choose any dollar amount. Each code keeps its original terms after printing.</p></div>
      <div className="coupon-create-fields">
        <div className="coupon-mode" role="group" aria-label="Coupon type">{[["single", "Single-use codes", "One unique code per physical coupon"], ["shared", "Shared code", "One code with a total redemption limit"]].map(([value, label, hint]) => <label key={value} className={form.mode === value ? "is-selected" : ""}><input type="radio" name="coupon-mode" value={value} checked={form.mode === value} onChange={set("mode")}/><span><b>{label}</b><small>{hint}</small></span></label>)}</div>
        <div className="admin-field-grid">
          <label className="admin-field">Campaign name<input value={form.name} onChange={set("name")} placeholder="Fall market handouts" required maxLength={80}/><small>The same name groups codes into one promotion. One use per checkout email across all its codes.</small></label>
          <label className="admin-field">Discount ($)<input type="number" value={form.discountAmount} onChange={set("discountAmount")} min="0.01" max="500" step="0.01" required/></label>
          {shared ? <label className="admin-field">Total redemptions allowed<input type="number" value={form.maxRedemptions} onChange={set("maxRedemptions")} min="1" max="1000000" step="1" required/></label> : <label className="admin-field">Number of unique codes<input type="number" value={form.quantity} onChange={set("quantity")} min="1" max="200" step="1" required/></label>}
          {quantity === 1 ? <label className="admin-field">Custom code (optional)<input value={form.code} onChange={set("code")} placeholder="Auto-generate a code" maxLength={32} autoCapitalize="characters" spellCheck={false}/><small>4–32 letters, numbers or hyphens.</small></label> : <div className="coupon-auto-note">Every printed coupon gets its own short 6-character code, like K7M4QX.</div>}
          <label className="admin-field">Minimum order ($)<input type="number" value={form.minimumSubtotal} onChange={set("minimumSubtotal")} min="0" max="100000" step="0.01" required/><small>Leave at 0 for no minimum.</small></label>
          <label className="admin-field">Expiration date (optional)<input type="date" value={form.expiresOn} onChange={set("expiresOn")}/><small>Valid through this date in San Antonio.</small></label>
        </div>
        <div className="coupon-create-footer"><p>One coupon per customer per promotion. Redemption is final across online and physical use. Printed $1 coupons use your supplied design, 12 per sheet (3 across × 4 down).</p><button className="admin-btn admin-btn-primary" disabled={saving || loading}>{saving ? "Generating…" : "Generate codes"}<AdminIcon name="plus"/></button></div>
      </div>
    </form></section>;
}
