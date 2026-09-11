"use client";
import { useState } from "react";
import Image from "next/image";
import { isEmail, isPhone } from "@/lib/format";
import { Icon } from "./Icons";
import { SITE } from "@/lib/sample-data";
import { PaymentMethods } from "./PaymentMarks";
import { CART_EVENT_TYPES, CART_PARTY_SIZES, EVENT_TYPE_OTHER } from "@/lib/cart-rental";

const EMPTY = {
  name: "",
  email: "",
  phone: "",
  eventDate: "",
  eventType: "",
  eventTypeOther: "",
  partySize: "",
  colors: "",
  notes: "",
};

export default function RentCartForm() {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle"); // idle | sending | done | error
  const [message, setMessage] = useState("");

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const isOther = form.eventType === EVENT_TYPE_OTHER;

  function validate() {
    const errs = {};
    if (!form.name.trim()) errs.name = "Please tell us your name.";
    if (!isEmail(form.email)) errs.email = "Please enter a valid email.";
    if (!isPhone(form.phone)) errs.phone = "Please enter a phone number with at least 10 digits.";
    if (!form.eventDate) errs.eventDate = "When is the event?";
    if (!form.eventType) errs.eventType = "What kind of event is it?";
    if (isOther && !form.eventTypeOther.trim()) errs.eventTypeOther = "Tell us what the event is.";
    if (!form.partySize) errs.partySize = "Pick the size closest to your guest list.";
    setErrors(errs);
    return errs;
  }

  async function submit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      const first = Object.keys(errs)[0];
      document.getElementById(first === "partySize" ? "f-partySize-small" : `f-${first}`)?.focus();
      return;
    }

    setStatus("sending");
    try {
      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong. Please try again.");
      setStatus("done");
      setMessage(data.message);
      setForm(EMPTY);
    } catch (err) {
      setStatus("error");
      setMessage(err.message);
    }
  }

  if (status === "done") {
    return (
      <div className="form-ok show" role="status">
        <b>Thanks — your cart request is in.</b>
        <br />
        {message}
        <div style={{ marginTop: 16 }}>
          <button
            className="btn btn-dark btn-sm"
            onClick={() => { setStatus("idle"); setMessage(""); }}
          >
            Send another request
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate>
      <div className="pickup-notice pickup-notice-light" style={{ marginTop: 0 }}>
        <Icon name="i-check" />
        <div>
          <b>This is a request, not a booking</b>
          <span>
            Bonnie reads every request herself and contacts you to go over the
            event, confirm flavors and price, and coordinate the cart. Nothing
            is charged here.
          </span>
        </div>
      </div>

      <div className="two">
        <div className={`field${errors.name ? " bad" : ""}`}>
          <label htmlFor="f-name">Your name <span className="req">*</span></label>
          <input id="f-name" value={form.name} onChange={set("name")} autoComplete="name"
            aria-invalid={errors.name ? "true" : "false"} />
          <div className="err">{errors.name}</div>
        </div>
        <div className={`field${errors.email ? " bad" : ""}`}>
          <label htmlFor="f-email">Email <span className="req">*</span></label>
          <input id="f-email" type="email" value={form.email} onChange={set("email")} autoComplete="email"
            aria-invalid={errors.email ? "true" : "false"} />
          <div className="err">{errors.email}</div>
        </div>
      </div>

      <div className="two">
        <div className={`field${errors.phone ? " bad" : ""}`}>
          <label htmlFor="f-phone">Phone <span className="req">*</span></label>
          <input id="f-phone" type="tel" value={form.phone} onChange={set("phone")} autoComplete="tel"
            aria-invalid={errors.phone ? "true" : "false"} />
          <div className="err">{errors.phone}</div>
        </div>
        <div className={`field${errors.eventDate ? " bad" : ""}`}>
          <label htmlFor="f-eventDate">Event date <span className="req">*</span></label>
          <input id="f-eventDate" type="date" value={form.eventDate} onChange={set("eventDate")}
            aria-invalid={errors.eventDate ? "true" : "false"} />
          <div className="err">{errors.eventDate}</div>
        </div>
      </div>

      <div className="two">
        <div className={`field${errors.eventType || errors.eventTypeOther ? " bad" : ""}`}>
          <label htmlFor="f-eventType">What kind of event? <span className="req">*</span></label>
          <select id="f-eventType" value={form.eventType} onChange={set("eventType")}
            aria-invalid={errors.eventType ? "true" : "false"}>
            <option value="">Choose one…</option>
            {CART_EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          {isOther ? (
            <input
              id="f-eventTypeOther"
              className="event-other"
              value={form.eventTypeOther}
              onChange={set("eventTypeOther")}
              placeholder="Type the event, e.g. retirement party"
              aria-label="What kind of event? Type the event"
              maxLength={120}
              autoFocus
              aria-invalid={errors.eventTypeOther ? "true" : "false"}
            />
          ) : null}
          <div className="err">{errors.eventType || errors.eventTypeOther}</div>
        </div>
        <div className="field">
          <label htmlFor="f-colors">Theme or colors (optional)</label>
          <input id="f-colors" value={form.colors} onChange={set("colors")}
            placeholder="e.g. blush pink and gold" />
        </div>
      </div>

      <div className={`field${errors.partySize ? " bad" : ""}`}>
        <label id="f-partySize-label">About how many guests? <span className="req">*</span></label>
        <div className="sizes" role="radiogroup" aria-labelledby="f-partySize-label">
          {CART_PARTY_SIZES.map((size) => (
            <div className="size" key={size.id}>
              <input
                type="radio"
                name="partySize"
                id={`f-partySize-${size.id}`}
                value={size.id}
                checked={form.partySize === size.id}
                onChange={() => setForm((f) => ({ ...f, partySize: size.id }))}
              />
              <label htmlFor={`f-partySize-${size.id}`}>
                <b>{size.label}</b>
                <span>{size.range}</span>
                {size.note ? <small className="size-note">{size.note}</small> : null}
              </label>
            </div>
          ))}
        </div>
        <div className="err">{errors.partySize}</div>
        <p className="help">
          The cart is on the small side, so it serves up to {CART_PARTY_SIZES.at(-1).max} guests.
          Bigger crowd? Say so in the notes and Bonnie will suggest what works.
        </p>
      </div>

      <div className="field">
        <label htmlFor="f-notes">Anything else? Venue, flavors you&rsquo;re hoping for, allergies</label>
        <textarea id="f-notes" value={form.notes} onChange={set("notes")} />
      </div>

      {status === "error" && (
        <p className="err" style={{ display: "block", marginBottom: 14 }} role="alert">{message}</p>
      )}

      <button className="btn btn-pink btn-block" type="submit" disabled={status === "sending"}>
        {status === "sending" ? "Sending…" : "Request the cart"}
      </button>
      <p className="help" style={{ marginTop: 12, textAlign: "center" }}>
        No payment is collected on this website. Once Bonnie confirms your event
        and total, you can pay through <a href={SITE.paymentUrl} target="_blank" rel="noopener noreferrer">Bon Bon&rsquo;s payment options</a> or in cash.
      </p>
      <PaymentMethods className="pay-methods-center" />
    </form>
  );
}

export function RentCartAside() {
  const steps = [
    {
      title: "You send the event details",
      body: "Date, type of event, and roughly how many guests. That's all Bonnie needs to get started.",
    },
    {
      title: "Bonnie confirms flavors and price",
      body: "She'll reach out to talk through flavors, how many pops the cart will carry, and give you a quote.",
    },
    {
      title: "Then we coordinate the cart",
      body: "Once the order is set, we work out the cart itself with you — timing, where it goes, and setup.",
    },
  ];
  return (
    <aside className="form-side">
      <Image
        src="/products/bonbons-colorful-pops-styled.webp"
        alt="Bon Bon's individually wrapped cake pops in colorful finishes"
        width={600}
        height={360}
        className="quote-aside-photo"
      />
      <h3>How it works</h3>
      <ol className="cart-steps">
        {steps.map((s, i) => (
          <li key={s.title}>
            <span className="cart-step-n" aria-hidden="true">{i + 1}</span>
            <div>
              <b>{s.title}</b>
              <p>{s.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </aside>
  );
}
