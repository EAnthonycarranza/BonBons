"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { money } from "@/lib/format";
import RecaptchaCheckbox from "./RecaptchaCheckbox";
import { RECAPTCHA_ACTIONS } from "@/lib/recaptcha-actions";
import "./coupons.css";

export default function CouponRedemption({ admin = false, initialCode = "", onRedeemed }) {
  const [form, setForm] = useState({ code: initialCode, customerEmail: "", customerName: "", subtotal: "", ready: false });
  const [token, setToken] = useState("");
  const [resetKey, setResetKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState(null);
  const attempt = useRef(null);
  const change = key => event => { setForm(current => ({ ...current, [key]: key === "ready" ? event.target.checked : event.target.value })); setError(""); };
  async function redeem(event) {
    event.preventDefault(); if (saving) return;
    if (!admin && !token) { setError("Complete the security check before redeeming."); return; }
    const signature = JSON.stringify(form);
    if (attempt.current?.signature !== signature) attempt.current = { signature, id: crypto.randomUUID() };
    setSaving(true); setError("");
    try {
      const res = await fetch(admin ? "/api/admin/coupons/redeem" : "/api/coupons/redeem", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, requestId: attempt.current.id, recaptchaToken: token }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not redeem this coupon.");
      setReceipt(data.receipt);
      onRedeemed?.();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); if (!admin) { setToken(""); setResetKey(current => current + 1); } }
  }
  if (receipt) return <section className={`coupon-redeem-result${admin ? " is-admin" : ""}`} aria-live="polite">
    <p className="coupon-redeem-badge">Redemption recorded</p><h2>{money(receipt.discountAmount)} off this purchase</h2>
    <code>{receipt.code}</code><p>{receipt.replayed ? "This redemption was already saved. No additional use was consumed." : "This customer's use for this promotion has been recorded."}</p>
    <dl><div><dt>Purchase subtotal</dt><dd>{money(receipt.originalSubtotal)}</dd></div><div><dt>Coupon discount</dt><dd>−{money(receipt.discountAmount)}</dd></div><div><dt>After coupon</dt><dd>{money(receipt.subtotal)}</dd></div></dl>
    <p>{admin ? "Apply this discount to the physical sale. Check the redemption history before accepting an existing confirmation." : "Show this confirmation to the shop for this purchase. Staff will verify the code before applying the discount."}</p>
    <p className="coupon-receipt-reference">{new Date(receipt.redeemedAt).toLocaleString("en-US", { timeZone: "America/Chicago" })} · San Antonio time<br/>Reference: {receipt.reference}</p>
    {admin ? <button type="button" className="admin-btn admin-btn-secondary" onClick={() => { setReceipt(null); setForm({ code: "", customerEmail: "", customerName: "", subtotal: "", ready: false }); attempt.current = null; }}>Redeem another coupon</button> : <Link href="/shop" className="btn btn-ghost">Browse our treats</Link>}
  </section>;
  return <form className={`coupon-redeem-form${admin ? " is-admin" : ""}`} onSubmit={redeem}>
    <h2>{admin ? "Redeem a physical coupon" : "Redeem in person"}</h2><p>{admin ? "Enter the coupon and the customer's email when completing a physical sale. This uses the same limits as online checkout." : "At the event or pickup counter, enter your coupon and the purchase subtotal agreed with the shop. Redeem only when you are ready to use the discount."}</p>
    <fieldset disabled={saving} className="coupon-redeem-fields">
      <label className={admin ? "admin-field" : "coupon-redeem-field"}>Coupon code<input value={form.code} onChange={change("code")} autoCapitalize="characters" autoCorrect="off" spellCheck={false} required maxLength={32} placeholder="BB-…"/></label>
      <label className={admin ? "admin-field" : "coupon-redeem-field"}>Customer email<input type="email" value={form.customerEmail} onChange={change("customerEmail")} autoComplete="email" required maxLength={254}/><small>One use per customer per promotion, identified by email.</small></label>
      <label className={admin ? "admin-field" : "coupon-redeem-field"}>Customer name (optional)<input value={form.customerName} onChange={change("customerName")} autoComplete="name" maxLength={120}/></label>
      <label className={admin ? "admin-field" : "coupon-redeem-field"}>Purchase subtotal before coupon ($)<input type="number" value={form.subtotal} onChange={change("subtotal")} min="0.01" max="100000" step="0.01" required/><small>Before tax. The discount cannot exceed this amount.</small></label>
    </fieldset>
    {!admin ? <><label className="coupon-ready"><input type="checkbox" checked={form.ready} onChange={change("ready")} required disabled={saving}/>The shop is ready to apply this coupon to my purchase. Redeeming uses it immediately.</label><RecaptchaCheckbox onChange={setToken} resetKey={resetKey} action={RECAPTCHA_ACTIONS.coupon}/></> : null}
    {error ? <p className={admin ? "admin-alert is-error" : "coupon-error"} role="alert">{error}</p> : null}
    <button className={admin ? "admin-btn admin-btn-primary" : "btn btn-pink"} disabled={saving}>{saving ? "Redeeming…" : "Redeem now"}</button>
  </form>;
}
