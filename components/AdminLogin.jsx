"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLogin({ passwordSet }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed.");
      router.refresh();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <>
      <div className="eyebrow">Staff only</div>
      <h1 style={{ fontSize: 34, marginTop: 10, marginBottom: 8 }}>Dashboard login</h1>
      <p style={{ color: "var(--muted)", marginBottom: 24 }}>
        Quotes and orders from the site land here.
      </p>

      {!passwordSet && (
        <p className="fill-warn" style={{ marginBottom: 18 }}>
          No <code>ADMIN_PASSWORD</code> is set on the server, so login is disabled.
          Add one to <code>.env.local</code> and restart.
        </p>
      )}

      <form onSubmit={submit} className="tile" style={{ padding: 26 }}>
        <div className="field">
          <label htmlFor="pw" style={{ color: "var(--cream)" }}>Password</label>
          <input id="pw" type="password" value={password} autoComplete="current-password"
            onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && <p className="err" style={{ display: "block", marginBottom: 12 }} role="alert">{error}</p>}
        <button className="btn btn-pink btn-block" type="submit" disabled={busy || !passwordSet}>
          {busy ? "Checking…" : "Log in"}
        </button>
      </form>
    </>
  );
}
