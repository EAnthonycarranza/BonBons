"use client";
import { useState } from "react";
import { isEmail } from "@/lib/format";

export default function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState({ status: "idle", msg: "" });

  async function submit(e) {
    e.preventDefault();
    if (!isEmail(email)) {
      setState({ status: "error", msg: "Please enter a valid email address." });
      return;
    }
    setState({ status: "sending", msg: "" });
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      setState({
        status: "done",
        msg: data.message || "Thanks! You're on the list.",
      });
      setEmail("");
    } catch (err) {
      setState({ status: "error", msg: err.message });
    }
  }

  return (
    <>
      <form onSubmit={submit}>
        <label className="sr-only" htmlFor="newsEmail">
          Email address
        </label>
        <input
          id="newsEmail"
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button
          className="btn btn-pink"
          type="submit"
          disabled={state.status === "sending"}
        >
          {state.status === "sending" ? "Sending…" : "Subscribe"}
        </button>
      </form>
      {state.msg && (
        <div
          className={`ok show`}
          role="status"
          style={
            state.status === "error" ? { color: "var(--gold)" } : undefined
          }
        >
          {state.msg}
        </div>
      )}
    </>
  );
}
