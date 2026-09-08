"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AdminIcon from "./AdminIcon";
import { menuSlug, stockState, validateWeeklyBox } from "@/supabase/functions/_shared/menu";
import { money } from "@/lib/format";

const BLANK_ITEM = { name: "", note: "" };

function draftFor(box) {
  return {
    title: box?.title || "",
    slug: box?.slug || "",
    tagline: box?.tagline || "",
    description: box?.description || "",
    price: box?.price ?? 25,
    stock_quantity: box?.stockQuantity ?? 0,
    low_stock_threshold: box?.lowStockThreshold ?? 5,
    items: box?.items?.length ? box.items.map(item => ({ name: item.name || "", note: item.note || "" })) : [{ ...BLANK_ITEM }],
    image: box?.image || "",
    featured: box?.featured ?? true,
    active: box?.active ?? true,
  };
}

function Modal({ title, label, children, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    return () => { dialog.close(); document.body.style.overflow = previousOverflow; };
  }, []);
  return <dialog className="admin-dialog menu-editor" ref={ref} aria-labelledby="wbm-dialog-title" onCancel={event => { event.preventDefault(); onClose(); }}>
    <header className="admin-dialog-head"><div><span className="admin-kicker">{label}</span><h2 id="wbm-dialog-title">{title}</h2></div><button className="admin-icon-btn" type="button" onClick={onClose} aria-label="Close dialog"><AdminIcon name="close"/></button></header>
    {children}
  </dialog>;
}

function BoxEditor({ box, onClose, onSaved }) {
  const initial = useMemo(() => draftFor(box), [box]);
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);

  useEffect(() => {
    if (!dirty) return;
    const warn = event => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function close() {
    if (busy) return;
    if (!dirty || window.confirm("Discard your unsaved box changes?")) onClose();
  }
  function change(key, value) {
    setForm(current => ({ ...current, [key]: value, ...(!box && key === "title" ? { slug: menuSlug(value) } : {}) }));
    setError("");
  }
  function changeItem(index, key, value) {
    setForm(current => ({ ...current, items: current.items.map((item, i) => i === index ? { ...item, [key]: value } : item) }));
    setError("");
  }
  function addItem() {
    setForm(current => ({ ...current, items: [...current.items, { ...BLANK_ITEM }] }));
  }
  function removeItem(index) {
    setForm(current => ({ ...current, items: current.items.filter((_, i) => i !== index) }));
  }

  async function save(event) {
    event.preventDefault();
    setError("");
    // Blank rows are a convenience in the form, not something to store.
    const payload = { ...form, items: form.items.filter(item => item.name.trim()) };
    try { validateWeeklyBox(payload); } catch (err) { setError(err.message); return; }
    setBusy(true);
    try {
      const response = await fetch(box ? `/api/admin/weekly-box/${box.id}` : "/api/admin/weekly-box", {
        method: box ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save this box.");
      onSaved(data.box, `${data.box.title} ${box ? "updated" : "created"}.`);
    } catch (err) { setError(err.message); setBusy(false); }
  }

  return <Modal label={box ? "Edit box" : "New box"} title={box ? box.title : "Build this week's box."} onClose={close}>
    <form onSubmit={save}>
      <div className="admin-dialog-body">
        <fieldset disabled={busy} className="menu-fields">
          <legend className="sr-only">Box details</legend>
          <label className="admin-field">Box name <span className="admin-required">*</span><input required maxLength={90} value={form.title} onChange={e => change("title", e.target.value)} placeholder="e.g. Celebration Box" autoFocus/></label>
          <label className="admin-field">Tagline<input maxLength={160} value={form.tagline} onChange={e => change("tagline", e.target.value)} placeholder="10 delicious cake pops. Big variety. Big flavor."/></label>
          <label className="admin-field">About this box<textarea maxLength={2000} rows={3} value={form.description} onChange={e => change("description", e.target.value)} placeholder="What makes this week's box special."/></label>

          <div className="admin-field-grid">
            <label className="admin-field">Price per box <span className="admin-required">*</span><input type="number" min="0.01" max="500" step="0.01" value={form.price} onChange={e => change("price", e.target.value === "" ? "" : Number(e.target.value))}/></label>
            <label className="admin-field">Boxes remaining <span className="admin-required">*</span><input type="number" min="0" max="100000" step="1" value={form.stock_quantity} onChange={e => change("stock_quantity", e.target.value === "" ? "" : Number(e.target.value))}/><small>Set 0 to show the box as sold out.</small></label>
          </div>
          <label className="admin-field">Show &ldquo;only a few left&rdquo; at<input type="number" min="0" max="1000" step="1" value={form.low_stock_threshold} onChange={e => change("low_stock_threshold", Number(e.target.value))}/><small>At or below this many, shoppers see an urgency message.</small></label>

          <fieldset className="menu-allergens">
            <legend>What&apos;s in the box</legend>
            <p>Listed in this order on the Box of the Week page.</p>
            <div className="wbm-items">
              {form.items.map((item, index) => (
                <div className="wbm-item-row" key={index}>
                  <input aria-label={`Item ${index + 1} name`} maxLength={80} value={item.name} onChange={e => changeItem(index, "name", e.target.value)} placeholder="Flavor or treat"/>
                  <input aria-label={`Item ${index + 1} note`} maxLength={160} value={item.note} onChange={e => changeItem(index, "note", e.target.value)} placeholder="Optional note"/>
                  <button type="button" className="admin-icon-btn is-danger" onClick={() => removeItem(index)} aria-label={`Remove item ${index + 1}`} disabled={form.items.length === 1}><AdminIcon name="close"/></button>
                </div>
              ))}
            </div>
            <button type="button" className="admin-text-btn" onClick={addItem}>+ Add another item</button>
          </fieldset>

          <label className="admin-toggle-row menu-publish"><span><b>This week&apos;s box</b><small>Only one box can be the live one. Turning this on stands the others down.</small></span><input type="checkbox" role="switch" checked={form.featured} onChange={e => change("featured", e.target.checked)}/></label>
          <label className="admin-toggle-row"><span><b>Published</b><small>Off keeps the box saved but hidden from the website.</small></span><input type="checkbox" role="switch" checked={form.active} onChange={e => change("active", e.target.checked)}/></label>
        </fieldset>
        {error ? <p className="admin-alert is-error" role="alert">{error}</p> : null}
      </div>
      <div className="admin-dialog-footer">
        <button type="button" className="admin-btn admin-btn-secondary" onClick={close} disabled={busy}>Cancel</button>
        <button type="submit" className="admin-btn admin-btn-primary" disabled={busy}>{busy ? "Saving…" : box ? "Save box" : "Create box"}</button>
      </div>
    </form>
  </Modal>;
}

export default function WeeklyBoxManager() {
  const [boxes, setBoxes] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [savingPrices, setSavingPrices] = useState(false);
  const [prices, setPrices] = useState({ singlePopPrice: "", fourPackPrice: "" });

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [boxRes, settingsRes] = await Promise.all([
        fetch("/api/admin/weekly-box"),
        fetch("/api/admin/shop-settings"),
      ]);
      const boxData = await boxRes.json();
      if (!boxRes.ok) throw new Error(boxData.error || "Could not load the boxes.");
      setBoxes(boxData.boxes || []);
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setSettings(settingsData.settings);
        setPrices({
          singlePopPrice: settingsData.settings.singlePopPrice,
          fourPackPrice: settingsData.settings.fourPackPrice,
        });
      }
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function savePrices(event) {
    event.preventDefault();
    setSavingPrices(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/admin/shop-settings", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          singlePopPrice: Number(prices.singlePopPrice),
          fourPackPrice: Number(prices.fourPackPrice),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save the prices.");
      setSettings(data.settings);
      setNotice("Shop prices updated.");
    } catch (err) { setError(err.message); }
    finally { setSavingPrices(false); }
  }

  async function remove(box) {
    if (!window.confirm(`Delete “${box.title}”? This cannot be undone.`)) return;
    setError("");
    try {
      const response = await fetch(`/api/admin/weekly-box/${box.id}`, { method: "DELETE" });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Could not delete this box.");
      }
      setBoxes(current => current.filter(entry => entry.id !== box.id));
      setNotice(`${box.title} deleted.`);
    } catch (err) { setError(err.message); }
  }

  function onSaved(saved, message) {
    setBoxes(current => {
      const others = current.filter(entry => entry.id !== saved.id);
      // Featuring one box stands every other one down.
      const adjusted = saved.featured ? others.map(entry => ({ ...entry, featured: false })) : others;
      return [saved, ...adjusted];
    });
    setEditing(null);
    setNotice(message);
  }

  const featured = boxes.find(box => box.featured && box.active) || null;

  return <div className="admin-view">
    <div className="admin-page-head">
      <div>
        <span className="admin-kicker">Box of the week</span>
        <h1>This week&apos;s box.</h1>
        <p>Create a limited box, list what&apos;s inside, and set how many are left.</p>
      </div>
      <button type="button" className="admin-btn admin-btn-primary" onClick={() => setEditing({})}><AdminIcon name="plus"/>New box</button>
    </div>

    {notice ? <p className="admin-alert" role="status">{notice}<button type="button" onClick={() => setNotice("")} aria-label="Dismiss"><AdminIcon name="close"/></button></p> : null}
    {error ? <p className="admin-alert is-error" role="alert">{error}</p> : null}

    <form className="wbm-prices" onSubmit={savePrices}>
      <div>
        <span className="admin-kicker">Shop prices</span>
        <p>Used across the storefront and when a request is priced.</p>
      </div>
      <label className="admin-field">Single cake pop<input type="number" min="0.01" max="500" step="0.01" value={prices.singlePopPrice} onChange={e => setPrices(current => ({ ...current, singlePopPrice: e.target.value }))}/></label>
      <label className="admin-field">Four-pack<input type="number" min="0.01" max="500" step="0.01" value={prices.fourPackPrice} onChange={e => setPrices(current => ({ ...current, fourPackPrice: e.target.value }))}/></label>
      <button type="submit" className="admin-btn admin-btn-secondary" disabled={savingPrices || !settings}>{savingPrices ? "Saving…" : "Save prices"}</button>
    </form>

    {loading ? <div className="menu-loading"><span className="admin-spinner" aria-hidden="true"/>Loading boxes…</div> : boxes.length === 0 ? (
      <div className="menu-empty">
        <AdminIcon name="menu"/>
        <h2>No boxes yet.</h2>
        <p>Create your first Celebration Box and it will appear on the home page and at /box-of-the-week.</p>
        <button type="button" className="admin-btn admin-btn-primary" onClick={() => setEditing({})}>Create a box</button>
      </div>
    ) : (
      <>
        {!featured ? <p className="admin-alert is-error" role="status">No box is currently live. Mark one as &ldquo;This week&apos;s box&rdquo; and publish it.</p> : null}
        <div className="wbm-grid">
          {boxes.map(box => {
            const availability = stockState(box.stockQuantity, box.lowStockThreshold);
            return (
              <article className="wbm-card" key={box.id}>
                <div className="wbm-card-top">
                  <div>
                    <h2>{box.title}</h2>
                    <p>{box.tagline || "No tagline yet."}</p>
                  </div>
                  <b>{money(box.price)}</b>
                </div>
                <div className="wbm-card-flags">
                  {box.featured ? <span className="menu-status is-live">This week</span> : <span className="menu-status">Not live</span>}
                  <span className={`menu-status${availability.state === "sold_out" ? " is-trash" : availability.state === "low" ? "" : " is-live"}`}>
                    {availability.state === "sold_out" ? "Sold out" : `${availability.remaining} left`}
                  </span>
                  {!box.active ? <span className="menu-status">Hidden</span> : null}
                </div>
                <p className="wbm-card-items">{box.items.length ? box.items.map(item => item.name).join(" · ") : "No items listed yet."}</p>
                <div className="menu-card-actions">
                  <button type="button" className="menu-edit-btn" onClick={() => setEditing(box)}><AdminIcon name="edit"/>Edit box</button>
                  <button type="button" className="admin-icon-btn is-danger" onClick={() => remove(box)} aria-label={`Delete ${box.title}`}><AdminIcon name="trash"/></button>
                </div>
              </article>
            );
          })}
        </div>
      </>
    )}

    {editing ? <BoxEditor box={editing.id ? editing : null} onClose={() => setEditing(null)} onSaved={onSaved}/> : null}
  </div>;
}
