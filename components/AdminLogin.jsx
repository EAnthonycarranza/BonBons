"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import AdminIcon from "./AdminIcon";

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
    <div className="admin-login-card">
      <Link href="/" className="admin-login-logo"><Image src="/logo-transparent.png" alt="Bon Bon’s Sweets & More" width={110} height={110}/></Link>
      <div className="admin-kicker">Bon Bon&apos;s · Staff only</div>
      <h1>Welcome to the shop desk.</h1>
      <p>Your flavors, pickup orders, and customer details—all in one place.</p>

      {!passwordSet && (
        <p className="fill-warn" style={{ marginBottom: 18 }}>
          No <code>ADMIN_PASSWORD</code> is set on the server, so login is disabled.
          Add one to <code>.env.local</code> and restart.
        </p>
      )}

      <form onSubmit={submit}>
        <div className="field">
          <label htmlFor="pw" style={{ color: "var(--cream)" }}>Password</label>
          <input id="pw" type="password" value={password} autoComplete="current-password" required
            onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && <p className="err" style={{ display: "block", marginBottom: 12 }} role="alert">{error}</p>}
        <button className="admin-btn admin-btn-primary" type="submit" disabled={busy || !passwordSet}>
          {busy ? "Checking…" : "Log in"}<AdminIcon name="arrow"/>
        </button>
      </form>
      <Link href="/" className="admin-login-back">Back to the website</Link>
    </div>
  );
}
