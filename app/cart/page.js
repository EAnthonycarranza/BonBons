"use client";
import { useState } from "react";
import Link from "next/link";
import { useCart } from "@/components/CartProvider";
import { Icon } from "@/components/Icons";
import { money, isEmail } from "@/lib/format";
import { SITE } from "@/lib/sample-data";

export default function CartPage() {
  const { items, remove, setQty, subtotal, clear, ready } = useCart();
  const [form, setForm] = useState({
    name: "", email: "", phone: "", fulfilment: "Pickup", wantedDate: "", notes: "",
  });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle");
  const [result, setResult] = useState(null);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const remaining = SITE.freeDeliveryOver - subtotal;

  async function submit(e) {
    e.preventDefault();
    const errs = {};
    if (!form.name.trim()) errs.name = "Please tell us your name.";
    if (!isEmail(form.email)) errs.email = "Please enter a valid email.";
    if (!form.wantedDate) errs.wantedDate = "When do you need it?";
    setErrors(errs);
    if (Object.keys(errs).length) {
      document.getElementById(`c-${Object.keys(errs)[0]}`)?.focus();
      return;
    }

    setStatus("sending");
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          customer: { name: form.name, email: form.email, phone: form.phone },
          fulfilment: form.fulfilment,
          wantedDate: form.wantedDate,
          notes: form.notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      setResult(data);
      setStatus("done");
      clear();
    } catch (err) {
      setStatus("error");
      setResult({ error: err.message });
    }
  }

  if (status === "done") {
    return (
      <section className="sec">
        <div className="wrap" style={{ maxWidth: 720 }}>
          <div className="form-ok show">
            <b>Thanks — we&apos;ve got your order.</b>
            <br />
            {result?.message}
            <div style={{ marginTop: 16 }}>
              <Link className="btn btn-dark btn-sm" href="/shop">Keep shopping</Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="sec">
      <div className="wrap">
        <div className="sec-top">
          <div>
            <div className="eyebrow">Your order</div>
            <h2>Review and send</h2>
            <p>
              We confirm every order by email before making anything. Payment is taken
              at pickup or delivery.
            </p>
          </div>
          <Link className="btn btn-ghost" href="/shop">← Keep shopping</Link>
        </div>

        {!ready ? (
          <p style={{ color: "var(--muted)" }}>Loading your cart…</p>
        ) : items.length === 0 ? (
          <div className="tile" style={{ textAlign: "center", padding: 60 }}>
            <Icon name="i-bag" style={{ width: 52, height: 52, opacity: .35 }} />
            <h3 style={{ marginTop: 14, fontSize: 22 }}>Your cart is empty</h3>
            <p style={{ color: "var(--muted)", marginTop: 8 }}>
              Add a ready-made box, or build your own.
            </p>
            <div className="hero-cta" style={{ justifyContent: "center" }}>
              <Link className="btn btn-pink" href="/shop">Shop treats</Link>
              <Link className="btn btn-ghost" href="/build-a-box">Build a box</Link>
            </div>
          </div>
        ) : (
          <div className="form-wrap">
            <div>
              <div className="tile" style={{ padding: 8 }}>
                {items.map((i) => (
                  <div className="ci" key={i.key} style={{ padding: "16px 14px" }}>
                    <div className="ph" style={{ background: `rgba(${i.tint},.16)` }}>
                      <Icon name={i.icon} style={{ color: i.color }} />
                    </div>
                    <div className="info">
                      <b>{i.name}</b>
                      <span>{i.desc}</span>
                      <div className="stepper" style={{ marginTop: 8 }}>
                        <button type="button" onClick={() => setQty(i.key, i.qty - 1)} aria-label={`One fewer ${i.name}`}>−</button>
                        <output>{i.qty}</output>
                        <button type="button" onClick={() => setQty(i.key, i.qty + 1)} aria-label={`One more ${i.name}`}>+</button>
                      </div>
                    </div>
                    <div className="right">
                      <b>{money(i.price * i.qty)}</b>
                      <br />
                      <button className="ci-rm" onClick={() => remove(i.key)}>Remove</button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="tile" style={{ marginTop: 16, padding: 22 }}>
                <div className="dtot"><span>Subtotal</span><b>{money(subtotal)}</b></div>
                <div className="dnote">
                  {remaining > 0
                    ? `${money(remaining)} more for free local delivery.`
                    : "Free local delivery unlocked."}
                </div>
              </div>
            </div>

            <div className="form-side">
              <h3>Your details</h3>
              <form onSubmit={submit} noValidate>
                <div className={`field${errors.name ? " bad" : ""}`}>
                  <label htmlFor="c-name" style={{ color: "var(--cream)" }}>Name <span className="req">*</span></label>
                  <input id="c-name" value={form.name} onChange={set("name")} autoComplete="name" />
                  <div className="err">{errors.name}</div>
                </div>
                <div className={`field${errors.email ? " bad" : ""}`}>
                  <label htmlFor="c-email" style={{ color: "var(--cream)" }}>Email <span className="req">*</span></label>
                  <input id="c-email" type="email" value={form.email} onChange={set("email")} autoComplete="email" />
                  <div className="err">{errors.email}</div>
                </div>
                <div className="field">
                  <label htmlFor="c-phone" style={{ color: "var(--cream)" }}>Phone (optional)</label>
                  <input id="c-phone" type="tel" value={form.phone} onChange={set("phone")} autoComplete="tel" />
                </div>
                <div className={`field${errors.wantedDate ? " bad" : ""}`}>
                  <label htmlFor="c-wantedDate" style={{ color: "var(--cream)" }}>
                    When do you need it? <span className="req">*</span>
                  </label>
                  <input id="c-wantedDate" type="date" value={form.wantedDate} onChange={set("wantedDate")} />
                  <div className="err">{errors.wantedDate}</div>
                </div>
                <div className="field">
                  <label style={{ color: "var(--cream)" }}>Pickup or delivery?</label>
                  <div className="toggle">
                    {["Pickup", "Delivery"].map((opt) => (
                      <div key={opt}>
                        <input type="radio" name="cfulfil" id={`c-${opt}`} checked={form.fulfilment === opt}
                          onChange={() => setForm((f) => ({ ...f, fulfilment: opt }))} />
                        <label htmlFor={`c-${opt}`}>{opt}</label>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="c-notes" style={{ color: "var(--cream)" }}>Allergies or notes</label>
                  <textarea id="c-notes" value={form.notes} onChange={set("notes")} />
                </div>

                {status === "error" && (
                  <p className="err" style={{ display: "block", marginBottom: 12 }} role="alert">
                    {result?.error}
                  </p>
                )}

                <button className="btn btn-pink btn-block" type="submit" disabled={status === "sending"}>
                  {status === "sending" ? "Sending…" : `Send order · ${money(subtotal)}`}
                </button>
                <p className="sum-note" style={{ textAlign: "center" }}>
                  No payment is taken here — we confirm by email first.
                </p>
              </form>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
