"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import AdminIcon from "./AdminIcon";
import ConfirmDialog from "./ConfirmDialog";
import {
  MENU_ALLERGENS,
  MENU_IMAGE_MAX_BYTES,
  menuSlug,
  stockState,
  validateMenuProduct,
} from "@/supabase/functions/_shared/menu";
import { money } from "@/lib/format";
import CategoryManager, { announceCatalogChange } from "./CategoryManager";
import { categoryName, sellingUnit } from "@/lib/menu-categories";
import {
  MYSTERY_BAG_TEMPLATE,
  isMysteryBag,
  sellingContainer,
  bagContents,
  syncMysteryBagCopy,
} from "@/lib/product-offerings";
import "./catalog-admin.css";

function stockSummary(product) {
  const availability = stockState(
    product.stockQuantity,
    product.lowStockThreshold,
  );
  if (!availability.tracked) return "Made to order";
  if (availability.state === "sold_out") return "Sold out";
  return `${availability.remaining} left${availability.state === "low" ? " · low" : ""}`;
}

function draftFor(product, nextOrder, mysteryBag = false) {
  return {
    name: product?.name || "",
    slug: product?.slug || "",
    price: product?.price ?? 3,
    unit: product?.unit || "each",
    selling_format: isMysteryBag(product)
      ? "mystery-bag"
      : (product?.unitCount || 1) > 1
        ? "batch"
        : "each",
    offering_type: product?.offeringType || "standard",
    bonus_description: product?.bonusDescription || "",
    unit_count: product?.unitCount || 1,
    unit_label: product?.unitLabel || "treats",
    blurb: product?.blurb || "",
    description: product?.description || "",
    ingredients: product?.ingredients || "",
    image: product?.image || "",
    active: product?.active ?? false,
    bundle_eligible: product?.bundleEligible ?? true,
    category: product?.category || "everyday",
    allergens: product?.allergens || [],
    badge: product?.badge || "",
    sort_order: product?.sortOrder ?? nextOrder,
    source_url: product?.sourceUrl || "",
    stock_quantity: product?.stockQuantity ?? null,
    low_stock_threshold: product?.lowStockThreshold ?? 3,
    ...(!product && mysteryBag ? MYSTERY_BAG_TEMPLATE : {}),
  };
}

function FlavorPhoto({ image, name }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [image]);
  if (!image || failed)
    return (
      <div className="menu-photo-empty">
        <Image src="/logo-transparent.png" alt="" width={108} height={108} />
        <span>Product photo coming soon</span>
      </div>
    );
  return (
    <Image
      src={image}
      alt={name}
      fill
      sizes="(max-width:600px) 90vw, (max-width:1200px) 40vw, 28vw"
      onError={() => setFailed(true)}
    />
  );
}

function Modal({ title, label, children, onClose, className = "" }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
    };
  }, []);
  return (
    <dialog
      className={`admin-dialog ${className}`}
      ref={ref}
      aria-labelledby="menu-dialog-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <header className="admin-dialog-head">
        <div>
          <span className="admin-kicker">{label}</span>
          <h2 id="menu-dialog-title">{title}</h2>
        </div>
        <button
          className="admin-icon-btn"
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <AdminIcon name="close" />
        </button>
      </header>
      {children}
    </dialog>
  );
}

function MenuEditor({
  product,
  mysteryBag = false,
  nextOrder,
  categories,
  onCategoriesChanged,
  onClose,
  onSaved,
}) {
  const initial = useMemo(
    () => draftFor(product, nextOrder, mysteryBag),
    [product, nextOrder, mysteryBag],
  );
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [categoryEditor, setCategoryEditor] = useState(false);
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  function close() {
    if (busy || uploading) return;
    if (!dirty) {
      onClose();
      return;
    }
    setConfirmDiscard(true);
  }
  function change(key, value) {
    setForm((current) => {
      const next = syncMysteryBagCopy(current, {
        ...current,
        [key]: value,
        ...(!product && key === "name" ? { slug: menuSlug(value) } : {}),
        ...(key === "category"
          ? {
              bundle_eligible:
                current.offering_type !== "mystery-bag" &&
                current.unit_count === 1 &&
                categories.find((category) => category.slug === value)
                  ?.treatType !== "other",
            }
          : {}),
      });
      if (!product && next.name !== current.name)
        next.slug = menuSlug(next.name);
      return next;
    });
    setError("");
  }
  async function upload(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploadError("");
    if (
      file.size > MENU_IMAGE_MAX_BYTES ||
      !["image/jpeg", "image/png", "image/webp"].includes(file.type)
    ) {
      setUploadError("Choose a JPG, PNG, or WebP photo under 5 MB.");
      return;
    }
    setUploading(true);
    try {
      const body = new FormData();
      body.append("photo", file);
      const response = await fetch("/api/admin/menu/photo", {
        method: "POST",
        body,
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "The photo could not be uploaded.");
      change("image", data.url);
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  }
  async function save(event) {
    event.preventDefault();
    setError("");
    let payload;
    try {
      payload = validateMenuProduct(form, categories);
    } catch (err) {
      setError(err.message);
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(
        product ? `/api/admin/menu/${product.id}` : "/api/admin/menu",
        {
          method: product ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...payload,
            expectedUpdatedAt: product?.updatedAt,
          }),
        },
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Could not save the product.");
      onSaved(
        data.product,
        `${data.product.name} ${product ? "updated" : "added"}${data.product.active ? " and live on the menu" : " to Hidden"}.`,
      );
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }
  return (
    <>
      <ConfirmDialog
        open={confirmDiscard}
        title="Discard your changes?"
        message="This product has unsaved edits. Closing now will lose them."
        confirmLabel="Discard changes"
        cancelLabel="Keep editing"
        tone="danger"
        onConfirm={() => {
          setConfirmDiscard(false);
          onClose();
        }}
        onCancel={() => setConfirmDiscard(false)}
      />
      <Modal
        label={
          isMysteryBag(form)
            ? "Mystery bag setup"
            : product
              ? "Edit menu item"
              : "New menu item"
        }
        title={
          product
            ? product.name
            : isMysteryBag(form)
              ? "Create a mystery bag."
              : "Add a little sweetness."
        }
        onClose={close}
        className="menu-editor"
      >
        <form onSubmit={save}>
          <div className="admin-dialog-body">
            <div className="menu-editor-photo">
              <div className="menu-photo-preview">
                <FlavorPhoto image={form.image} name={form.name} />
              </div>
              <div>
                <h3>Give this treat a face.</h3>
                <p>A clear photo helps customers pick their favorites.</p>
                <label
                  className={`admin-btn admin-btn-secondary upload-button${uploading ? " is-busy" : ""}`}
                >
                  <AdminIcon name="upload" />
                  {uploading ? "Uploading…" : "Upload photo"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={upload}
                    disabled={uploading || busy}
                    aria-label="Upload product photo"
                  />
                </label>
                <small>JPG, PNG, or WebP · up to 5 MB</small>
                {form.image ? (
                  <button
                    type="button"
                    className="admin-text-btn"
                    onClick={() => change("image", "")}
                    disabled={uploading || busy}
                  >
                    Remove photo
                  </button>
                ) : null}
              </div>
            </div>
            {uploadError ? (
              <p className="admin-alert is-error" role="alert">
                {uploadError}
              </p>
            ) : null}
            <fieldset disabled={busy || uploading} className="menu-fields">
              <legend className="sr-only">Treat details</legend>
              <div className="catalog-editor-heading">
                <span>01</span>
                <div>
                  <h3>Product details</h3>
                  <p>
                    Name it, describe it, and choose its place in your menu.
                  </p>
                </div>
              </div>
              <label className="admin-field">
                Product name <span className="admin-required">*</span>
                <input
                  required
                  maxLength={80}
                  value={form.name}
                  onChange={(e) => change("name", e.target.value)}
                  placeholder="e.g. Cookie Monster"
                  autoFocus
                />
              </label>
              <label className="admin-field">
                Short description
                <input
                  maxLength={160}
                  value={form.blurb}
                  onChange={(e) => change("blurb", e.target.value)}
                  placeholder="A short description for the menu card"
                />
                <small>{form.blurb.length}/160 characters</small>
              </label>
              <label className="admin-field">
                About this treat
                <textarea
                  maxLength={2000}
                  value={form.description}
                  onChange={(e) => change("description", e.target.value)}
                  placeholder="Tell customers about the flavor and finish. Only include ingredients you can confirm."
                  rows={3}
                />
              </label>
              <div className="catalog-category-picker">
                <label className="admin-field">
                  Category
                  <select
                    value={form.category}
                    onChange={(e) => change("category", e.target.value)}
                  >
                    {categories.map((category) => (
                      <option key={category.slug} value={category.slug}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  className="admin-btn admin-btn-secondary"
                  type="button"
                  onClick={() => setCategoryEditor(true)}
                >
                  <AdminIcon name="plus" />
                  New category
                </button>
              </div>
              <div className="catalog-editor-heading">
                <span>02</span>
                <div>
                  <h3>Pricing & selling quantity</h3>
                  <p>Set the price for one item or one complete batch.</p>
                </div>
              </div>
              <div
                className="catalog-selling-options"
                role="radiogroup"
                aria-label="Selling format"
              >
                <label>
                  <input
                    type="radio"
                    name="selling-format"
                    checked={form.selling_format === "each"}
                    onChange={() =>
                      setForm((current) =>
                        current.selling_format === "each"
                          ? current
                          : {
                              ...current,
                              selling_format: "each",
                              offering_type: "standard",
                              bonus_description: "",
                              unit_count: 1,
                              bundle_eligible:
                                categories.find(
                                  (category) =>
                                    category.slug === current.category,
                                )?.treatType !== "other",
                            },
                      )
                    }
                  />
                  <span>
                    <b>Individual item</b>
                    <small>Price and stock are per treat</small>
                  </span>
                </label>
                <label>
                  <input
                    type="radio"
                    name="selling-format"
                    checked={form.selling_format === "batch"}
                    onChange={() =>
                      setForm((current) =>
                        current.selling_format === "batch"
                          ? current
                          : {
                              ...current,
                              selling_format: "batch",
                              offering_type: "standard",
                              bonus_description: "",
                              unit_count: 12,
                              bundle_eligible: false,
                            },
                      )
                    }
                  />
                  <span>
                    <b>Batch or pack</b>
                    <small>A dozen cookies, six brownies & more</small>
                  </span>
                </label>
                <label>
                  <input
                    type="radio"
                    name="selling-format"
                    checked={form.selling_format === "mystery-bag"}
                    onChange={() =>
                      setForm((current) =>
                        current.selling_format === "mystery-bag"
                          ? current
                          : {
                              ...current,
                              selling_format: "mystery-bag",
                              offering_type: "mystery-bag",
                              unit_count: 4,
                              unit_label: "cake pops",
                              bonus_description: "a sweet surprise",
                              bundle_eligible: false,
                              stock_quantity: current.stock_quantity ?? 0,
                            },
                      )
                    }
                  />
                  <span>
                    <b>Mystery bag</b>
                    <small>A surprise assortment, priced per bag</small>
                  </span>
                </label>
              </div>
              {form.selling_format !== "each" && (
                <div className="catalog-batch-fields">
                  <div
                    className="catalog-presets"
                    role="group"
                    aria-label="Common batch sizes"
                  >
                    {(isMysteryBag(form) ? [4, 6, 12] : [6, 12, 24]).map(
                      (count) => (
                        <button
                          type="button"
                          key={count}
                          aria-pressed={form.unit_count === count}
                          onClick={() => change("unit_count", count)}
                        >
                          {count === 4
                            ? "Four-pack · 4"
                            : count === 12
                              ? "A dozen · 12"
                              : count === 24
                                ? "Two dozen · 24"
                                : "Half dozen · 6"}
                        </button>
                      ),
                    )}
                  </div>
                  <div className="admin-field-grid">
                    <label className="admin-field">
                      {isMysteryBag(form)
                        ? "Main treats per bag"
                        : "Items per batch"}
                      <input
                        type="number"
                        required
                        min={isMysteryBag(form) ? "1" : "2"}
                        max="1000"
                        step="1"
                        value={form.unit_count}
                        onChange={(e) =>
                          change(
                            "unit_count",
                            e.target.value === "" ? "" : Number(e.target.value),
                          )
                        }
                      />
                    </label>
                    <label className="admin-field">
                      Item label
                      <input
                        required
                        maxLength={50}
                        value={form.unit_label}
                        onChange={(e) => change("unit_label", e.target.value)}
                        placeholder="e.g. small cookies"
                      />
                      <small>Use the plural name, such as small cookies.</small>
                    </label>
                  </div>
                </div>
              )}
              {isMysteryBag(form) && (
                <label className="admin-field">
                  Extra surprise (optional)
                  <input
                    maxLength={160}
                    value={form.bonus_description}
                    onChange={(e) =>
                      change("bonus_description", e.target.value)
                    }
                    placeholder="e.g. a sweet surprise"
                  />
                  <small>
                    This is in addition to the main treats above. Exact flavors
                    stay a surprise; describe the promise customers receive.
                  </small>
                </label>
              )}
              <div className="catalog-sale-preview">
                <div>
                  <span>Customers order</span>
                  <b>
                    {isMysteryBag(form)
                      ? `One mystery bag · ${bagContents(form)}`
                      : form.selling_format === "batch"
                        ? `One batch of ${form.unit_count} ${form.unit_label}`
                        : "One individual treat"}
                  </b>
                </div>
                <strong>{money(Number(form.price) || 0)}</strong>
              </div>
              <div className="admin-field-grid">
                <label className="admin-field">
                  {isMysteryBag(form)
                    ? "Price per bag"
                    : form.selling_format === "batch"
                      ? "Price per batch"
                      : "Price per item"}
                  <input
                    type="number"
                    min="0.01"
                    max="500"
                    step="0.01"
                    value={form.price}
                    onChange={(e) =>
                      change(
                        "price",
                        e.target.value === "" ? "" : Number(e.target.value),
                      )
                    }
                  />
                  <small>
                    The full selling price for the quantity shown above.
                  </small>
                </label>
                <label className="admin-field">
                  Display order
                  <input
                    type="number"
                    min="0"
                    max="10000"
                    step="1"
                    value={form.sort_order}
                    onChange={(e) =>
                      change("sort_order", Number(e.target.value))
                    }
                  />
                  <small>Lower numbers appear first.</small>
                </label>
              </div>
              <div className="admin-field-grid">
                <label className="admin-field">
                  {isMysteryBag(form)
                    ? "Bags available"
                    : form.selling_format === "batch"
                      ? "Batches available"
                      : "Quantity available"}
                  <input
                    type="number"
                    min="0"
                    max="100000"
                    step="1"
                    placeholder={isMysteryBag(form) ? "0" : "Made to order"}
                    required={isMysteryBag(form)}
                    value={form.stock_quantity ?? ""}
                    onChange={(e) =>
                      change(
                        "stock_quantity",
                        e.target.value === ""
                          ? isMysteryBag(form)
                            ? ""
                            : null
                          : Number(e.target.value),
                      )
                    }
                  />
                  <small>
                    {isMysteryBag(form)
                      ? "Count complete bags. Update after confirming orders or selling in person. Set 0 to show sold out."
                      : form.selling_format === "batch"
                        ? "Count complete batches, not individual pieces. "
                        : ""}
                    {!isMysteryBag(form) &&
                      "Leave blank for made to order. Set 0 to show sold out."}
                  </small>
                </label>
                <label className="admin-field">
                  Warn when only this many are left
                  <input
                    type="number"
                    min="0"
                    max="1000"
                    step="1"
                    value={form.low_stock_threshold}
                    onChange={(e) =>
                      change("low_stock_threshold", Number(e.target.value))
                    }
                  />
                  <small>
                    Shoppers see &ldquo;Only 3 left&rdquo; at or below this
                    number.
                  </small>
                </label>
              </div>
              {form.selling_format === "each" ? (
                <label className="admin-toggle-row">
                  <span>
                    <b>Include in treat-pack offers</b>
                    <small>
                      Eligible cake pops can be paired. Mixed four-packs allow
                      at most 1 rice crispy treat and 2 Oreos.
                    </small>
                  </span>
                  <input
                    type="checkbox"
                    role="switch"
                    checked={form.bundle_eligible}
                    onChange={(e) =>
                      change("bundle_eligible", e.target.checked)
                    }
                    aria-label="Include in treat-pack offers"
                  />
                </label>
              ) : (
                <p className="admin-footnote">
                  This {isMysteryBag(form) ? "bag" : "batch"} is sold at its own
                  price. It can be included in a weekly box.
                </p>
              )}
              <div className="catalog-editor-heading">
                <span>03</span>
                <div>
                  <h3>Recipe & finishing details</h3>
                  <p>
                    Help customers understand your ingredients and presentation.
                  </p>
                </div>
              </div>
              <label className="admin-field">
                Ingredients
                <textarea
                  maxLength={5000}
                  value={form.ingredients}
                  onChange={(e) => change("ingredients", e.target.value)}
                  placeholder="List the ingredients for this product, including coatings and toppings."
                  rows={5}
                />
                <small>
                  Shown on the product page. Enter the ingredients from your
                  actual recipe.
                </small>
              </label>
              <label className="admin-field">
                Menu label <small>Optional</small>
                <input
                  maxLength={32}
                  value={form.badge}
                  onChange={(e) => change("badge", e.target.value)}
                  placeholder="e.g. New flavor or Fan favorite"
                />
              </label>
              <fieldset className="menu-allergens">
                <legend>Contains these allergens</legend>
                <p>
                  Confirm the recipe before selecting. An empty list does not
                  mean allergen-free.
                </p>
                <div>
                  {MENU_ALLERGENS.filter((a) => a !== "dairy").map(
                    (allergen) => (
                      <label key={allergen}>
                        <input
                          type="checkbox"
                          checked={
                            form.allergens.includes(allergen) ||
                            (allergen === "milk" &&
                              form.allergens.includes("dairy"))
                          }
                          onChange={(e) => {
                            const list = form.allergens.filter(
                              (a) =>
                                a !== allergen &&
                                !(allergen === "milk" && a === "dairy"),
                            );
                            change(
                              "allergens",
                              e.target.checked ? [...list, allergen] : list,
                            );
                          }}
                        />
                        {allergen}
                      </label>
                    ),
                  )}
                </div>
              </fieldset>
              <label className="admin-toggle-row menu-publish">
                <span>
                  <b>
                    {form.active ? "Live on the menu" : "Hidden from customers"}
                  </b>
                  <small>
                    {form.active
                      ? "Customers can request this flavor from the shop."
                      : "Keep it saved until you’re ready to offer it."}
                  </small>
                </span>
                <input
                  type="checkbox"
                  role="switch"
                  checked={form.active}
                  onChange={(e) => change("active", e.target.checked)}
                  aria-label="Publish on menu"
                />
              </label>
              <div className="menu-link-preview">
                <AdminIcon name="external" />
                <span>/shop/{form.slug || "your-flavor"}</span>
                <small>
                  {product ? "Permanent link" : "Created from the name"}
                </small>
              </div>
              {product?.sourceUrl ? (
                <a
                  className="admin-text-btn"
                  href={product.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View original Instagram post <AdminIcon name="external" />
                </a>
              ) : null}
            </fieldset>
            {error ? (
              <p className="admin-alert is-error" role="alert">
                {error}
              </p>
            ) : null}
          </div>
          <footer className="admin-dialog-footer">
            <button
              className="admin-btn admin-btn-secondary"
              type="button"
              onClick={close}
              disabled={busy || uploading}
            >
              Cancel
            </button>
            <button
              className="admin-btn admin-btn-primary"
              type="submit"
              disabled={busy || uploading || (product && !dirty)}
            >
              <AdminIcon name="check" />
              {busy
                ? "Saving…"
                : product
                  ? "Save changes"
                  : isMysteryBag(form)
                    ? "Add mystery bag"
                    : "Add menu item"}
            </button>
          </footer>
        </form>
      </Modal>
      {categoryEditor && (
        <CategoryManager
          categories={categories}
          onChanged={onCategoriesChanged}
          onCreated={(category) => {
            setForm((current) => ({
              ...current,
              category: category.slug,
              bundle_eligible:
                current.offering_type !== "mystery-bag" &&
                current.unit_count === 1 &&
                category.treatType !== "other",
            }));
            setCategoryEditor(false);
          }}
          onClose={() => setCategoryEditor(false)}
        />
      )}
    </>
  );
}

export default function MenuManager({ mysteryBagsOnly = false }) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [filter, setFilter] = useState("all");
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [view, setView] = useState("list");
  const [page, setPage] = useState(1);
  const [editor, setEditor] = useState(null);
  const [categoryEditor, setCategoryEditor] = useState(false);
  const [deleteItem, setDeleteItem] = useState(null);
  const [busy, setBusy] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/menu", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Could not load the menu.");
      setProducts(data.products);
      setCategories(data.categories || []);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    let stopped = false;
    async function refreshCategories() {
      try {
        const response = await fetch("/api/admin/menu", {
          cache: "no-store",
        });
        const data = await response.json();
        if (response.ok && !stopped) {
          setCategories(data.categories || []);
          setProducts(data.products || []);
        }
      } catch {}
    }
    window.addEventListener("bonbons-catalog-changed", refreshCategories);
    return () => {
      stopped = true;
      window.removeEventListener("bonbons-catalog-changed", refreshCategories);
    };
  }, []);
  useEffect(() => {
    setPage(1);
  }, [filter, category, query]);
  const catalogProducts = mysteryBagsOnly
    ? products.filter(isMysteryBag)
    : products;
  const current = catalogProducts.filter((product) => !product.deletedAt);
  const counts = {
    all: current.length,
    live: current.filter((product) => product.active).length,
    hidden: current.filter((product) => !product.active).length,
    trash: catalogProducts.length - current.length,
  };
  const shown = catalogProducts
    .filter(
      (product) =>
        (filter === "trash"
          ? product.deletedAt
          : !product.deletedAt &&
            (filter === "all" ||
              (filter === "live" ? product.active : !product.active))) &&
        (category === "all" || product.category === category) &&
        `${product.name} ${product.blurb} ${categoryName(product)}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  const pages = Math.max(1, Math.ceil(shown.length / 12));
  const actualPage = Math.min(page, pages);
  const visible = shown.slice((actualPage - 1) * 12, actualPage * 12);
  function saved(product, message) {
    setProducts((rows) =>
      rows.some((row) => row.id === product.id)
        ? rows.map((row) => (row.id === product.id ? product : row))
        : [...rows, product],
    );
    setEditor(null);
    setDeleteItem(null);
    setNotice(message);
    setError("");
    announceCatalogChange();
  }
  async function changeVisibility(product, action) {
    setBusy(product.id);
    setError("");
    setNotice("");
    try {
      const body =
        action === "delete"
          ? { expectedUpdatedAt: product.updatedAt }
          : action === "restore"
            ? { restore: true, expectedUpdatedAt: product.updatedAt }
            : {
                ...draftFor(product, 0),
                active: !product.active,
                expectedUpdatedAt: product.updatedAt,
              };
      const response = await fetch(`/api/admin/menu/${product.id}`, {
        method: action === "delete" ? "DELETE" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Could not update this product.");
      saved(
        data.product,
        action === "delete"
          ? `${product.name} moved to Trash.`
          : action === "restore"
            ? `${product.name} restored to Hidden.`
            : `${product.name} is now ${data.product.active ? "live" : "hidden"}.`,
      );
    } catch (error) {
      setError(error.message);
      setDeleteItem(null);
    } finally {
      setBusy("");
    }
  }
  return (
    <div className="admin-view menu-view catalog-view">
      <header className="admin-page-head">
        <div>
          <span className="admin-kicker">
            {mysteryBagsOnly ? "Surprise assortments" : "Menu management"}
          </span>
          <h1>
            {mysteryBagsOnly
              ? "A little mystery. A lot of sweet."
              : "Your sweet collection."}
          </h1>
          <p>
            {mysteryBagsOnly
              ? "Create, publish, and restock your mystery bags. Every bag has its own price and quantity."
              : "Every treat, batch, and category. One place to make it yours."}
          </p>
        </div>
        <div className="catalog-header-actions">
          <button
            className="admin-btn admin-btn-secondary"
            type="button"
            onClick={() => setCategoryEditor(true)}
            disabled={loading || Boolean(error)}
          >
            <AdminIcon name="menu" />
            Categories
          </button>
          <button
            className="admin-btn admin-btn-primary"
            type="button"
            onClick={() =>
              setEditor({ product: null, mysteryBag: mysteryBagsOnly })
            }
            disabled={loading || Boolean(error)}
          >
            <AdminIcon name="plus" />
            {mysteryBagsOnly ? "Add mystery bag" : "Add menu item"}
          </button>
        </div>
      </header>
      {mysteryBagsOnly && (
        <section
          className="mystery-bag-intro catalog-panel"
          aria-label="Mystery bag starter"
        >
          <Image
            src="/products/mystery-bags-flyer.jpg"
            alt="Bon Bon's Mystery 4 Pack Bags flyer: four cake pops and a sweet surprise for $10"
            width={960}
            height={1280}
          />
          <div>
            <span className="admin-kicker">Your four-pack favorite</span>
            <h2>
              Four cake pops.
              <br />
              One sweet surprise.
            </h2>
            <p>
              Start with your $10 flyer offer, then choose how many bags are
              available. Change the size, price, extra surprise, photo,
              ingredients, and allergens for every new assortment.
            </p>
            <small>
              The flyer is a reference. Your saved bag stock controls
              availability on the website.
            </small>
          </div>
        </section>
      )}
      <section className="catalog-overview" aria-label="Menu summary">
        {[
          ["all", mysteryBagsOnly ? "Bags" : "Products", "menu"],
          ["live", "Live on the menu", "eye"],
          ["hidden", "Saved as hidden", "hidden"],
        ].map(([key, label, icon]) => (
          <button
            type="button"
            key={key}
            onClick={() => setFilter(key)}
            className={`catalog-stat is-${key}`}
          >
            <AdminIcon name={icon} />
            <span>
              {label}
              <b>{loading ? "—" : counts[key]}</b>
            </span>
          </button>
        ))}
        <button
          type="button"
          className="catalog-stat is-categories"
          onClick={() => setCategoryEditor(true)}
          disabled={loading}
        >
          <AdminIcon name="menu" />
          <span>
            Categories<b>{loading ? "—" : categories.length}</b>
          </span>
        </button>
      </section>
      {notice && (
        <p className="admin-alert" role="status">
          <AdminIcon name="check" />
          {notice}
          <button aria-label="Dismiss notice" onClick={() => setNotice("")}>
            <AdminIcon name="close" />
          </button>
        </p>
      )}
      {error && (
        <div className="admin-alert is-error" role="alert">
          <span>{error}</span>
          <button className="admin-text-btn" onClick={load}>
            Try again
          </button>
        </div>
      )}
      <section
        className="menu-catalog catalog-panel"
        aria-label="Treat catalog"
      >
        <div className="catalog-panel-header">
          <div>
            <h2>
              {mysteryBagsOnly ? "Mystery bag collection" : "Product library"}
            </h2>
            <p>Organize your menu and set what customers can order.</p>
          </div>
          <div className="catalog-store-links">
            {!mysteryBagsOnly && (
              <Link
                href="/preview/packs"
                target="_blank"
                className="admin-text-btn"
              >
                Preview packs <AdminIcon name="external" />
              </Link>
            )}
            <Link href="/shop" target="_blank" className="admin-text-btn">
              Storefront <AdminIcon name="external" />
            </Link>
          </div>
        </div>
        <div className="menu-toolbar catalog-toolbar">
          <div
            className="menu-tabs"
            role="group"
            aria-label="Filter menu items"
          >
            {[
              ["all", "All"],
              ["live", "Live"],
              ["hidden", "Hidden"],
              ["trash", "Trash"],
            ].map(([key, label]) => (
              <button
                type="button"
                key={key}
                aria-pressed={filter === key}
                className={filter === key ? "active" : ""}
                onClick={() => setFilter(key)}
              >
                {label}
                <span>{counts[key]}</span>
              </button>
            ))}
          </div>
          <label className="menu-search">
            <AdminIcon name="search" />
            <input
              aria-label="Search products"
              placeholder="Find a product…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <select
            className="catalog-category-filter"
            aria-label="Filter by category"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            <option value="all">All categories</option>
            {categories.map((entry) => (
              <option key={entry.slug} value={entry.slug}>
                {entry.name}
              </option>
            ))}
          </select>
          <div
            className="catalog-view-switch"
            role="group"
            aria-label="Product view"
          >
            {["list", "cards"].map((mode) => (
              <button
                key={mode}
                type="button"
                aria-pressed={view === mode}
                onClick={() => setView(mode)}
              >
                {mode === "list" ? "List" : "Cards"}
              </button>
            ))}
          </div>
          <button
            className="admin-icon-btn"
            aria-label="Refresh menu"
            onClick={load}
            disabled={loading}
          >
            <AdminIcon name="refresh" />
          </button>
        </div>
        {loading ? (
          <div className="menu-loading" role="status">
            <span className="admin-spinner" />
            Loading your collection…
          </div>
        ) : (
          <>
            <div className="menu-results-label">
              <span>
                {shown.length} product{shown.length === 1 ? "" : "s"}
                {category !== "all"
                  ? ` · ${categories.find((entry) => entry.slug === category)?.name}`
                  : ""}
              </span>
              <span>Prices are per selling quantity</span>
            </div>
            {shown.length ? (
              <div className={`catalog-layout is-${view}`}>
                {visible.map((product) => (
                  <article
                    className={`menu-card catalog-product${!product.active ? " is-hidden" : ""}`}
                    key={product.id}
                  >
                    <div className="menu-card-photo">
                      <FlavorPhoto image={product.image} name={product.name} />
                    </div>
                    <div className="catalog-product-info">
                      <div className="catalog-product-tags">
                        <span
                          className={`menu-status ${product.deletedAt ? "is-trash" : product.active ? "is-live" : ""}`}
                        >
                          {product.deletedAt
                            ? "In Trash"
                            : product.active
                              ? "Live"
                              : "Hidden"}
                        </span>
                        <span>
                          {categories.find(
                            (entry) => entry.slug === product.category,
                          )?.name || categoryName(product)}
                        </span>
                        {product.badge && <span>{product.badge}</span>}
                      </div>
                      <h2>{product.name}</h2>
                      <p>
                        {product.unitCount > 1 || isMysteryBag(product)
                          ? `${isMysteryBag(product) ? bagContents(product) : sellingUnit(product)} per ${sellingContainer(product)}`
                          : product.blurb || "Individual treat"}
                      </p>
                    </div>
                    <div className="catalog-product-price">
                      <b>{money(product.price)}</b>
                      <span>
                        {isMysteryBag(product)
                          ? "per bag"
                          : product.unitCount > 1
                            ? "per batch"
                            : "each"}
                      </span>
                    </div>
                    <div className="catalog-product-stock">
                      <b>{stockSummary(product)}</b>
                      <span>
                        {isMysteryBag(product)
                          ? "Bag quantities"
                          : product.unitCount > 1
                            ? "Batch quantities"
                            : product.bundleEligible
                              ? "Treat-pack eligible"
                              : "Individual pricing"}
                      </span>
                    </div>
                    <footer className="menu-card-actions">
                      {product.deletedAt ? (
                        <button
                          className="admin-btn admin-btn-secondary"
                          onClick={() => changeVisibility(product, "restore")}
                          disabled={Boolean(busy)}
                        >
                          <AdminIcon name="restore" />
                          Restore
                        </button>
                      ) : (
                        <>
                          <button
                            className="menu-edit-btn"
                            aria-label={`Edit ${product.name}`}
                            onClick={() => setEditor({ product })}
                          >
                            <AdminIcon name="edit" />
                            <span>Edit</span>
                          </button>
                          <button
                            className="admin-icon-btn"
                            aria-label={`${product.active ? "Hide" : "Publish"} ${product.name}`}
                            disabled={Boolean(busy)}
                            onClick={() => changeVisibility(product, "toggle")}
                          >
                            <AdminIcon
                              name={product.active ? "hidden" : "eye"}
                            />
                          </button>
                          <button
                            className="admin-icon-btn is-danger"
                            aria-label={`Move ${product.name} to Trash`}
                            disabled={Boolean(busy)}
                            onClick={() => setDeleteItem(product)}
                          >
                            <AdminIcon name="trash" />
                          </button>
                        </>
                      )}
                    </footer>
                  </article>
                ))}
              </div>
            ) : (
              <div className="menu-empty">
                <AdminIcon name={filter === "trash" ? "trash" : "search"} />
                <h2>
                  {filter === "trash"
                    ? "Trash is empty."
                    : mysteryBagsOnly && !current.length
                      ? "Your first mystery bag starts here."
                      : "No products match."}
                </h2>
                <p>
                  {mysteryBagsOnly && !current.length
                    ? "Create a hidden draft with your four-pack offer, then publish when your bags are ready."
                    : "Try a different category or search, or add your next sweet idea."}
                </p>
                <button
                  className="admin-btn admin-btn-secondary"
                  onClick={() => {
                    if (mysteryBagsOnly && !current.length) {
                      setEditor({ product: null, mysteryBag: true });
                      return;
                    }
                    setFilter("all");
                    setCategory("all");
                    setQuery("");
                  }}
                >
                  {mysteryBagsOnly
                    ? !current.length
                      ? "Create your first bag"
                      : "Show all bags"
                    : "Show all products"}
                </button>
              </div>
            )}
            {shown.length > 12 && (
              <nav className="catalog-pagination" aria-label="Product pages">
                <span>
                  Showing {(actualPage - 1) * 12 + 1}–
                  {Math.min(actualPage * 12, shown.length)} of {shown.length}
                </span>
                <div>
                  <button
                    type="button"
                    className="admin-btn admin-btn-secondary"
                    disabled={actualPage === 1}
                    onClick={() => setPage(actualPage - 1)}
                  >
                    Previous
                  </button>
                  <b>
                    {actualPage} / {pages}
                  </b>
                  <button
                    type="button"
                    className="admin-btn admin-btn-secondary"
                    disabled={actualPage === pages}
                    onClick={() => setPage(actualPage + 1)}
                  >
                    Next
                  </button>
                </div>
              </nav>
            )}
          </>
        )}
      </section>
      <p className="admin-footnote catalog-help">
        Start with a hidden draft. Add the photo, ingredients, selling quantity,
        and price, then publish when you&apos;re ready.
      </p>
      {editor && (
        <MenuEditor
          product={editor.product}
          mysteryBag={editor.mysteryBag}
          nextOrder={
            Math.max(0, ...current.map((product) => product.sortOrder)) + 10
          }
          categories={categories}
          onCategoriesChanged={setCategories}
          onClose={() => setEditor(null)}
          onSaved={saved}
        />
      )}
      {categoryEditor && (
        <CategoryManager
          categories={categories}
          onChanged={setCategories}
          onClose={() => setCategoryEditor(false)}
        />
      )}
      {deleteItem && (
        <Modal
          title={`Move ${deleteItem.name} to Trash?`}
          label="Menu visibility"
          onClose={() => !busy && setDeleteItem(null)}
          className="menu-delete-dialog"
        >
          <div className="admin-dialog-body">
            <p>
              This product can be restored anytime from Trash. Past orders keep
              their original details.
            </p>
          </div>
          <footer className="admin-dialog-footer">
            <button
              className="admin-btn admin-btn-secondary"
              onClick={() => setDeleteItem(null)}
              disabled={Boolean(busy)}
            >
              Keep product
            </button>
            <button
              className="admin-btn admin-btn-danger"
              onClick={() => changeVisibility(deleteItem, "delete")}
              disabled={Boolean(busy)}
            >
              <AdminIcon name="trash" />
              {busy ? "Moving…" : "Move to Trash"}
            </button>
          </footer>
        </Modal>
      )}
    </div>
  );
}
