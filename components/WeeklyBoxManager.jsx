"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import AdminIcon from "./AdminIcon";
import ConfirmDialog from "./ConfirmDialog";
import { boxPopCount, isMenuImageUrl, MENU_IMAGE_MAX_BYTES, menuSlug, stockState, validateWeeklyBox } from "@/supabase/functions/_shared/menu";
import { money } from "@/lib/format";
import { bundleGroupForCategory } from "@/lib/bundles";

function draftFor(box) {
  return {
    title: box?.title || "",
    slug: box?.slug || "",
    tagline: box?.tagline || "",
    description: box?.description || "",
    price: box?.price ?? 25,
    stock_quantity: box?.stockQuantity ?? 0,
    low_stock_threshold: box?.lowStockThreshold ?? 5,
    items: box?.items?.length
      ? box.items.map(item => ({ slug: item.slug || "", name: item.name || "", qty: Number(item.qty) || 1, note: item.note || "" }))
      : [],
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

function BoxEditor({ box, products, onClose, onSaved }) {
  const initial = useMemo(() => draftFor(box), [box]);
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadNotice, setUploadNotice] = useState("");
  const [error, setError] = useState("");
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);

  useEffect(() => {
    if (!dirty && !uploading) return;
    const warn = event => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, uploading]);

  const [confirmDiscard, setConfirmDiscard] = useState(false);
  function close() {
    if (busy || uploading) return;
    if (!dirty) { onClose(); return; }
    setConfirmDiscard(true);
  }
  function change(key, value) {
    setForm(current => ({ ...current, [key]: value, ...(!box && key === "title" ? { slug: menuSlug(value) } : {}) }));
    setError("");
  }
  async function upload(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || busy || uploading) return;
    setUploadError("");
    setUploadNotice("");
    if (!file.size || file.size > MENU_IMAGE_MAX_BYTES || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setUploadError("Choose a JPG, PNG, or WebP image up to 5 MB.");
      return;
    }
    setUploading(true);
    try {
      const body = new FormData();
      body.append("photo", file);
      // Reuse the authenticated upload route and its server-side file validation.
      const response = await fetch("/api/admin/menu/photo", { method: "POST", body });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "The image could not be uploaded. Please try again.");
      if (!data.url || !isMenuImageUrl(data.url)) throw new Error("The upload did not return a valid image. Please try again.");
      change("image", data.url);
      setUploadNotice("Image uploaded. Save this box to publish it.");
    } catch (err) { setUploadError(err.message); }
    finally { setUploading(false); }
  }
  function changeItem(index, key, value) {
    setForm(current => ({ ...current, items: current.items.map((item, i) => i === index ? { ...item, [key]: value } : item) }));
    setError("");
  }
  // Adding the same flavor twice bumps its quantity instead of duplicating it.
  function addFlavor(slug) {
    const product = products.find(entry => entry.slug === slug);
    if (!product) return;
    setForm(current => {
      const existing = current.items.findIndex(item => item.slug === slug);
      if (existing >= 0) {
        return { ...current, items: current.items.map((item, i) => i === existing ? { ...item, qty: Math.min(99, item.qty + 1) } : item) };
      }
      return { ...current, items: [...current.items, { slug, name: product.name, qty: 1, note: "" }] };
    });
    setError("");
  }
  function removeItem(index) {
    setForm(current => ({ ...current, items: current.items.filter((_, i) => i !== index) }));
  }

  async function save(event) {
    event.preventDefault();
    if (busy || uploading) return;
    setError("");
    const payload = { ...form, items: form.items.filter(item => item.slug && item.name) };
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

  return <>
    <ConfirmDialog
      open={confirmDiscard}
      title="Discard your changes?"
      message="This box has unsaved edits. Closing now will lose them."
      confirmLabel="Discard changes"
      cancelLabel="Keep editing"
      tone="danger"
      onConfirm={() => { setConfirmDiscard(false); onClose(); }}
      onCancel={() => setConfirmDiscard(false)}
    />
    <Modal label={box ? "Edit box" : "New box"} title={box ? box.title : "Build this week's box."} onClose={close}>
    <form onSubmit={save}>
      <div className="admin-dialog-body">
        <section className="wbm-artwork-editor" aria-labelledby="wbm-artwork-heading" aria-busy={uploading}>
          <div className="wbm-artwork-preview">
            {form.image ? <a href={form.image} target="_blank" rel="noopener noreferrer" aria-label="Preview the full box image (opens in a new tab)"><Image src={form.image} alt="Box of the Week image preview" fill unoptimized sizes="200px" /></a> : <div><AdminIcon name="upload"/><span>Your weekly flyer<br />or box photo</span></div>}
          </div>
          <div className="wbm-artwork-controls">
            <span className="admin-kicker">Made for your social posts</span>
            <h3 id="wbm-artwork-heading">This week’s spotlight</h3>
            <p>Upload the same flyer you share on social media. The complete image appears on the Box of the Week page and homepage, without cropping.</p>
            <label className={`admin-btn admin-btn-secondary upload-button${uploading ? " is-busy" : ""}`}><AdminIcon name="upload"/>{uploading ? "Uploading…" : form.image ? "Replace image" : "Upload flyer or photo"}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={upload} disabled={busy || uploading} aria-label="Upload weekly box flyer or photo" aria-describedby="wbm-artwork-help"/></label>
            <small id="wbm-artwork-help">JPG, PNG, or WebP · up to 5 MB. Portrait flyers work especially well; square and landscape images fit too.</small>
            {form.image && <button type="button" className="admin-text-btn" disabled={busy || uploading} onClick={() => { change("image", ""); setUploadError(""); setUploadNotice("Image removed from this draft. Save the box to publish the change."); }}>Remove image from box</button>}
          </div>
          <p className="wbm-artwork-hint">Keep your flyer’s price and flavors in sync with the box details below. Uploading an image does not change the order contents or price.</p>
          {uploadNotice && <p className="wbm-artwork-status" role="status">{uploadNotice}</p>}
          {uploadError && <p className="admin-alert is-error" role="alert">{uploadError}</p>}
        </section>
        <fieldset disabled={busy || uploading} className="menu-fields">
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
            <p>Pick flavors from your cake-pop menu. Add the same flavor twice to increase its quantity.</p>

            <label className="admin-field wbm-add-flavor">
              Add a cake pop
              <select value="" onChange={e => { addFlavor(e.target.value); e.target.value = ""; }} disabled={!products.length}>
                <option value="">{products.length ? "Choose a flavor…" : "No flavors on the menu yet"}</option>
                {products.map(product => (
                  <option key={product.slug} value={product.slug}>
                    {product.name}{product.active ? "" : " (hidden)"}
                  </option>
                ))}
              </select>
            </label>

            {form.items.length ? (
              <div className="wbm-items">
                {form.items.map((item, index) => (
                  <div className="wbm-item-row" key={item.slug}>
                    <b className="wbm-item-name">{item.name}</b>
                    <div className="wbm-qty" aria-label={`${item.name} quantity`}>
                      <button type="button" onClick={() => changeItem(index, "qty", Math.max(1, item.qty - 1))} aria-label={`One fewer ${item.name}`}>−</button>
                      <output>{item.qty}</output>
                      <button type="button" onClick={() => changeItem(index, "qty", Math.min(99, item.qty + 1))} aria-label={`One more ${item.name}`}>+</button>
                    </div>
                    <input aria-label={`${item.name} note`} maxLength={160} value={item.note} onChange={e => changeItem(index, "note", e.target.value)} placeholder="Optional note"/>
                    <button type="button" className="admin-icon-btn is-danger" onClick={() => removeItem(index)} aria-label={`Remove ${item.name}`}><AdminIcon name="close"/></button>
                  </div>
                ))}
                <p className="wbm-total">{boxPopCount(form.items)} cake {boxPopCount(form.items) === 1 ? "pop" : "pops"} in this box</p>
              </div>
            ) : <p className="wbm-total">No cake pops added yet.</p>}
          </fieldset>

          <label className="admin-toggle-row menu-publish"><span><b>This week&apos;s box</b><small>Only one box can be the live one. Turning this on stands the others down.</small></span><input type="checkbox" role="switch" checked={form.featured} onChange={e => change("featured", e.target.checked)}/></label>
          <label className="admin-toggle-row"><span><b>Published</b><small>Off keeps the box saved but hidden from the website.</small></span><input type="checkbox" role="switch" checked={form.active} onChange={e => change("active", e.target.checked)}/></label>
        </fieldset>
        {error ? <p className="admin-alert is-error" role="alert">{error}</p> : null}
      </div>
      <div className="admin-dialog-footer">
        <button type="button" className="admin-btn admin-btn-secondary" onClick={close} disabled={busy || uploading}>Cancel</button>
        <button type="submit" className="admin-btn admin-btn-primary" disabled={busy || uploading}>{busy ? "Saving…" : box ? "Save box" : "Create box"}</button>
      </div>
    </form>
  </Modal>
  </>;
}

export default function WeeklyBoxManager() {
  const [boxes, setBoxes] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [removing, setRemoving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  // Each resource loads on its own. The boxes call is the one that fails when
  // the database or Edge Function is not up to date yet, and it must not take
  // the flavor list down with it — that list is what you build a box from.
  const load = useCallback(async () => {
    setLoading(true); setError("");
    const [boxRes, menuRes] = await Promise.allSettled([
      fetch("/api/admin/weekly-box"),
      fetch("/api/admin/menu"),
    ]);

    if (menuRes.status === "fulfilled" && menuRes.value.ok) {
      const menuData = await menuRes.value.json().catch(() => ({}));
      // Deleted flavors cannot go in a new box; hidden ones still can.
      // Pretzel rods are excluded outright: they bundle in twos on their own
      // shelf, so they never belong inside a cake-pop box.
      setProducts((menuData.products || []).filter(
        product => !product.deletedAt && bundleGroupForCategory(product.category) === "cakepop"
      ));
    }

    if (boxRes.status === "fulfilled") {
      const boxData = await boxRes.value.json().catch(() => ({}));
      if (boxRes.value.ok) setBoxes(boxData.boxes || []);
      else setError(boxData.error || "Could not load the boxes.");
    } else {
      setError("Could not reach the shop database.");
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function remove(box) {
    setError("");
    setDeleting(box);
  }

  async function confirmRemove() {
    const box = deleting;
    if (!box) return;
    setRemoving(true); setError("");
    try {
      const response = await fetch(`/api/admin/weekly-box/${box.id}`, { method: "DELETE" });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Could not delete this box.");
      }
      setBoxes(current => current.filter(entry => entry.id !== box.id));
      setNotice(`${box.title} deleted.`);
      setDeleting(null);
    } catch (err) { setError(err.message); setDeleting(null); }
    finally { setRemoving(false); }
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

    <p className="admin-footnote wbm-prices-note">Cake-pop and four-pack prices live in <b>Shop settings → Prices</b>.</p>


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
                <p className="wbm-card-items">{box.items.length ? box.items.map(item => `${item.name}${Number(item.qty) > 1 ? ` \u00d7${item.qty}` : ""}`).join(" · ") : "No cake pops added yet."}</p>
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

    {editing ? <BoxEditor box={editing.id ? editing : null} products={products} onClose={() => setEditing(null)} onSaved={onSaved}/> : null}

    <ConfirmDialog
      open={Boolean(deleting)}
      title={`Delete “${deleting?.title ?? ""}”?`}
      message="This box will be removed from the Shop Desk and from the website."
      consequence="This cannot be undone. Orders already placed keep the box details saved on them."
      confirmLabel="Delete this box"
      tone="danger"
      busy={removing}
      onConfirm={confirmRemove}
      onCancel={() => setDeleting(null)}
    />
  </div>;
}
