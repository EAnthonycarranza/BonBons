"use client";
import { useState } from "react";
import { isEmail } from "@/lib/format";
import { Icon } from "./Icons";
import { SITE } from "@/lib/sample-data";

const OCCASION_OPTIONS = [
  "Birthday", "Baby shower", "Bridal shower", "Wedding",
  "Quinceañera", "Corporate event", "Just because",
];

const INTERESTS = [
  "Dipped strawberries", "Cake pops", "Custom cookies", "Candy apples",
  "Cupcakes", "Dessert table", "Party favors", "Not sure yet",
];

const EMPTY = {
  name: "", email: "", phone: "", eventDate: "", guests: "",
  occasion: OCCASION_OPTIONS[0], fulfilment: "Pickup", zip: "",
  colors: "", notes: "",
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
      prev.includes(label) ? prev.filter((x) => x !== label) : [...prev, label]
    );
  }

  function validate() {
    const errs = {};
    if (!form.name.trim()) errs.name = "Please tell us your name.";
    if (!isEmail(form.email)) errs.email = "Please enter a valid email.";
    if (!form.eventDate) errs.eventDate = "Please pick a date.";
    if (form.fulfilment === "Delivery" && form.zip && !/^\d{5}$/.test(form.zip.trim())) {
      errs.zip = "Please enter a 5-digit ZIP code.";
    }
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
      if (!res.ok) throw new Error(data.error || "Something went wrong. Please try again.");
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
          <button className="btn btn-dark btn-sm" onClick={() => { setStatus("idle"); setMessage(""); }}>
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
        <div className={`field${errors.eventDate ? " bad" : ""}`}>
          <label htmlFor="f-eventDate">Event date <span className="req">*</span></label>
          <input id="f-eventDate" type="date" value={form.eventDate} onChange={set("eventDate")}
            aria-invalid={errors.eventDate ? "true" : "false"} />
          <div className="err">{errors.eventDate}</div>
        </div>
        <div className="field">
          <label htmlFor="f-guests">Guest count</label>
          <input id="f-guests" type="number" min="1" placeholder="e.g. 40"
            value={form.guests} onChange={set("guests")} />
        </div>
      </div>

      <div className="two">
        <div className="field">
          <label htmlFor="f-occasion">Occasion</label>
          <select id="f-occasion" value={form.occasion} onChange={set("occasion")}>
            {OCCASION_OPTIONS.map((o) => <option key={o}>{o}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="f-phone">Phone (optional)</label>
          <input id="f-phone" type="tel" value={form.phone} onChange={set("phone")} autoComplete="tel" />
        </div>
      </div>

      <div className="field">
        <label>How would you like to receive it?</label>
        <div className="toggle">
          {["Pickup", "Delivery"].map((opt) => (
            <div key={opt}>
              <input
                type="radio" name="fulfil" id={`f-${opt.toLowerCase()}`} value={opt}
                checked={form.fulfilment === opt}
                onChange={() => setForm((f) => ({ ...f, fulfilment: opt }))}
              />
              <label htmlFor={`f-${opt.toLowerCase()}`}>{opt === "Delivery" ? "Local delivery" : "Pickup"}</label>
            </div>
          ))}
        </div>
      </div>

      {form.fulfilment === "Delivery" && (
        <div className={`field${errors.zip ? " bad" : ""}`}>
          <label htmlFor="f-zip">Delivery ZIP code</label>
          <input id="f-zip" inputMode="numeric" maxLength={5} value={form.zip} onChange={set("zip")}
            placeholder="e.g. 78209" />
          <div className="help">We'll confirm whether you're inside our delivery area.</div>
          <div className="err">{errors.zip}</div>
        </div>
      )}

      <div className="field">
        <label>What are you interested in?</label>
        <div className="chips">
          {INTERESTS.map((label, i) => (
            <div className="chip" key={label}>
              <input
                type="checkbox" id={`int-${i}`}
                checked={interests.includes(label)}
                onChange={() => toggleInterest(label)}
              />
              <label htmlFor={`int-${i}`}>{label}</label>
            </div>
          ))}
        </div>
      </div>

      <div className="field">
        <label htmlFor="f-colors">Colors or theme</label>
        <input id="f-colors" value={form.colors} onChange={set("colors")}
          placeholder="e.g. blush pink, gold, ivory" />
        <div className="help">A hex code or a photo of your invitation works too — you can send it in a reply.</div>
      </div>

      <div className="field">
        <label htmlFor="f-notes">Anything else? Allergies, timing, inspiration</label>
        <textarea id="f-notes" value={form.notes} onChange={set("notes")} />
      </div>

      {status === "error" && (
        <p className="err" style={{ display: "block", marginBottom: 14 }} role="alert">{message}</p>
      )}

      <button className="btn btn-pink btn-block" type="submit" disabled={status === "sending"}>
        {status === "sending" ? "Sending…" : "Send my request"}
      </button>
      <p className="help" style={{ marginTop: 12, textAlign: "center" }}>
        Prefer to talk? Text or call {SITE.phone}.
      </p>
    </form>
  );
}

export function QuoteAside() {
  const points = [
    "We reply with a quote, usually the same business day",
    "You get a mockup before anything is made",
    "A 50% deposit locks your date on the calendar",
    "Final details confirmed one week out",
  ];
  return (
    <aside className="form-side">
      <h3>What happens next</h3>
      <ul className="checks">
        {points.map((p) => (
          <li key={p}><Icon name="i-check" /> {p}</li>
        ))}
      </ul>
      <div className="contact">
        <b>Prefer to talk?</b>
        Text or call <a href={SITE.phoneHref}>{SITE.phone}</a>
        <br />
        <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
        <br />
        <span style={{ color: "var(--muted)" }}>Replies Tue–Sat, 10am–6pm</span>
      </div>
    </aside>
  );
}
