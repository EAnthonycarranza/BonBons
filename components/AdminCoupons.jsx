"use client";
import { useEffect, useState } from "react";
import { money } from "@/lib/format";
import { couponStatus, groupCouponPromotions } from "@/lib/coupons";
import AdminIcon from "./AdminIcon";
import ArrowIcon from "./ArrowIcon";
import CouponRedemption from "./CouponRedemption";
import CouponCreateForm, { INITIAL_COUPON_FORM } from "./CouponCreateForm";
import ConfirmDialog from "./ConfirmDialog";
import "./coupons.css";

function exportCodes(coupons) {
  const cell = value => `"${(/^[=+\-@\t\r]/.test(String(value ?? "")) ? "'" : "") + String(value ?? "").replace(/"/g, '""')}"`;
  const rows = [["Code", "Campaign", "Discount", "Minimum order", "Expiration", "Uses allowed", "Uses redeemed", "Active"], ...coupons.map(c => [c.code, c.name, c.discountAmount, c.minimumSubtotal, c.expiresOn, c.maxRedemptions, c.redemptionCount, c.active])];
  const url = URL.createObjectURL(new Blob(["\uFEFF" + rows.map(row => row.map(cell).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a"); link.href = url; link.download = "bonbons-coupons.csv"; link.click(); URL.revokeObjectURL(url);
}
function Pager({ page, total, size, onChange }) {
  const pages = Math.max(1, Math.ceil(total / size));
  return <div className="coupon-pager"><span>{total ? `${(page - 1) * size + 1}–${Math.min(page * size, total)} of ${total}` : "0 results"}</span><div><button className="admin-btn admin-btn-secondary" disabled={page <= 1} onClick={() => onChange(page - 1)}>Previous</button><span>{page} / {pages}</span><button className="admin-btn admin-btn-secondary" disabled={page >= pages} onClick={() => onChange(page + 1)}>Next</button></div></div>;
}
function PrintLink({ codes, label = "Print selected" }) {
  return <a className={`admin-btn admin-btn-secondary${codes.length ? "" : " is-disabled"}`} aria-disabled={!codes.length} href={codes.length ? `/admin/coupons/print?ids=${codes.map(c => c.id).join(",")}` : undefined} target="_blank" rel="noopener">{label}<AdminIcon name="external"/></a>;
}
const batchDate = value => value === "legacy" ? "Earlier batch" : new Date(value).toLocaleString("en-US", { timeZone: "America/Chicago", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState([]), [redemptions, setRedemptions] = useState([]);
  const [view, setView] = useState("promotions"), [promotionKey, setPromotionKey] = useState(""), [batchKey, setBatchKey] = useState("");
  const [createForm, setCreateForm] = useState(null), [selected, setSelected] = useState([]), [redeemCode, setRedeemCode] = useState("");
  const [loading, setLoading] = useState(true), [saving, setSaving] = useState(false), [updating, setUpdating] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false), [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(""), [notice, setNotice] = useState("");
  const [search, setSearch] = useState(""), [filter, setFilter] = useState("All"), [page, setPage] = useState(1);
  const [historySearch, setHistorySearch] = useState(""), [historyPage, setHistoryPage] = useState(1);
  async function load() {
    setLoading(true); setError("");
    try {
      const responses = await Promise.all([fetch("/api/admin/coupons", { cache: "no-store" }), fetch("/api/admin/coupons/redeem", { cache: "no-store" })]);
      const [data, history] = await Promise.all(responses.map(res => res.json()));
      if (responses.some(res => !res.ok)) throw new Error(data.error || history.error || "Could not load coupons.");
      setCoupons(data.coupons); setRedemptions(history.redemptions);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);
  const groups = groupCouponPromotions(coupons);
  const promotion = groups.find(p => p.key === promotionKey);
  const batch = promotion?.batches.find(b => b.key === batchKey) || promotion?.batches[0];
  const scope = batch?.codes || [];
  const available = codes => codes.filter(c => couponStatus(c) === "Available");
  const shownGroups = groups.filter(p => `${p.name} ${p.coupons.map(c => c.code).join(" ")}`.toLowerCase().includes(search.toLowerCase()) && (filter === "All" || (filter === "Available" ? available(p.coupons).length > 0 : available(p.coupons).length === 0)));
  const visible = scope.filter(c => `${c.code} ${c.name}`.toLowerCase().includes(search.toLowerCase()) && (filter === "All" || couponStatus(c) === filter));
  const chosen = scope.filter(c => selected.includes(c.id));
  const allSelected = visible.length > 0 && visible.every(c => selected.includes(c.id));
  const history = redemptions.filter(r => `${r.code} ${r.customer_email} ${r.reference || ""} ${r.campaign}`.toLowerCase().includes(historySearch.toLowerCase()));
  function openPromotion(p) { setPromotionKey(p.key); setBatchKey(p.batches[0].key); setSearch(""); setFilter("All"); setPage(1); setSelected([]); }
  function changeView(next) { setView(next); setCreateForm(null); setError(""); setNotice(""); }
  async function create(form) {
    if (saving) return; setSaving(true); setError(""); setNotice("");
    try {
      const res = await fetch("/api/admin/coupons", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json(); if (!res.ok) throw new Error(data.error || "Could not generate coupons.");
      setCoupons(current => [...data.coupons, ...current]); setSelected(data.coupons.map(c => c.id));
      setPromotionKey(data.coupons[0].promotionKey); setBatchKey(data.coupons[0].createdAt); setSearch(""); setFilter("All"); setPage(1); setCreateForm(null);
      setNotice(`${data.coupons.length} ${data.coupons.length === 1 ? "code is" : "codes are"} ready in this batch. Print the unused codes or export them below.`);
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  }
  async function toggle(coupon) {
    setUpdating(coupon.id); setError("");
    try {
      const res = await fetch(`/api/admin/coupons/${coupon.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: !coupon.active }) });
      const data = await res.json(); if (!res.ok) throw new Error(data.error || "Could not update coupon.");
      setCoupons(current => current.map(c => c.id === coupon.id ? data.coupon : c));
    } catch (err) { setError(err.message); } finally { setUpdating(""); }
  }
  async function remove() {
    setDeleting(true); setError(""); setNotice("");
    try {
      const res = await fetch("/api/admin/coupons", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: chosen.map(c => c.id) }) });
      const data = await res.json(); if (!res.ok) throw new Error(data.error || "Could not delete coupons.");
      const gone = new Set(data.deleted.map(String)); setCoupons(current => current.filter(c => !gone.has(c.id))); setSelected([]);
      setNotice(`${gone.size} unused coupons deleted.`); setPage(1);
    } catch (err) { setError(err.message); } finally { setDeleting(false); setConfirmDelete(false); }
  }
  function askDelete() {
    if (chosen.some(c => c.redemptionCount > 0)) { setError("Used coupons stay in your records. Unselect them to delete unused codes, or disable them instead."); return; }
    setConfirmDelete(true);
  }
  function newBatch() {
    const last = batch?.codes[0]; setCreateForm(last ? { ...INITIAL_COUPON_FORM, name: promotion.name, discountAmount: String(last.discountAmount), minimumSubtotal: String(last.minimumSubtotal), expiresOn: last.expiresOn, quantity: "12", mode: last.maxRedemptions > 1 ? "shared" : "single", maxRedemptions: String(last.maxRedemptions) } : INITIAL_COUPON_FORM);
  }
  return <div className="coupons-manager">
    <div className="admin-page-head"><div><p className="admin-kicker">A little extra sweetness</p><h1>Coupons</h1><p>Promotions, printable batches, and redemption records in one place.</p></div><div className="coupon-head-actions"><button className="admin-btn admin-btn-secondary" onClick={load} disabled={loading || saving}><AdminIcon name="refresh"/>Refresh</button><button className="admin-btn admin-btn-primary" onClick={() => { changeView("promotions"); setCreateForm(INITIAL_COUPON_FORM); }}><AdminIcon name="plus"/>New promotion</button></div></div>
    <div className="coupon-summary"><div><b>{groups.length}</b><span>Promotions</span></div><div><b>{available(coupons).length}</b><span>Available codes</span></div><div><b>{coupons.reduce((sum, c) => sum + c.redemptionCount, 0)}</b><span>Redemptions</span></div></div>
    <div className="desk-tabs" role="group" aria-label="Coupon workspace">{[["promotions", "Promotions"], ["redeem", "Redeem a coupon"], ["history", "Redemption history"]].map(([key, label]) => <button key={key} className={view === key ? "is-active" : ""} aria-pressed={view === key} onClick={() => changeView(key)}>{label}</button>)}</div>
    {error ? <p className="admin-alert is-error" role="alert">{error}</p> : null}{notice ? <p className="admin-alert" role="status">{notice}</p> : null}
    {createForm ? <CouponCreateForm key={`${createForm.name}-${createForm.mode}`} initial={createForm} busy={saving || loading} onCreate={create} onCancel={() => setCreateForm(null)}/> : null}
    {view === "promotions" && !createForm ? <>
      {promotion ? <><div className="coupon-detail-head"><button className="admin-btn admin-btn-secondary" onClick={() => { setPromotionKey(""); setSearch(""); setFilter("All"); setPage(1); setSelected([]); }}><ArrowIcon direction="left" /> All promotions</button><div><h2>{promotion.name}</h2><p>{promotion.coupons.length} codes in {promotion.batches.length} {promotion.batches.length === 1 ? "batch" : "batches"} · One use per customer across this promotion</p></div><button className="admin-btn admin-btn-primary" onClick={newBatch}><AdminIcon name="plus"/>Generate another batch</button></div>
        <div className="coupon-batch-bar"><label className="admin-field">Batch<select value={batch?.key || ""} onChange={e => { setBatchKey(e.target.value); setSelected([]); setPage(1); setSearch(""); }} aria-label="Choose coupon batch">{promotion.batches.map(b => <option value={b.key} key={b.key}>{batchDate(b.key)} · {b.codes.length} codes · {money(b.codes[0].discountAmount)} off</option>)}</select></label><PrintLink codes={available(scope)} label="Print unused batch"/><button className="admin-btn admin-btn-secondary" onClick={() => exportCodes(scope)} disabled={!scope.length}>Export batch CSV</button></div>
      </> : <div className="coupon-library-head"><div><h2>Your promotions</h2><p>Open a promotion to view its batches and codes.</p></div></div>}
      <div className="coupon-filter-row"><label className="coupon-search"><AdminIcon name="search"/><input aria-label={promotion ? "Search coupon codes" : "Search promotions"} placeholder={promotion ? "Find a code in this batch" : "Search promotion or code"} value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}/></label><select aria-label="Coupon status filter" value={filter} onChange={e => { setFilter(e.target.value); setPage(1); setSelected([]); }}>{(promotion ? ["All", "Available", "Redeemed", "Expired", "Disabled"] : ["All", "Available", "Finished"]).map(value => <option key={value}>{value}</option>)}</select></div>
      {!promotion ? <><div className="coupon-promotions">{shownGroups.slice((page - 1) * 8, page * 8).map(p => <button className="coupon-promotion-card" key={p.key} onClick={() => openPromotion(p)}><div className="coupon-card-top"><AdminIcon name="coupon"/><span>{available(p.coupons).length ? "Available" : "Finished"}</span></div><h3>{p.name}</h3><p>{p.batches.length} {p.batches.length === 1 ? "batch" : "batches"} · Last generated {new Date(p.latest).toLocaleDateString("en-US", { timeZone: "America/Chicago" })}</p><div className="coupon-card-stats"><span><b>{p.coupons.length}</b>Codes</span><span><b>{available(p.coupons).length}</b>Available</span><span><b>{p.coupons.reduce((sum, c) => sum + c.redemptionCount, 0)}</b>Used</span></div><div className="coupon-card-open">View batches <AdminIcon name="arrow"/></div></button>)}</div>{!shownGroups.length ? <p className="coupon-empty">{loading ? "Loading promotions…" : coupons.length ? "No matching promotions." : "Create your first promotion, then generate batches whenever you need more handouts."}</p> : null}<Pager page={page} total={shownGroups.length} size={8} onChange={setPage}/></> : <>
        <div className="coupon-selection"><span>{chosen.length} selected in this batch</span><div><PrintLink codes={chosen}/><button className="admin-btn admin-btn-secondary" disabled={!chosen.length} onClick={() => exportCodes(chosen)}>Export selected</button><button className="admin-btn admin-btn-danger" disabled={!chosen.length || deleting || saving || loading} onClick={askDelete}><AdminIcon name="trash"/>Delete unused</button></div></div>
        <div className="coupon-table-wrap"><table className="coupon-table"><thead><tr><th><input type="checkbox" aria-label="Select all matching codes in this batch" checked={allSelected} onChange={() => setSelected(allSelected ? [] : visible.map(c => c.id))}/></th><th>Code</th><th>Offer / terms</th><th>Uses</th><th>Status</th><th>Actions</th></tr></thead><tbody>{visible.slice((page - 1) * 20, page * 20).map(c => <tr key={c.id}><td><input type="checkbox" aria-label={`Select ${c.code}`} checked={selected.includes(c.id)} onChange={() => setSelected(current => current.includes(c.id) ? current.filter(id => id !== c.id) : [...current, c.id])}/></td><td><code>{c.code}</code></td><td><b>{money(c.discountAmount)} off</b><small>{c.minimumSubtotal > 0 ? `${money(c.minimumSubtotal)} minimum` : "No minimum"} · {c.expiresOn || "No expiration"}</small></td><td>{c.redemptionCount} / {c.maxRedemptions}<small>{c.maxRedemptions === 1 ? "Single use" : "Shared"}</small></td><td><span className={`coupon-status ${couponStatus(c) === "Available" ? "is-available" : ""}`}>{couponStatus(c)}</span></td><td><div className="coupon-row-actions"><button className="admin-btn admin-btn-secondary" disabled={couponStatus(c) !== "Available"} onClick={() => { setRedeemCode(c.code); changeView("redeem"); }}>Redeem</button><button className="admin-btn admin-btn-secondary" disabled={Boolean(updating)} onClick={() => toggle(c)}>{updating === c.id ? "Saving…" : c.active ? "Disable" : "Enable"}</button></div></td></tr>)}</tbody></table>{!visible.length ? <p className="coupon-empty">No codes match this filter.</p> : null}</div><Pager page={page} total={visible.length} size={20} onChange={setPage}/>
      </>}
    </> : null}
    {view === "redeem" ? <CouponRedemption key={redeemCode} admin initialCode={redeemCode} onRedeemed={load}/> : null}
    {view === "history" ? <><div className="coupon-library-head"><div><h2>Redemption history</h2><p>Latest 200 redemptions · San Antonio time</p></div><label className="coupon-search"><AdminIcon name="search"/><input aria-label="Search redemptions" placeholder="Code, email or reference" value={historySearch} onChange={e => { setHistorySearch(e.target.value); setHistoryPage(1); }}/></label></div><div className="coupon-table-wrap"><table className="coupon-table"><thead><tr><th>Code / promotion</th><th>Customer</th><th>Date</th><th>Discount</th><th>Method / reference</th></tr></thead><tbody>{history.slice((historyPage - 1) * 15, historyPage * 15).map(r => <tr key={r.id}><td><code>{r.code}</code><small>{r.campaign}</small></td><td>{r.customer_email}<small>{r.customer_name}</small></td><td>{new Date(r.redeemed_at).toLocaleString("en-US", { timeZone: "America/Chicago" })}</td><td>{r.discount_amount == null ? "—" : money(Number(r.discount_amount))}</td><td>{r.channel === "online" ? "Online order" : r.channel === "admin" ? "Staff" : "Customer in person"}<small className="coupon-history-reference">{r.reference || `Order #${r.order_id || "deleted"}`}</small></td></tr>)}</tbody></table>{!history.length ? <p className="coupon-empty">No matching redemptions.</p> : null}</div><Pager page={historyPage} total={history.length} size={15} onChange={setHistoryPage}/></> : null}
    <ConfirmDialog open={confirmDelete} tone="danger" busy={deleting} title={`Delete ${chosen.length} unused coupons?`} message="These selected codes will stop working, including printed copies." consequence="This cannot be undone. Used codes stay in your records." confirmLabel="Delete coupons" onConfirm={remove} onCancel={() => setConfirmDelete(false)}/>
  </div>;
}
