"use client";
import { useState } from "react";
import Image from "next/image";
import { isEmail, isPhone } from "@/lib/format";
import { Icon } from "./Icons";
import { SITE } from "@/lib/sample-data";

const OCCASION_OPTIONS = [
  "No event — just a custom order",
  "Birthday",
  "Baby shower",
  "Bridal shower",
  "Wedding",
  "Quinceañera",
  "Corporate event",
  "Other",
];

const INTERESTS = [
  "Single cake pops",
  "Mix-and-match four-pack",
  "Custom colors",
  "Larger quantity",
  "Event theme",
  "Not sure yet",
];

const EMPTY = {
  name: "",
  email: "",
  phone: "",
  eventDate: "",
  guests: "",
  occasion: OCCASION_OPTIONS[0],
  colors: "",
  notes: "",
};

export default function QuoteForm() {
  const [form, setForm] = useState(EMPTY);
  const [interests, setInterests] = useState([]);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle"); // idle | sending | done | error
  const [message, setMessage] = useState("");

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  function toggleInterest(label) {
    setInterests((prev) =>
      prev.includes(label) ? prev.filter((x) => x !== label) : [...prev, label],
    );
  }

  function validate() {
    const errs = {};
    if (!form.name.trim()) errs.name = "Please tell us your name.";
    if (!isEmail(form.email)) errs.email = "Please enter a valid email.";
    if (!isPhone(form.phone))
      errs.phone = "Please enter a phone number with at least 10 digits.";
    if (!form.eventDate) errs.eventDate = "Please pick a date.";
    setErrors(errs);
    return errs;
  }

  async function submit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      const first = document.getElementById(`f-${Object.keys(errs)[0]}`);
      first?.focus();
      return;
    }

    setStatus("sending");
    try {
      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, interests }),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(
          data.error || "Something went wrong. Please try again.",
        );
      setStatus("done");
      setMessage(data.message);
      setForm(EMPTY);
      setInterests([]);
    } catch (err) {
      setStatus("error");
      setMessage(err.message);
    }
  }

  if (status === "done") {
    return (
      <div className="form-ok show" role="status">
        <b>Thanks — your request is in.</b>
        <br />
        {message}
        <div style={{ marginTop: 16 }}>
          <button
            className="btn btn-dark btn-sm"
            onClick={() => {
              setStatus("idle");
              setMessage("");
            }}
          >
            Send another request
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate>
      <div className="two">
        <div className={`field${errors.name ? " bad" : ""}`}>
          <label htmlFor="f-name">
            Your name <span className="req">*</span>
          </label>
          <input
            id="f-name"
            value={form.name}
            onChange={set("name")}
            autoComplete="name"
            aria-invalid={errors.name ? "true" : "false"}
          />
          <div className="err">{errors.name}</div>
        </div>
        <div className={`field${errors.email ? " bad" : ""}`}>
          <label htmlFor="f-email">
            Email <span className="req">*</span>
          </label>
          <input
            id="f-email"
            type="email"
            value={form.email}
            onChange={set("email")}
            autoComplete="email"
            aria-invalid={errors.email ? "true" : "false"}
          />
          <div className="err">{errors.email}</div>
        </div>
      </div>

      <div className="two">
        <div className={`field${errors.eventDate ? " bad" : ""}`}>
          <label htmlFor="f-eventDate">
            Requested pickup date <span className="req">*</span>
          </label>
          <input
            id="f-eventDate"
            type="date"
            value={form.eventDate}
            onChange={set("eventDate")}
            aria-invalid={errors.eventDate ? "true" : "false"}
          />
          <div className="err">{errors.eventDate}</div>
        </div>
        <div className="field">
          <label htmlFor="f-guests">About how many cake pops?</label>
          <input
            id="f-guests"
            type="number"
            min="1"
            placeholder="e.g. 40"
            value={form.guests}
            onChange={set("guests")}
          />
        </div>
      </div>

      <div className="two">
        <div className="field">
          <label htmlFor="f-occasion">Occasion</label>
          <select
            id="f-occasion"
            value={form.occasion}
            onChange={set("occasion")}
          >
            {OCCASION_OPTIONS.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </div>
        <div className={`field${errors.phone ? " bad" : ""}`}>
          <label htmlFor="f-phone">
            Phone <span className="req">*</span>
          </label>
          <input
            id="f-phone"
            type="tel"
            value={form.phone}
            onChange={set("phone")}
            autoComplete="tel"
            aria-invalid={errors.phone ? "true" : "false"}
          />
          <div className="err">{errors.phone}</div>
        </div>
      </div>

      <div className="pickup-notice pickup-notice-light">
        <Icon name="i-check" />
        <div>
          <b>Pickup only, by appointment</b>
          <span>
            The owner will confirm the pickup date, time, and location after
            reviewing your request.
          </span>
        </div>
      </div>

      <div className="field">
        <label>What kind of cake pops are you interested in?</label>
        <div className="chips">
          {INTERESTS.map((label, i) => (
            <div className="chip" key={label}>
              <input
                type="checkbox"
                id={`int-${i}`}
                checked={interests.includes(label)}
                onChange={() => toggleInterest(label)}
              />
              <label htmlFor={`int-${i}`}>{label}</label>
            </div>
          ))}
        </div>
      </div>

      <div className="field">
        <label htmlFor="f-colors">Colors or theme (optional)</label>
        <input
          id="f-colors"
          value={form.colors}
          onChange={set("colors")}
          placeholder="e.g. blush pink, gold, ivory"
        />
        <div className="help">
          A hex code or a photo of your invitation works too — you can send it
          in a reply.
        </div>
      </div>

      <div className="field">
        <label htmlFor="f-notes">
          Anything else? Allergies, timing, inspiration
        </label>
        <textarea id="f-notes" value={form.notes} onChange={set("notes")} />
      </div>

      {status === "error" && (
        <p
          className="err"
          style={{ display: "block", marginBottom: 14 }}
          role="alert"
        >
          {message}
        </p>
      )}

      <button
        className="btn btn-pink btn-block"
        type="submit"
        disabled={status === "sending"}
      >
        {status === "sending" ? "Sending…" : "Send my request"}
      </button>
      <p className="help" style={{ marginTop: 12, textAlign: "center" }}>
        Wait until Bonnie confirms your order and total, then open <a href={SITE.paymentUrl} target="_blank" rel="noopener noreferrer">Bon Bon’s payment options</a>. No payment is collected on this website.
      </p>
    </form>
  );
}

export function QuoteAside() {
  const points = [
    "Your request appears in the private staff dashboard",
    "The owner contacts you to confirm flavors, quantity, and price",
    "Pickup time and location are arranged directly with you",
    "After confirmation, choose a payment option on Bon Bon’s dot.cards profile",
  ];
  return (
    <aside className="form-side">
      <Image
        src="/products/bonbons-colorful-pops-styled.webp"
        alt="Styled image of Bon Bon’s individually wrapped cake pops in colorful finishes"
        width={600}
        height={360}
        className="quote-aside-photo"
      />
      <h3>What happens next</h3>
      <ul className="checks">
        {points.map((p) => (
          <li key={p}>
            <Icon name="i-check" /> {p}
          </li>
        ))}
      </ul>
      <div className="contact">
        <b>Prefer to talk?</b>
        <a href={SITE.facebook} target="_blank" rel="noopener noreferrer">
          Message us on Facebook ↗
        </a>
      </div>
    </aside>
  );
}
