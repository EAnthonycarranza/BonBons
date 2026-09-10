"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import AdminIcon from "./AdminIcon";
import ConfirmDialog from "./ConfirmDialog";
import { MENU_ALLERGENS, MENU_IMAGE_MAX_BYTES, menuSlug, stockState, validateMenuProduct } from "@/supabase/functions/_shared/menu";
import { money } from "@/lib/format";
import { MENU_CATEGORIES } from "@/supabase/functions/_shared/menu";
import { bundleGroupForCategory, getBundleGroup } from "@/lib/bundles";

const CATEGORY_LABELS = {
  everyday: "Cake pops",
  "pretzel-rods": "Pretzel rods",
  custom: "Custom & event",
};

// What each category means for pricing, said plainly in the form.
const BUNDLE_HINT = {
  everyday: "Sits with the cake pops and counts toward four-packs.",
  "pretzel-rods": "Sits on the pretzel-rod shelf and counts toward 2-packs.",
  custom: "Shown under custom and event orders.",
};

const BUNDLE_TOGGLE_HINT = {
  everyday: "Customers can pick four flavors for the four-pack price.",
  "pretzel-rods": "Customers can pick two rods for the 2-pack price.",
  custom: "Counts toward four-packs.",
};

const bundleFor = (category) => getBundleGroup(bundleGroupForCategory(category));


function stockSummary(product) {
  const availability = stockState(product.stockQuantity, product.lowStockThreshold);
  if (!availability.tracked) return "Made to order";
  if (availability.state === "sold_out") return "Sold out";
  return `${availability.remaining} left${availability.state === "low" ? " · low" : ""}`;
}

function draftFor(product, nextOrder) {
  return {
    name: product?.name || "", slug: product?.slug || "", price: product?.price ?? 4, unit: "each",
    blurb: product?.blurb || "", description: product?.description || "", image: product?.image || "",
    active: product?.active ?? false, bundle_eligible: product?.bundleEligible ?? true,
    category: product?.category || "everyday",
    allergens: product?.allergens || [], badge: product?.badge || "",
    sort_order: product?.sortOrder ?? nextOrder, source_url: product?.sourceUrl || "",
    stock_quantity: product?.stockQuantity ?? null,
    low_stock_threshold: product?.lowStockThreshold ?? 3,
  };
}

function FlavorPhoto({ image, name }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [image]);
  if (!image || failed) return <div className="menu-photo-empty"><Image src="/logo-transparent.png" alt="" width={108} height={108}/><span>Flavor photo coming soon</span></div>;
  return <Image src={image} alt={name} fill sizes="(max-width:600px) 90vw, (max-width:1200px) 40vw, 28vw" onError={() => setFailed(true)}/>;
}

function Modal({ title, label, children, onClose, className = "" }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    return () => { dialog.close(); document.body.style.overflow = previousOverflow; };
  }, []);
  return <dialog className={`admin-dialog ${className}`} ref={ref} aria-labelledby="menu-dialog-title" onCancel={event => { event.preventDefault(); onClose(); }}>
    <header className="admin-dialog-head"><div><span className="admin-kicker">{label}</span><h2 id="menu-dialog-title">{title}</h2></div><button className="admin-icon-btn" type="button" onClick={onClose} aria-label="Close dialog"><AdminIcon name="close"/></button></header>
    {children}
  </dialog>;
}

function MenuEditor({ product, nextOrder, onClose, onSaved }) {
  const initial = useMemo(() => draftFor(product, nextOrder), [product, nextOrder]);
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [uploadError, setUploadError] = useState("");
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  useEffect(() => {
    if (!dirty) return;
    const warn = event => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  function close() {
    if (busy || uploading) return;
    if (!dirty) { onClose(); return; }
    setConfirmDiscard(true);
  }
  function change(key, value) {
    setForm(current => ({ ...current, [key]: value, ...(!product && key === "name" ? { slug: menuSlug(value) } : {}) }));
    setError("");
  }
  async function upload(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploadError("");
    if (file.size > MENU_IMAGE_MAX_BYTES || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) { setUploadError("Choose a JPG, PNG, or WebP photo under 5 MB."); return; }
    setUploading(true);
    try {
      const body = new FormData(); body.append("photo", file);
      const response = await fetch("/api/admin/menu/photo", { method: "POST", body });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "The photo could not be uploaded.");
      change("image", data.url);
    } catch (err) { setUploadError(err.message); }
    finally { setUploading(false); }
  }
  async function save(event) {
    event.preventDefault();
    setError("");
    let payload;
    try { payload = validateMenuProduct(form); } catch (err) { setError(err.message); return; }
    setBusy(true);
    try {
      const response = await fetch(product ? `/api/admin/menu/${product.id}` : "/api/admin/menu", {
        method: product ? "PATCH" : "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, expectedUpdatedAt: product?.updatedAt }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save the flavor.");
      onSaved(data.product, `${data.product.name} ${product ? "updated" : "added"}${data.product.active ? " and live on the menu" : " to Hidden"}.`);
    } catch (err) { setError(err.message); setBusy(false); }
  }
  return <>
    <ConfirmDialog
      open={confirmDiscard}
      title="Discard your changes?"
      message="This flavor has unsaved edits. Closing now will lose them."
      confirmLabel="Discard changes"
      cancelLabel="Keep editing"
      tone="danger"
      onConfirm={() => { setConfirmDiscard(false); onClose(); }}
      onCancel={() => setConfirmDiscard(false)}
    />
    <Modal label={product ? "Edit menu item" : "New menu item"} title={product ? product.name : "Add a little sweetness."} onClose={close} className="menu-editor">
    <form onSubmit={save}>
      <div className="admin-dialog-body">
        <div className="menu-editor-photo"><div className="menu-photo-preview"><FlavorPhoto image={form.image} name={form.name}/></div><div><h3>Give this flavor a face.</h3><p>A clear photo helps customers pick their favorites.</p><label className={`admin-btn admin-btn-secondary upload-button${uploading ? " is-busy" : ""}`}><AdminIcon name="upload"/>{uploading ? "Uploading…" : "Upload photo"}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={upload} disabled={uploading || busy} aria-label="Upload flavor photo"/></label><small>JPG, PNG, or WebP · up to 5 MB</small>{form.image ? <button type="button" className="admin-text-btn" onClick={() => change("image", "")} disabled={uploading || busy}>Remove photo</button> : null}</div></div>
        {uploadError ? <p className="admin-alert is-error" role="alert">{uploadError}</p> : null}
        <fieldset disabled={busy || uploading} className="menu-fields">
          <legend className="sr-only">Cake-pop details</legend>
          <label className="admin-field">Flavor name <span className="admin-required">*</span><input required maxLength={80} value={form.name} onChange={e => change("name", e.target.value)} placeholder="e.g. Cookie Monster" autoFocus/></label>
          <label className="admin-field">Short description<input maxLength={160} value={form.blurb} onChange={e => change("blurb", e.target.value)} placeholder="A short description for the menu card"/><small>{form.blurb.length}/160 characters</small></label>
          <label className="admin-field">About this flavor<textarea maxLength={2000} value={form.description} onChange={e => change("description", e.target.value)} placeholder="Tell customers about the flavor and finish. Only include ingredients you can confirm." rows={3}/></label>
          <label className="admin-field">Category<select value={form.category} onChange={e => change("category", e.target.value)}>{MENU_CATEGORIES.map((value) => <option key={value} value={value}>{CATEGORY_LABELS[value] || value}</option>)}</select><small>{BUNDLE_HINT[form.category] || ""}</small></label>
          <div className="admin-field-grid"><label className="admin-field">Price per item<input type="number" min="0.01" max="500" step="0.01" value={form.price} onChange={e => change("price", e.target.value === "" ? "" : Number(e.target.value))}/><small>What one of this flavor costs on its own.</small></label><label className="admin-field">Display order<input type="number" min="0" max="10000" step="1" value={form.sort_order} onChange={e => change("sort_order", Number(e.target.value))}/><small>Lower numbers appear first.</small></label></div>
          <div className="admin-field-grid"><label className="admin-field">Quantity available<input type="number" min="0" max="100000" step="1" placeholder="Made to order" value={form.stock_quantity ?? ""} onChange={e => change("stock_quantity", e.target.value === "" ? null : Number(e.target.value))}/><small>Leave blank for made to order. Set 0 to show it as sold out.</small></label><label className="admin-field">Warn when only this many are left<input type="number" min="0" max="1000" step="1" value={form.low_stock_threshold} onChange={e => change("low_stock_threshold", Number(e.target.value))}/><small>Shoppers see &ldquo;Only 3 left&rdquo; at or below this number.</small></label></div>
          <label className="admin-toggle-row"><span><b>Include in {bundleFor(form.category).packNamePlural}</b><small>{BUNDLE_TOGGLE_HINT[form.category] || BUNDLE_TOGGLE_HINT.everyday} Turn this off for a specialty item priced on its own.</small></span><input type="checkbox" role="switch" checked={form.bundle_eligible} onChange={e => change("bundle_eligible", e.target.checked)}/></label>
          <label className="admin-field">Menu label <small>Optional</small><input maxLength={32} value={form.badge} onChange={e => change("badge", e.target.value)} placeholder="e.g. New flavor or Fan favorite"/></label>
          <fieldset className="menu-allergens"><legend>Contains these allergens</legend><p>Confirm the recipe before selecting. An empty list does not mean allergen-free.</p><div>{MENU_ALLERGENS.filter(a => a !== "dairy").map(allergen => <label key={allergen}><input type="checkbox" checked={form.allergens.includes(allergen) || (allergen === "milk" && form.allergens.includes("dairy"))} onChange={e => { const list = form.allergens.filter(a => a !== allergen && !(allergen === "milk" && a === "dairy")); change("allergens", e.target.checked ? [...list, allergen] : list); }}/>{allergen}</label>)}</div></fieldset>
          <label className="admin-toggle-row menu-publish"><span><b>{form.active ? "Live on the menu" : "Hidden from customers"}</b><small>{form.active ? "Customers can request this flavor from the shop." : "Keep it saved until you’re ready to offer it."}</small></span><input type="checkbox" role="switch" checked={form.active} onChange={e => change("active", e.target.checked)} aria-label="Publish on menu"/></label>
          <div className="menu-link-preview"><AdminIcon name="external"/><span>/shop/{form.slug || "your-flavor"}</span><small>{product ? "Permanent link" : "Created from the name"}</small></div>
          {product?.sourceUrl ? <a className="admin-text-btn" href={product.sourceUrl} target="_blank" rel="noopener noreferrer">View original Instagram post <AdminIcon name="external"/></a> : null}
        </fieldset>
        {error ? <p className="admin-alert is-error" role="alert">{error}</p> : null}
      </div>
      <footer className="admin-dialog-footer"><button className="admin-btn admin-btn-secondary" type="button" onClick={close} disabled={busy || uploading}>Cancel</button><button className="admin-btn admin-btn-primary" type="submit" disabled={busy || uploading || (product && !dirty)}><AdminIcon name="check"/>{busy ? "Saving…" : product ? "Save changes" : "Add menu item"}</button></footer>
    </form>
  </Modal>
  </>;
}

export default function MenuManager() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [filter, setFilter] = useState("live");
  const [query, setQuery] = useState("");
  const [editor, setEditor] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [busy, setBusy] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/admin/menu", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load the menu.");
      setProducts(data.products);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const current = products.filter(p => !p.deletedAt);
  const live = current.filter(p => p.active);
  const tracked = current.filter(product => product.stockQuantity !== null && product.stockQuantity !== undefined);
  const counts = {
    all: current.length, live: live.length, hidden: current.length - live.length,
    trash: products.length - current.length,
    tracked: tracked.length,
    soldOut: tracked.filter(product => Number(product.stockQuantity) <= 0).length,
  };
  const shown = products.filter(p => (filter === "trash" ? p.deletedAt : !p.deletedAt && (filter === "all" || (filter === "live" ? p.active : !p.active))) && `${p.name} ${p.blurb}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a,b) => a.sortOrder-b.sortOrder || a.name.localeCompare(b.name));
  function saved(product, message) {
    setProducts(rows => rows.some(p => p.id === product.id) ? rows.map(p => p.id === product.id ? product : p) : [...rows, product]);
    setEditor(null); setDeleteItem(null); setNotice(message); setError("");
  }
  async function changeVisibility(product, action) {
    setBusy(product.id); setError(""); setNotice("");
    try {
      const body = action === "delete" ? { expectedUpdatedAt: product.updatedAt }
        : action === "restore" ? { restore: true, expectedUpdatedAt: product.updatedAt }
        : { ...draftFor(product, 0), active: !product.active, expectedUpdatedAt: product.updatedAt };
      const response = await fetch(`/api/admin/menu/${product.id}`, { method: action === "delete" ? "DELETE" : "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not update this flavor.");
      saved(data.product, action === "delete" ? `${product.name} moved to Trash. You can restore it anytime. Existing orders are unchanged.` : action === "restore" ? `${product.name} restored to Hidden. Publish it when ready.` : `${product.name} is now ${data.product.active ? "live" : "hidden"}.`);
    } catch (err) { setError(err.message); setDeleteItem(null); }
    finally { setBusy(""); }
  }
  return <div className="admin-view menu-view">
    <header className="admin-page-head"><div><span className="admin-kicker">Menu management</span><h1>Your cake-pop menu.</h1><p>The flavors they love. The details you control.</p></div><button className="admin-btn admin-btn-primary" onClick={() => setEditor({ product: null })} disabled={loading || Boolean(error)}><AdminIcon name="plus"/>Add menu item</button></header>
    <section className="menu-summary" aria-label="Menu summary"><div><span className="summary-icon"><AdminIcon name="menu"/></span><div><span>Total flavors</span><b>{loading ? "—" : counts.all}</b></div></div><div><span className="summary-icon is-green"><AdminIcon name="eye"/></span><div><span>Live on the menu</span><b>{loading ? "—" : counts.live}</b></div></div><div><span className="summary-icon is-amber"><AdminIcon name="hidden"/></span><div><span>Hidden for now</span><b>{loading ? "—" : counts.hidden}</b></div></div><div className="menu-price-summary"><b>{counts.soldOut} <small>sold out</small></b><span>{counts.tracked} with tracked stock</span></div></section>
    <div className="menu-intro-bar"><div><AdminIcon name="check"/><span>One menu, everywhere. Changes update the shop and four-pack builder.</span></div><Link href="/shop" target="_blank" className="admin-text-btn">View storefront <AdminIcon name="external"/></Link></div>
    {notice ? <p className="admin-alert" role="status"><AdminIcon name="check"/>{notice}<button aria-label="Dismiss notice" onClick={() => setNotice("")}><AdminIcon name="close"/></button></p> : null}
    {error ? <div className="admin-alert is-error" role="alert"><span>{error}</span><button className="admin-text-btn" onClick={load}>Try again</button></div> : null}
    <section className="menu-catalog" aria-label="Cake-pop flavors">
      <div className="menu-toolbar"><div className="menu-tabs" role="group" aria-label="Filter menu items">{[["all","All flavors"],["live","Live"],["hidden","Hidden"],["trash","Trash"]].map(([key,label])=><button key={key} aria-pressed={filter===key} className={filter===key?"active":""} onClick={()=>setFilter(key)}>{label}<span>{counts[key]}</span></button>)}</div><div className="menu-search-actions"><label className="menu-search"><AdminIcon name="search"/><input aria-label="Search flavors" placeholder="Search flavors…" value={query} onChange={e=>setQuery(e.target.value)}/></label><button className="admin-icon-btn" title="Refresh menu" aria-label="Refresh menu" onClick={load} disabled={loading}><AdminIcon name="refresh"/></button></div></div>
      {loading ? <div className="menu-loading" role="status"><span className="admin-spinner"/>Loading your flavors…</div> : <>
        <div className="menu-results-label"><span>{shown.length} flavor{shown.length!==1?"s":""}{filter==="trash" ? " in Trash" : ""}</span><span>{filter==="trash" ? "Restore items without affecting past orders" : "Ordered as they appear in your shop"}</span></div>
        {shown.length ? <div className="menu-grid">{shown.map(product => <article className={`menu-card${!product.active ? " is-hidden" : ""}`} key={product.id}>
          <div className="menu-card-photo"><FlavorPhoto image={product.image} name={product.name}/><span className={`menu-status ${product.deletedAt?"is-trash":product.active?"is-live":""}`}><AdminIcon name={product.deletedAt?"trash":product.active?"eye":"hidden"}/>{product.deletedAt?"In Trash":product.active?"Live":"Hidden"}</span>{product.badge?<span className="menu-card-badge">{product.badge}</span>:null}</div>
          <div className="menu-card-body"><div className="menu-card-title"><h2>{product.name}</h2><b>{money(product.price)}</b></div><p>{product.blurb || "Add a short description to introduce this flavor."}</p><div className="menu-card-meta"><span>{stockSummary(product)}</span><span>{product.bundleEligible ? `${bundleFor(product.category).packName} eligible` : "Singles only"}</span></div></div>
          <footer className="menu-card-actions">{product.deletedAt?<button className="admin-btn admin-btn-secondary" onClick={()=>changeVisibility(product,"restore")} disabled={Boolean(busy)}><AdminIcon name="restore"/>Restore flavor</button>:<><button className="menu-edit-btn" onClick={()=>setEditor({product})}><AdminIcon name="edit"/>Edit flavor</button><button className="admin-icon-btn" aria-label={`${product.active?"Hide":"Publish"} ${product.name}`} title={product.active?"Hide from menu":"Publish on menu"} disabled={Boolean(busy)} onClick={()=>changeVisibility(product,"toggle")}><AdminIcon name={product.active?"hidden":"eye"}/></button><button className="admin-icon-btn is-danger" aria-label={`Delete ${product.name}`} title="Move to Trash" disabled={Boolean(busy)} onClick={()=>setDeleteItem(product)}><AdminIcon name="trash"/></button></>}</footer>
        </article>)}</div>:<div className="menu-empty"><AdminIcon name={filter==="trash"?"trash":"search"}/><h2>{filter==="trash"?"Trash is empty.":"No flavors here yet."}</h2><p>{query?"Try another search or filter.":filter==="trash"?"Deleted flavors can be restored here. Your order history always stays intact.":"Add a cake pop or publish a hidden flavor to get started."}</p>{query?<button className="admin-btn admin-btn-secondary" onClick={()=>setQuery("")}>Clear search</button>:null}</div>}
      </>}
    </section>
    <p className="admin-footnote">Rotating flavors from Instagram are saved as hidden until you confirm availability. Add your own photos and recipe details before publishing.</p>
    {editor ? <MenuEditor product={editor.product} nextOrder={Math.max(0,...current.map(p=>p.sortOrder))+10} onClose={()=>setEditor(null)} onSaved={saved}/> : null}
    {deleteItem ? <Modal title={`Delete ${deleteItem.name}?`} label="Move to Trash" onClose={()=>!busy&&setDeleteItem(null)} className="menu-delete-dialog"><div className="admin-dialog-body"><p>This flavor will be removed from the shop and four-pack builder. Past orders keep their original details.</p><p>You can restore it anytime from Trash.</p></div><footer className="admin-dialog-footer"><button className="admin-btn admin-btn-secondary" onClick={()=>setDeleteItem(null)} disabled={Boolean(busy)}>Keep flavor</button><button className="admin-btn admin-btn-danger" onClick={()=>changeVisibility(deleteItem,"delete")} disabled={Boolean(busy)}><AdminIcon name="trash"/>{busy?"Moving…":"Move to Trash"}</button></footer></Modal> : null}
  </div>;
}
