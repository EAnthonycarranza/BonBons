"use client";
import { useEffect, useRef, useState } from "react";
import AdminIcon from "./AdminIcon";
import ConfirmDialog from "./ConfirmDialog";
import { TREAT_TYPES, validateCategory } from "@/lib/menu-categories";
import "./catalog-admin.css";

const emptyCategory = () => ({ name: "", treatType: "other", sortOrder: 50 });
export function announceCatalogChange() {
  window.dispatchEvent(new Event("bonbons-catalog-changed"));
}
export default function CategoryManager({
  categories = [],
  onChanged,
  onCreated,
  onClose,
}) {
  const ref = useRef(null);
  const [rows, setRows] = useState(categories);
  useEffect(() => { setRows(categories); }, [categories]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyCategory);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [discard, setDiscard] = useState(false);
  const initial = editing
    ? {
        name: editing.name,
        treatType: editing.treatType,
        sortOrder: editing.sortOrder,
      }
    : emptyCategory();
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
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
  useEffect(() => {
    if (!dirty) return;
    const warn = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  function close() {
    if (busy) return;
    if (dirty) setDiscard(true);
    else onClose();
  }
  function select(category) {
    if (dirty) {
      setError("Save your category changes before selecting another category.");
      return;
    }
    setEditing(category);
    setForm(
      category
        ? {
            name: category.name,
            treatType: category.treatType,
            sortOrder: category.sortOrder,
          }
        : emptyCategory(),
    );
    setError("");
    setNotice("");
  }
  async function save(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    let payload;
    try {
      payload = validateCategory({ ...form, slug: editing?.slug });
    } catch (error) {
      setError(error.message);
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/admin/categories", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: payload.name,
          slug: payload.slug,
          treatType: form.treatType,
          sortOrder: form.sortOrder,
          expectedUpdatedAt: editing?.updatedAt,
        }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Could not save the category.");
      const next = [
        ...rows.filter((row) => row.slug !== data.category.slug),
        data.category,
      ].sort(
        (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
      );
      setRows(next);
      onChanged?.(next);
      announceCatalogChange();
      if (!editing && onCreated) {
        onCreated(data.category);
        return;
      }
      setEditing(data.category);
      setForm({
        name: data.category.name,
        treatType: data.category.treatType,
        sortOrder: data.category.sortOrder,
      });
      setNotice(`${data.category.name} saved.`);
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <dialog
        ref={ref}
        className="admin-dialog category-dialog"
        aria-labelledby="category-dialog-title"
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
      >
        <header className="admin-dialog-head">
          <div>
            <span className="admin-kicker">Your menu, organized</span>
            <h2 id="category-dialog-title">Menu categories</h2>
          </div>
          <button
            className="admin-icon-btn"
            aria-label="Close categories"
            onClick={close}
          >
            <AdminIcon name="close" />
          </button>
        </header>
        <div className="category-manager-body">
          <aside
            className="category-manager-list"
            aria-label="Saved categories"
          >
            <button
              type="button"
              className={!editing ? "selected" : ""}
              onClick={() => select(null)}
              disabled={busy}
            >
              <AdminIcon name="plus" />
              <span>Add a category</span>
            </button>
            {rows.map((category) => (
              <button
                type="button"
                key={category.slug}
                className={editing?.slug === category.slug ? "selected" : ""}
                onClick={() => select(category)}
                disabled={busy}
              >
                <span>
                  {category.name}
                  <small>
                    {category.productCount || 0}{" "}
                    {category.productCount === 1 ? "product" : "products"}
                  </small>
                </span>
                <AdminIcon name="edit" />
              </button>
            ))}
          </aside>
          <form className="category-manager-form" onSubmit={save}>
            <span className="admin-kicker">
              {editing ? "Edit category" : "New category"}
            </span>
            <h3>{editing ? editing.name : "Make room for something new."}</h3>
            <p>
              Categories become shelves in your storefront. Create Cookies,
              Brownies, Seasonal Treats, or any collection you need.
            </p>
            <fieldset disabled={busy} className="menu-fields">
              <legend className="sr-only">Category details</legend>
              <label className="admin-field">
                Category name
                <input
                  autoFocus
                  required
                  maxLength={60}
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder="e.g. Cookies"
                />
              </label>
              <label className="admin-field">
                Treat type
                <select
                  disabled={Boolean(editing)}
                  value={form.treatType}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      treatType: event.target.value,
                    }))
                  }
                >
                  {TREAT_TYPES.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <small>
                  Used for cake-pop pairs and the rice crispy/Oreo limits. The
                  type is fixed after creation; products have their own offer
                  eligibility.
                </small>
              </label>
              <label className="admin-field">
                Display order
                <input
                  type="number"
                  min="0"
                  max="10000"
                  step="1"
                  value={form.sortOrder}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      sortOrder: Number(event.target.value),
                    }))
                  }
                />
                <small>Lower numbers appear first.</small>
              </label>
            </fieldset>
            {error && (
              <p className="admin-alert is-error" role="alert">
                {error}
              </p>
            )}
            {notice && (
              <p className="admin-alert" role="status">
                {notice}
              </p>
            )}
            <button
              type="submit"
              className="admin-btn admin-btn-primary"
              disabled={busy || !dirty}
            >
              {busy ? "Saving…" : editing ? "Save category" : "Create category"}
            </button>
          </form>
        </div>
      </dialog>
      <ConfirmDialog
        open={discard}
        title="Discard category changes?"
        message="The category has not been saved yet."
        confirmLabel="Discard changes"
        cancelLabel="Keep editing"
        tone="danger"
        onConfirm={onClose}
        onCancel={() => setDiscard(false)}
      />
    </>
  );
}

export function CategorySettings() {
  const [categories, setCategories] = useState([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let stopped = false;
    async function load() {
      try {
        const response = await fetch("/api/admin/categories", {
          cache: "no-store",
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        if (!stopped) {
          setCategories(data.categories);
          setError("");
        }
      } catch (error) {
        if (!stopped) setError(error.message);
      }
    }
    load();
    window.addEventListener("bonbons-catalog-changed", load);
    return () => {
      stopped = true;
      window.removeEventListener("bonbons-catalog-changed", load);
    };
  }, []);
  return (
    <section className="admin-setting-card category-settings-card">
      <header>
        <span className="summary-icon">
          <AdminIcon name="menu" />
        </span>
        <div>
          <h2>Menu categories</h2>
          <p>Give every product a place, from cake pops to cookies.</p>
        </div>
      </header>
      <div className="category-settings-tags">
        {categories.map((category) => (
          <span key={category.slug}>{category.name}</span>
        ))}
      </div>
      {error && (
        <p className="admin-alert is-error" role="alert">
          {error}
        </p>
      )}
      <button
        className="admin-btn admin-btn-secondary"
        type="button"
        onClick={() => setOpen(true)}
        disabled={Boolean(error)}
      >
        <AdminIcon name="plus" />
        Manage categories
      </button>
      {open && (
        <CategoryManager
          categories={categories}
          onChanged={setCategories}
          onClose={() => setOpen(false)}
        />
      )}
    </section>
  );
}
