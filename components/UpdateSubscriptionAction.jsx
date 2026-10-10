"use client";
import { useState } from "react";
import Link from "next/link";
export default function UpdateSubscriptionAction({ token, action }) {
  const [state, setState] = useState({ busy: false, done: false, message: "" });
  const valid = /^[a-f0-9]{48}$/.test(token || "");
  async function submit() {
    setState({ busy: true, done: false, message: "" });
    try {
      const response = await fetch(`/api/updates/${action}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setState({ busy: false, done: true, message: data.message });
    } catch (err) { setState({ busy: false, done: false, message: err.message }); }
  }
  return <div className="update-action"><h1>{action === "confirm" ? "A little sweetness in your inbox." : "Manage event updates"}</h1><p>{action === "confirm" ? "Confirm your email to hear where Bon Bon's will be next." : "Stop receiving emails about Bon Bon's local events."}</p>{!valid ? <p role="alert">This link is invalid. Please use the link in your email.</p> : !state.done && <button className="btn btn-pink" onClick={submit} disabled={state.busy}>{state.busy ? "Please wait…" : action === "confirm" ? "Confirm my subscription" : "Unsubscribe from updates"}</button>}{state.message && <p role="status">{state.message}</p>}<Link href="/events">Browse upcoming events →</Link></div>;
}
