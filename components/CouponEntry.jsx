"use client";
import { useEffect, useRef, useState } from "react";
import { money } from "@/lib/format";
import "./coupons.css";

export default function CouponEntry({ items, stamp, disabled, onChange, onBusy, onDraft, submitError }) {
  const [code, setCode] = useState("");
  const [applied, setApplied] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const sequence = useRef(0);
  useEffect(() => {
    sequence.current += 1;
    setApplied(null); setError(""); setBusy(false); onChange(null); onBusy(false);
  }, [stamp, onChange, onBusy]);
  function edit(value) {
    sequence.current += 1;
    setCode(value.toUpperCase()); setApplied(null); setError(""); setBusy(false);
    onDraft(value);
    onChange(null); onBusy(false);
  }
  async function apply() {
    const attempt = ++sequence.current;
    setBusy(true); onBusy(true); setError("");
    try {
      const res = await fetch("/api/coupons/validate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, items }) });
      const data = await res.json();
      if (attempt !== sequence.current) return;
      if (!res.ok) throw new Error(data.error || "Could not check this coupon.");
      setApplied(data.coupon); setCode(data.coupon.code); onChange({ coupon: data.coupon, stamp });
    } catch (err) { if (attempt === sequence.current) { setError(err.message); setApplied(null); onChange(null); } }
    finally { if (attempt === sequence.current) { setBusy(false); onBusy(false); } }
  }
  return <div className="checkout-coupon">
    <label htmlFor="coupon-code">Have a physical coupon?</label>
    <p>Enter the code printed on your coupon. One coupon per customer per promotion, using your checkout email.</p>
    <div className="checkout-coupon-input"><input id="coupon-code" value={code} onChange={e => edit(e.target.value)} placeholder="Coupon code" maxLength={32} autoCapitalize="characters" autoComplete="off" spellCheck={false} disabled={disabled} aria-invalid={Boolean(error || submitError)} aria-describedby="coupon-feedback" onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); if (!busy && code.trim() && !disabled) apply(); } }}/><button className="btn btn-ghost btn-sm" type="button" onClick={applied ? () => edit("") : apply} disabled={disabled || busy || !code.trim()}>{busy ? "Checking…" : applied ? "Remove" : "Apply"}</button></div>
    <div id="coupon-feedback" role="status" aria-live="polite">{error || submitError ? <p className="coupon-error">{error || submitError}</p> : applied ? <p className="coupon-success">{applied.code} applied · {money(applied.discountAmount)} off</p> : code ? <p className="coupon-hint">Apply your code before sending the request. Cart changes require applying it again.</p> : null}</div>
  </div>;
}
