"use client";
import { useId, useState } from "react";
import RecaptchaCheckbox from "./RecaptchaCheckbox";
import { RECAPTCHA_ACTIONS } from "@/lib/recaptcha-actions";
import "./newsletter.css";

export default function NewsletterForm({ source = "homepage" }) {
  const id = useId();
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [token, setToken] = useState("");
  const [resetKey, setResetKey] = useState(0);
  const [state, setState] = useState({ status: "idle", msg: "" });
  async function submit(event) {
    event.preventDefault();
    if (!token) { setState({ status: "error", msg: "Please complete the security check." }); return; }
    setState({ status: "sending", msg: "" });
    try {
      const res = await fetch("/api/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, consent, recaptchaToken: token, source }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Please try again shortly.");
      setState({ status: "done", msg: data.message }); setEmail(""); setConsent(false);
    } catch (err) { setState({ status: "error", msg: err.message }); }
    finally { setResetKey(value => value + 1); }
  }
  return <form className="event-signup" onSubmit={submit}>
    <div className="event-signup-row"><label className="sr-only" htmlFor={id}>Email address</label><input id={id} type="email" placeholder="your@email.com" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)}/><button className="btn btn-pink" disabled={state.status === "sending"}>{state.status === "sending" ? "Sending…" : "Keep me updated"}</button></div>
    <label className="event-signup-consent"><input type="checkbox" required checked={consent} onChange={event => setConsent(event.target.checked)}/><span>I&apos;d like email updates about Bon Bon&apos;s local events. I can unsubscribe anytime.</span></label>
    <RecaptchaCheckbox onChange={setToken} resetKey={resetKey} action={RECAPTCHA_ACTIONS.subscribe} idPrefix={`subscribe-${id}`}/>
    {state.msg && <p className={`event-signup-message ${state.status === "error" ? "is-error" : ""}`} role="status">{state.msg}</p>}
  </form>;
}
