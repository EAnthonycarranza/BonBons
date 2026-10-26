"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import AdminIcon from "./AdminIcon";
import AdminSelect from "./AdminSelect";
import { money } from "@/lib/format";
import { sellingUnit } from "@/lib/menu-categories";

export default function AdminProductPicker({ products, categories, items, onAdd, onClose }) {
  const dialogRef = useRef(null);
  const openerRef = useRef(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  useEffect(() => {
    const dialog = dialogRef.current;
    openerRef.current = document.activeElement;
    dialog.showModal();
    dialog.querySelector("h2")?.focus();
    return () => dialog.close();
  }, []);
  function close() {
    dialogRef.current?.close();
    openerRef.current?.focus({ preventScroll: true });
    onClose();
  }
  const matching = products.filter(product => (category === "all" || category === product.category) && `${product.name} ${product.blurb || ""}`.toLowerCase().includes(search.trim().toLowerCase()));
  const total = items.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
  return <dialog ref={dialogRef} className="admin-dialog box-product-picker" aria-labelledby="box-product-picker-title" onCancel={event => { event.preventDefault(); close(); }}>
    <header className="admin-dialog-head"><div><span className="admin-kicker">Build your assortment</span><h2 id="box-product-picker-title" tabIndex={-1}>Add treats to this box</h2><p>Add several products, then fine-tune quantities in the box.</p></div><button type="button" className="admin-icon-btn" onClick={close} aria-label="Close product browser"><AdminIcon name="close"/></button></header>
    <div className="box-picker-filters"><label className="box-picker-search"><AdminIcon name="search"/><input type="search" aria-label="Search box products" placeholder="Search your products…" value={search} onChange={event => setSearch(event.target.value)}/></label><label className="admin-field">Category<AdminSelect value={category} onChange={event => setCategory(event.target.value)}><option value="all">All categories</option>{categories.map(entry => <option key={entry.slug} value={entry.slug}>{entry.name}</option>)}</AdminSelect></label></div>
    <div className="box-picker-results"><p className="box-picker-count" role="status">{matching.length} {matching.length === 1 ? "product" : "products"} · hidden products are available for staff to add</p>{matching.length ? matching.map(product => {
      const quantity = Number(items.find(item => item.slug === product.slug)?.qty) || 0;
      return <article className="box-picker-product" key={product.slug}><div className="box-picker-photo">{product.image ? <Image src={product.image} alt="" fill unoptimized sizes="52px"/> : <AdminIcon name="menu"/>}</div><div><h3>{product.name}</h3><p>{money(Number(product.price) || 0)} · {product.unitCount > 1 ? sellingUnit(product) + " per batch" : "each"}{!product.active ? " · hidden" : ""}</p>{quantity > 0 && <small>{quantity} {quantity === 1 ? "selling unit" : "selling units"} in box</small>}</div><button type="button" className="admin-btn admin-btn-secondary" disabled={quantity >= 99} onClick={() => onAdd(product.slug)} aria-label={`Add ${product.name} to box`}><AdminIcon name={quantity ? "check" : "plus"}/>{quantity >= 99 ? "Max" : "Add"}</button></article>;
    }) : <div className="box-picker-empty"><AdminIcon name="search"/><h3>No products found</h3><p>Try another search or category.</p></div>}</div>
    <footer className="admin-dialog-footer"><span role="status">{total} selling {total === 1 ? "unit" : "units"} selected</span><button type="button" className="admin-btn admin-btn-primary" onClick={close}>Done adding</button></footer>
  </dialog>;
}
