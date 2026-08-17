"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { money } from "@/lib/format";

function Panel({ title, children, count }) {
  return (
    <div className="tile" style={{ padding: 24, marginBottom: 18 }}>
      <h2 style={{ fontSize: 20, marginBottom: 14 }}>
        {title} {typeof count === "number" && <span style={{ color: "var(--muted)" }}>({count})</span>}
      </h2>
      {children}
    </div>
  );
}

export default function AdminDashboard({ dbReady }) {
  const router = useRouter();
  const [quotes, setQuotes] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seedMsg, setSeedMsg] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [q, o] = await Promise.all([
        fetch("/api/quotes").then((r) => r.json()),
        fetch("/api/orders").then((r) => r.json()),
      ]);
      setQuotes(q.quotes || []);
      setOrders(o.orders || []);
    } catch {
      /* leave lists empty; the empty states explain what to do */
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function seed() {
    setSeedMsg("Seeding…");
    const res = await fetch("/api/seed", { method: "POST" });
    const data = await res.json();
    setSeedMsg(res.ok ? `Done — ${data.created} created, ${data.updated} updated.` : data.error);
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.refresh();
  }

  return (
    <>
      <div className="sec-top" style={{ marginBottom: 24 }}>
        <div>
          <div className="eyebrow">Staff dashboard</div>
          <h1 style={{ fontSize: 34, marginTop: 8 }}>Incoming work</h1>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-ghost btn-sm" onClick={load}>Refresh</button>
          <button className="btn btn-ghost btn-sm" onClick={logout}>Log out</button>
        </div>
      </div>

      {!dbReady && (
        <p className="fill-warn" style={{ marginBottom: 18 }}>
          No database is connected, so nothing is being stored yet. Add <code>MONGODB_URI</code> to
          <code> .env.local</code> and restart to start collecting quotes and orders.
        </p>
      )}

      {dbReady && (
        <Panel title="Catalogue">
          <p style={{ color: "var(--muted)", marginBottom: 14 }}>
            Load the starter products into MongoDB. Safe to run more than once.
          </p>
          <button className="btn btn-gold btn-sm" onClick={seed}>Seed sample products</button>
          {seedMsg && <p style={{ marginTop: 12, color: "var(--mint)" }}>{seedMsg}</p>}
        </Panel>
      )}

      <Panel title="Quote requests" count={quotes.length}>
        {loading ? <p style={{ color: "var(--muted)" }}>Loading…</p>
          : quotes.length === 0 ? <p style={{ color: "var(--muted)" }}>Nothing yet.</p>
          : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr style={{ textAlign: "left", color: "var(--muted)" }}>
                    <th style={{ padding: "8px 10px" }}>Name</th>
                    <th style={{ padding: "8px 10px" }}>Date</th>
                    <th style={{ padding: "8px 10px" }}>Occasion</th>
                    <th style={{ padding: "8px 10px" }}>How</th>
                    <th style={{ padding: "8px 10px" }}>Contact</th>
                  </tr>
                </thead>
                <tbody>
                  {quotes.map((q) => (
                    <tr key={q._id} style={{ borderTop: "1px solid var(--stroke)" }}>
                      <td style={{ padding: "10px" }}>{q.name}</td>
                      <td style={{ padding: "10px" }}>{q.eventDate}</td>
                      <td style={{ padding: "10px" }}>{q.occasion}</td>
                      <td style={{ padding: "10px" }}>{q.fulfilment}</td>
                      <td style={{ padding: "10px" }}>
                        <a href={`mailto:${q.email}`}>{q.email}</a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </Panel>

      <Panel title="Orders" count={orders.length}>
        {loading ? <p style={{ color: "var(--muted)" }}>Loading…</p>
          : orders.length === 0 ? <p style={{ color: "var(--muted)" }}>Nothing yet.</p>
          : (
            <div style={{ display: "grid", gap: 12 }}>
              {orders.map((o) => (
                <div key={o._id} style={{ border: "1px solid var(--stroke)", borderRadius: 14, padding: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <b>{o.customer?.name}</b>
                    <b>{money(o.subtotal)}</b>
                  </div>
                  <div style={{ color: "var(--muted)", fontSize: 14, marginTop: 4 }}>
                    {o.fulfilment} · wanted {o.wantedDate || "—"} · {o.customer?.email}
                  </div>
                  <ul style={{ listStyle: "none", marginTop: 10, fontSize: 14, display: "grid", gap: 4 }}>
                    {o.items?.map((i, n) => (
                      <li key={n} style={{ color: "#CFC5D8" }}>{i.qty}× {i.name} — {money(i.price * i.qty)}</li>
                    ))}
                  </ul>
                  {o.notes && <p style={{ marginTop: 10, fontSize: 14, color: "var(--gold)" }}>Note: {o.notes}</p>}
                </div>
              ))}
            </div>
          )}
      </Panel>
    </>
  );
}
