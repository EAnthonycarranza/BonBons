"use client";
import { useEffect, useState } from "react";
import { money } from "@/lib/format";
import { couponStatus } from "@/lib/coupons";
import AdminIcon from "./AdminIcon";
import CouponRedemption from "./CouponRedemption";
import ConfirmDialog from "./ConfirmDialog";
import "./coupons.css";

const INITIAL = { name: "", mode: "single", discountAmount: "1", minimumSubtotal: "0", quantity: "1", maxRedemptions: "100", code: "", expiresOn: "" };

function exportCodes(coupons) {
  const cell = (value) => {
    const text = String(value ?? "");
    return `"${(/^[=+\-@\t\r]/.test(text) ? "'" : "") + text.replace(/"/g, '""')}"`;
  };
  const rows = [["Code", "Campaign", "Discount", "Minimum order", "Expiration", "Uses allowed", "Uses redeemed", "Active"], ...coupons.map(c => [c.code, c.name, c.discountAmount, c.minimumSubtotal, c.expiresOn, c.maxRedemptions, c.redemptionCount, c.active])];
  const url = URL.createObjectURL(new Blob(["\uFEFF" + rows.map(row => row.map(cell).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a"); link.href = url; link.download = "bonbons-coupons.csv"; link.click(); URL.revokeObjectURL(url);
}

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState([]);
  const [form, setForm] = useState(INITIAL);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updating, setUpdating] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [redemptions, setRedemptions] = useState([]);
  const [historySearch, setHistorySearch] = useState("");
  async function load() {
    setLoading(true); setError("");
    try {
      const [res, historyRes] = await Promise.all([fetch("/api/admin/coupons", { cache: "no-store" }), fetch("/api/admin/coupons/redeem", { cache: "no-store" })]);
      const [data, history] = await Promise.all([res.json(), historyRes.json()]);
      if (!res.ok || !historyRes.ok) throw new Error(data.error || history.error || "Could not load coupons.");
      setCoupons(data.coupons);
      setRedemptions(history.redemptions);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);
  const set = key => event => setForm(current => ({ ...current, [key]: event.target.value }));
  const shared = form.mode === "shared";
  const quantity = shared ? 1 : Number(form.quantity);
  async function create(event) {
    event.preventDefault(); if (saving) return;
    setSaving(true); setError(""); setNotice("");
    try {
      const res = await fetch("/api/admin/coupons", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, quantity, maxRedemptions: shared ? Number(form.maxRedemptions) : 1, code: quantity === 1 ? form.code : "" }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not generate coupons.");
      setCoupons(current => [...data.coupons, ...current]);
      setSelected(data.coupons.map(c => c.id)); setSearch("");
      setNotice(`${data.coupons.length} ${data.coupons.length === 1 ? "code is" : "codes are"} ready. Print or export the selected coupons below.`);
      setForm(current => ({ ...current, code: "" }));
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }
  async function toggle(coupon) {
    setUpdating(coupon.id); setError("");
    try {
      const res = await fetch(`/api/admin/coupons/${coupon.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: !coupon.active }) });
      const data = await res.json(); if (!res.ok) throw new Error(data.error || "Could not update coupon.");
      setCoupons(current => current.map(c => c.id === coupon.id ? data.coupon : c));
    } catch (err) { setError(err.message); }
    finally { setUpdating(""); }
  }
  async function remove() {
    setDeleting(true); setError(""); setNotice("");
    try {
      const res = await fetch("/api/admin/coupons", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: chosen.map(c => c.id) }) });
      const data = await res.json(); if (!res.ok) throw new Error(data.error || "Could not delete coupons.");
      const gone = new Set(data.deleted.map(String));
      setCoupons(current => current.filter(c => !gone.has(c.id)));
      setSelected(current => current.filter(id => !gone.has(id)));
      setNotice(`${gone.size} ${gone.size === 1 ? "coupon was" : "coupons were"} deleted.`);
    } catch (err) { setError(err.message); }
    finally { setDeleting(false); setConfirmDelete(false); }
  }
  function askDelete() {
    const used = chosen.filter(c => c.redemptionCount > 0);
    if (used.length) { setNotice(""); setError(`${used.length === 1 ? `${used[0].code} has` : `${used.length} of the selected coupons have`} been used, so ${used.length === 1 ? "it stays" : "they stay"} in your records. Disable ${used.length === 1 ? "it" : "them"} instead, or unselect ${used.length === 1 ? "it" : "them"} to delete the rest.`); return; }
    setConfirmDelete(true);
  }
  const visible = coupons.filter(c => `${c.code} ${c.name}`.toLowerCase().includes(search.toLowerCase()));
  const chosen = coupons.filter(c => selected.includes(c.id));
  const allSelected = visible.length > 0 && visible.every(c => selected.includes(c.id));
  const choose = (id) => setSelected(current => current.includes(id) ? current.filter(i => i !== id) : [...current, id]);
  return <div className="coupons-manager">
    <div className="admin-page-head"><div><p className="admin-kicker">A little extra sweetness</p><h1>Coupons</h1><p>Create event handouts for online checkout or in-person redemption.</p></div><button type="button" className="admin-btn admin-btn-secondary" onClick={load} disabled={loading || saving || Boolean(updating)}><AdminIcon name="refresh"/>Refresh</button></div>
    {error ? <p className="admin-alert is-error" role="alert">{error}</p> : null}
    {notice ? <p className="admin-alert" role="status">{notice}</p> : null}
    <form className="coupon-create" onSubmit={create}>
      <div className="coupon-create-intro"><span className="coupon-symbol"><AdminIcon name="coupon" width="32" height="32"/></span><h2>Create coupon codes</h2><p>Start with $1 off, or choose any dollar amount. Each code keeps its original terms after printing.</p></div>
      <div className="coupon-create-fields">
        <div className="coupon-mode" role="group" aria-label="Coupon type">{[["single", "Single-use codes", "One unique code per physical coupon"], ["shared", "Shared code", "One code with a total redemption limit"]].map(([value, label, hint]) => <label key={value} className={form.mode === value ? "is-selected" : ""}><input type="radio" name="coupon-mode" value={value} checked={form.mode === value} onChange={set("mode")}/><span><b>{label}</b><small>{hint}</small></span></label>)}</div>
        <div className="admin-field-grid">
          <label className="admin-field">Campaign name<input value={form.name} onChange={set("name")} placeholder="Fall market handouts" required maxLength={80}/><small>The same name groups codes into one promotion. One use per checkout email across all its codes.</small></label>
          <label className="admin-field">Discount ($)<input type="number" value={form.discountAmount} onChange={set("discountAmount")} min="0.01" max="500" step="0.01" required/></label>
          {shared ? <label className="admin-field">Total redemptions allowed<input type="number" value={form.maxRedemptions} onChange={set("maxRedemptions")} min="1" max="1000000" step="1" required/></label> : <label className="admin-field">Number of unique codes<input type="number" value={form.quantity} onChange={set("quantity")} min="1" max="200" step="1" required/></label>}
          {quantity === 1 ? <label className="admin-field">Custom code (optional)<input value={form.code} onChange={set("code")} placeholder="Auto-generate a code" maxLength={32} autoCapitalize="characters" spellCheck={false}/><small>4–32 letters, numbers or hyphens.</small></label> : <div className="coupon-auto-note">Every printed coupon gets its own short 6-character code, like K7M4QX.</div>}
          <label className="admin-field">Minimum order ($)<input type="number" value={form.minimumSubtotal} onChange={set("minimumSubtotal")} min="0" max="100000" step="0.01" required/><small>Leave at 0 for no minimum.</small></label>
          <label className="admin-field">Expiration date (optional)<input type="date" value={form.expiresOn} onChange={set("expiresOn")}/><small>Valid through this date in San Antonio.</small></label>
        </div>
        <div className="coupon-create-footer"><p>One coupon per customer per promotion. Redemption is final across online and physical use. Printed $1 coupons use your supplied design, 12 per sheet (3 across × 4 down).</p><button className="admin-btn admin-btn-primary" disabled={saving || loading}>{saving ? "Generating…" : "Generate codes"}<AdminIcon name="plus"/></button></div>
      </div>
    </form>
    <div className="coupon-library-head"><div><h2>Your coupon codes</h2><p>{coupons.length} {coupons.length === 1 ? "code" : "codes"} · {coupons.reduce((sum, c) => sum + c.redemptionCount, 0)} redemptions</p></div><label className="coupon-search"><AdminIcon name="search"/><input aria-label="Search coupon codes" placeholder="Search campaign or code" value={search} onChange={e => setSearch(e.target.value)}/></label></div>
    <div className="coupon-selection"><span>{chosen.length} selected</span><div><button type="button" className="admin-btn admin-btn-secondary" disabled={!chosen.length} onClick={() => exportCodes(chosen)}>Export CSV</button><a className={`admin-btn admin-btn-secondary${chosen.length ? "" : " is-disabled"}`} aria-disabled={!chosen.length} href={chosen.length ? `/admin/coupons/print?ids=${chosen.map(c => c.id).join(",")}` : undefined} target="_blank" rel="noopener">Print coupons<AdminIcon name="external"/></a><button type="button" className="admin-btn admin-btn-danger" disabled={!chosen.length || deleting || loading || saving} onClick={askDelete}><AdminIcon name="trash"/>Delete</button></div></div>
    <div className="coupon-table-wrap"><table className="coupon-table"><thead><tr><th><input type="checkbox" aria-label="Select all visible coupons" checked={allSelected} onChange={() => setSelected(current => allSelected ? current.filter(id => !visible.some(c => c.id === id)) : [...new Set([...current, ...visible.map(c => c.id)])])}/></th><th>Code / campaign</th><th>Offer</th><th>Redemptions</th><th>Status</th><th>Availability</th></tr></thead><tbody>{visible.map(c => <tr key={c.id}><td><input type="checkbox" aria-label={`Select ${c.code}`} checked={selected.includes(c.id)} onChange={() => choose(c.id)}/></td><td><code>{c.code}</code><small>{c.name}</small></td><td><b>{money(c.discountAmount)} off</b><small>{c.minimumSubtotal > 0 ? `${money(c.minimumSubtotal)} minimum` : "No minimum"} · {c.expiresOn ? `Through ${c.expiresOn}` : "No expiration"}</small></td><td>{c.redemptionCount} / {c.maxRedemptions}<small>{c.maxRedemptions === 1 ? "Single use" : "Shared code"}</small></td><td><span className={`coupon-status ${couponStatus(c) === "Available" ? "is-available" : ""}`}>{couponStatus(c)}</span></td><td><button type="button" className="admin-btn admin-btn-secondary" onClick={() => toggle(c)} disabled={Boolean(updating) || loading || saving} aria-label={`${c.active ? "Disable" : "Enable"} ${c.code}`}>{updating === c.id ? "Saving…" : c.active ? "Disable" : "Enable"}</button></td></tr>)}</tbody></table>{!visible.length ? <p className="coupon-empty">{loading ? "Loading coupons…" : coupons.length ? "No matching codes." : "Your first coupon campaign starts here. Generate codes above, then print them to hand out."}</p> : null}</div>
    <ConfirmDialog open={confirmDelete} tone="danger" busy={deleting} title={`Delete ${chosen.length} ${chosen.length === 1 ? "coupon" : "coupons"}?`} message={chosen.length === 1 ? `${chosen[0].code} from ${chosen[0].name}` : `${chosen.length} selected codes`} consequence="Deleted codes stop working right away, including any already printed or handed out. This can't be undone." confirmLabel="Delete" onConfirm={remove} onCancel={() => setConfirmDelete(false)}/>
    <CouponRedemption admin onRedeemed={load}/>
    <div className="coupon-library-head"><div><h2>Recent redemptions</h2><p>Latest 200 · Check the code here before honoring a customer&apos;s confirmation.</p></div><label className="coupon-search"><AdminIcon name="search"/><input aria-label="Search redemptions" placeholder="Code, email or reference" value={historySearch} onChange={e => setHistorySearch(e.target.value)}/></label></div>
    <div className="coupon-table-wrap"><table className="coupon-table"><thead><tr><th>Code / promotion</th><th>Customer</th><th>Redeemed</th><th>Discount</th><th>Method / reference</th></tr></thead><tbody>{redemptions.filter(r => `${r.code} ${r.customer_email} ${r.reference || ""} ${r.campaign}`.toLowerCase().includes(historySearch.toLowerCase())).map(r => <tr key={r.id}><td><code>{r.code}</code><small>{r.campaign}</small></td><td>{r.customer_email}<small>{r.customer_name}</small></td><td>{new Date(r.redeemed_at).toLocaleString("en-US", { timeZone: "America/Chicago" })}<small>San Antonio time</small></td><td>{r.discount_amount == null ? "—" : money(Number(r.discount_amount))}</td><td>{r.channel === "online" ? "Online order" : r.channel === "admin" ? "Staff redemption" : "Customer in person"}<small className="coupon-history-reference">{r.reference || `Order #${r.order_id || "deleted"}`}</small></td></tr>)}</tbody></table>{!redemptions.length ? <p className="coupon-empty">No coupons have been redeemed yet.</p> : null}</div>
  </div>;
}
