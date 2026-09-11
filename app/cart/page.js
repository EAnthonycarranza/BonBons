"use client";
import { useCallback, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import ProductThumbnail from "@/components/ProductThumbnail";
import { useCart } from "@/components/CartProvider";
import { Icon } from "@/components/Icons";
import BundleNudge from "@/components/BundleNudge";
import { money, isEmail, isPhone } from "@/lib/format";
import { usePrices } from "@/components/PricesProvider";
import { hasRecaptchaClientConfig } from "@/lib/recaptcha-client";
import RecaptchaDisclosure from "@/components/RecaptchaDisclosure";
import RecaptchaCheckbox from "@/components/RecaptchaCheckbox";
import { SITE } from "@/lib/sample-data";

export default function CartPage() {
  const { singleLabel, packLabel } = usePrices();
  const {
    items,
    remove,
    setQty,
    subtotal,
    clear,
    ready,
    singlePopCount,
    suggestedFourPacks,
    potentialSavings,
    convertSinglesToFourPacks,
  } = useCart();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    wantedDate: "",
    notes: "",
    paymentChoice: "online",
  });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle");
  const [result, setResult] = useState(null);
  const [recaptchaToken, setRecaptchaToken] = useState("");
  const [captchaResetKey, setCaptchaResetKey] = useState(0);

  const onCaptchaChange = useCallback((token) => {
    setRecaptchaToken(token);
    if (token) setErrors((current) => ({ ...current, captcha: "" }));
  }, []);

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setErrors((current) => ({ ...current, [k]: "" }));
  };
  async function submit(e) {
    e.preventDefault();
    if (status === "sending") return;
    const errs = {};
    if (!form.name.trim()) errs.name = "Please tell us your name.";
    if (!isEmail(form.email)) errs.email = "Please enter a valid email.";
    if (!isPhone(form.phone))
      errs.phone = "Please enter a phone number with at least 10 digits.";
    if (!form.wantedDate) errs.wantedDate = "When do you need it?";
    if (!recaptchaToken)
      errs.captcha =
        "Please complete the “I'm not a robot” check before sending your request.";
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
          wantedDate: form.wantedDate,
          notes: form.notes,
          paymentChoice: form.paymentChoice,
          recaptchaToken,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      setResult(data);
      setStatus("done");
      clear();
    } catch (err) {
      // Google tokens are single-use, including when a later order save fails.
      setRecaptchaToken("");
      setCaptchaResetKey((current) => current + 1);
      setStatus("error");
      setResult({ error: err.message });
    }
  }

  if (status === "done") {
    return (
      <section className="sec">
        <div className="wrap" style={{ maxWidth: 720 }}>
          <div className="form-ok show">
            <b>Thanks — your pickup request is in.</b>
            <br />
            {result?.message}
            {result?.paymentChoice === "cash" && result?.cashChoiceSaved ? (
              <p style={{ marginTop: 12 }}>
                <strong>Paying cash at pickup.</strong> Changed your mind? Your confirmation email will have a link to pay online instead.
              </p>
            ) : null}
            <div style={{ marginTop: 16 }}>
              <Link className="btn btn-dark btn-sm" href="/shop">
                Browse more cake pops
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="sec checkout-page">
      <div className="wrap">
        <div className="sec-top checkout-heading rv-anim">
          <div>
            <div className="eyebrow">Pickup order request</div>
            <h1>
              Review your <em>request.</em>
            </h1>
            <p>
              Your picks, made for you. Bonnie will confirm availability,
              your total, and pickup details before you pay.
            </p>
          </div>
          <Link className="btn btn-ghost" href="/shop">
            ← Keep shopping
          </Link>
        </div>

        {!ready ? (
          <p style={{ color: "var(--muted)" }}>Loading your request…</p>
        ) : items.length === 0 ? (
          <div className="tile" style={{ textAlign: "center", padding: 60 }}>
            <Image
              className="drawer-empty-photo"
              src="/products/bonbons-colorful-pops-styled.webp"
              alt="Styled image of Bon Bon’s wrapped cake-pop assortment"
              width={150}
              height={150}
            />
            <h3 style={{ marginTop: 14, fontSize: 22 }}>
              Your request list is empty
            </h3>
            <p style={{ color: "var(--muted)", marginTop: 8 }}>
              Add one cake pop for {singleLabel}, or build your own four-pack for {packLabel}.
            </p>
            <div className="hero-cta" style={{ justifyContent: "center" }}>
              <Link className="btn btn-pink" href="/shop">
                Shop cake pops
              </Link>
              <Link className="btn btn-ghost" href="/build-a-box">
                Build 4 for {packLabel}
              </Link>
            </div>
          </div>
        ) : (
          <div className="form-wrap checkout-layout">
            <div className="checkout-summary rv-anim">
              <div className="checkout-card-heading"><span className="checkout-step">01</span><div><h2>Your cake pops</h2><p>Singles and four-packs, just as you chose.</p></div></div>
              <div className="tile" style={{ padding: 8 }}>
                {items.map((i) => (
                  <div
                    className="ci"
                    key={i.key}
                    style={{ padding: "16px 14px" }}
                  >
                    <div
                      className="ph"
                      style={{ background: `rgba(${i.tint},.16)` }}
                    >
                      <ProductThumbnail item={i} />
                    </div>
                    <div className="info">
                      <b>{i.name}</b>
                      <span>{i.desc}</span>
                      <div className="stepper" style={{ marginTop: 8 }}>
                        <button
                          type="button"
                          onClick={() => setQty(i.key, i.qty - 1)}
                          aria-label={`One fewer ${i.name}`}
                        >
                          −
                        </button>
                        <output key={i.qty} aria-label={`${i.name} quantity`}>{i.qty}</output>
                        <button
                          type="button"
                          onClick={() => setQty(i.key, i.qty + 1)}
                          aria-label={`One more ${i.name}`}
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <div className="right">
                      <b>{money(i.price * i.qty)}</b>
                      <br />
                      <button className="ci-rm" aria-label={`Remove ${i.name}`} onClick={() => remove(i.key)}>
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <BundleNudge />

              <div className="tile" style={{ marginTop: 16, padding: 22 }}>
                <div className="dtot">
                  <span>Estimated total</span>
                  <b>{money(subtotal)}</b>
                </div>
                <div className="dnote">
                  The owner confirms the final total before your order is
                  accepted.
                </div>
              </div>
              <a className="btn btn-ghost continue-details" href="#pickup-details">Continue to your details <span aria-hidden="true">↓</span></a>
            </div>

            <div className="form-side checkout-details" id="pickup-details">
              <div className="checkout-card-heading"><span className="checkout-step">02</span><div><h2>Your details</h2><p>Tell us how to reach you and when you’d like pickup.</p></div></div>
              <form
                className="pickup-request-form"
                onSubmit={submit}
                noValidate
              >
                <div className={`field${errors.name ? " bad" : ""}`}>
                  <label htmlFor="c-name" style={{ color: "var(--cream)" }}>
                    Name <span className="req">*</span>
                  </label>
                  <input
                    id="c-name"
                    name="name"
                    required
                    aria-invalid={Boolean(errors.name)}
                    aria-describedby={errors.name ? "c-name-error" : undefined}
                    enterKeyHint="next"
                    value={form.name}
                    onChange={set("name")}
                    autoComplete="name"
                  />
                  <div className="err" id="c-name-error">{errors.name}</div>
                </div>
                <div className={`field${errors.email ? " bad" : ""}`}>
                  <label htmlFor="c-email" style={{ color: "var(--cream)" }}>
                    Email <span className="req">*</span>
                  </label>
                  <input
                    id="c-email"
                    name="email"
                    type="email"
                    inputMode="email"
                    autoCapitalize="none"
                    spellCheck={false}
                    required
                    aria-invalid={Boolean(errors.email)}
                    aria-describedby={errors.email ? "c-email-error" : undefined}
                    enterKeyHint="next"
                    value={form.email}
                    onChange={set("email")}
                    autoComplete="email"
                  />
                  <div className="err" id="c-email-error">{errors.email}</div>
                </div>
                <div className={`field${errors.phone ? " bad" : ""}`}>
                  <label htmlFor="c-phone" style={{ color: "var(--cream)" }}>
                    Phone <span className="req">*</span>
                  </label>
                  <input
                    id="c-phone"
                    name="phone"
                    type="tel"
                    inputMode="tel"
                    required
                    aria-invalid={Boolean(errors.phone)}
                    aria-describedby={errors.phone ? "c-phone-error" : undefined}
                    enterKeyHint="next"
                    value={form.phone}
                    onChange={set("phone")}
                    autoComplete="tel"
                  />
                  <div className="err" id="c-phone-error">{errors.phone}</div>
                </div>
                <div className={`field${errors.wantedDate ? " bad" : ""}`}>
                  <label
                    htmlFor="c-wantedDate"
                    style={{ color: "var(--cream)" }}
                  >
                    Preferred pickup date <span className="req">*</span>
                  </label>
                  <input
                    id="c-wantedDate"
                    name="wantedDate"
                    type="date"
                    required
                    aria-invalid={Boolean(errors.wantedDate)}
                    aria-describedby={errors.wantedDate ? "c-date-error" : "c-date-help"}
                    value={form.wantedDate}
                    onChange={set("wantedDate")}
                  />
                  <div className="err" id="c-date-error">{errors.wantedDate}</div>
                  <p className="help" id="c-date-help">We’ll confirm the exact time with you.</p>
                </div>
                <div className="pickup-notice">
                  <Icon name="i-check" />
                  <div>
                    <b>Pickup only, by appointment</b>
                    <span>
                      The owner will confirm the pickup time and location with
                      you directly.
                    </span>
                  </div>
                </div>
                <div className="field">
                  <label style={{ color: "var(--cream)" }}>How will you pay?</label>
                  <div className="toggle" role="radiogroup" aria-label="Payment method">
                    {[
                      { id: "online", label: "Venmo, Cash App or Zelle" },
                      { id: "cash", label: "Cash at pickup" },
                    ].map((opt) => (
                      <div key={opt.id}>
                        <input
                          type="radio"
                          name="c-pay"
                          id={`c-pay-${opt.id}`}
                          value={opt.id}
                          checked={form.paymentChoice === opt.id}
                          onChange={() => setForm((f) => ({ ...f, paymentChoice: opt.id }))}
                        />
                        <label htmlFor={`c-pay-${opt.id}`}>{opt.label}</label>
                      </div>
                    ))}
                  </div>
                  <p className="help">
                    {form.paymentChoice === "cash"
                      ? "Bring the confirmed total with you. Nothing to send ahead."
                      : "You'll get a payment link once your order and total are confirmed. Nothing is charged now."}
                  </p>
                </div>
                <div className="field">
                  <label htmlFor="c-notes" style={{ color: "var(--cream)" }}>
                    Allergies or notes
                  </label>
                  <textarea
                    id="c-notes"
                    name="notes"
                    rows={3}
                    placeholder="Allergies, a special request, or anything we should know."
                    value={form.notes}
                    onChange={set("notes")}
                  />
                </div>

                <RecaptchaCheckbox
                  onChange={onCaptchaChange}
                  resetKey={captchaResetKey}
                  error={errors.captcha}
                />

                {status === "error" && (
                  <p
                    className="err"
                    style={{ display: "block", marginBottom: 12 }}
                    role="alert"
                  >
                    {result?.error}
                  </p>
                )}

                <button
                  className="btn btn-pink btn-block"
                  type="submit"
                  disabled={status === "sending" || !hasRecaptchaClientConfig()}
                >
                  {status === "sending"
                    ? "Sending your request…"
                    : `Send pickup request · ${money(subtotal)} est.`}
                </button>
                <RecaptchaDisclosure />
                <p className="sum-note" style={{ textAlign: "center" }}>
                  Please wait for Bonnie to confirm your order and total before paying.
                  Then use our <a href={SITE.paymentUrl} target="_blank" rel="noopener noreferrer" style={{color:"var(--pink-2)",textDecoration:"underline"}}>payment options</a> to choose Venmo, Cash App, or Zelle.
                  Include your order number. Payments are handled outside this website.
                </p>
              </form>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
