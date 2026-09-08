"use client";
import { useEffect, useRef } from "react";
import AdminIcon from "./AdminIcon";

/**
 * Styled replacement for window.confirm across the Shop Desk.
 *
 * Uses a native <dialog>, which brings focus trapping, Escape, and focus
 * return for free. `tone="danger"` is for actions that destroy data, and those
 * take an explicit consequence line rather than a bare question.
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  consequence,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "default",
  busy = false,
  onConfirm,
  onCancel,
}) {
  const ref = useRef(null);
  const confirmRef = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      const previousOverflow = document.body.style.overflow;
      dialog.showModal();
      document.body.style.overflow = "hidden";
      // Land on Cancel for destructive actions so Enter cannot delete by reflex.
      if (tone !== "danger") confirmRef.current?.focus();
      return () => { document.body.style.overflow = previousOverflow; };
    }
    if (!open && dialog.open) dialog.close();
  }, [open, tone]);

  if (!open) return null;

  return (
    <dialog
      className={`admin-dialog confirm-dialog${tone === "danger" ? " is-danger" : ""}`}
      ref={ref}
      aria-labelledby="confirm-dialog-title"
      onCancel={(event) => { event.preventDefault(); if (!busy) onCancel(); }}
    >
      <div className="confirm-body">
        <span className="confirm-icon" aria-hidden="true">
          <AdminIcon name={tone === "danger" ? "trash" : "edit"} />
        </span>
        <div>
          <h2 id="confirm-dialog-title">{title}</h2>
          {message ? <p>{message}</p> : null}
          {consequence ? <p className="confirm-consequence">{consequence}</p> : null}
        </div>
      </div>
      <div className="admin-dialog-footer">
        <button type="button" className="admin-btn admin-btn-secondary" onClick={onCancel} disabled={busy}>
          {cancelLabel}
        </button>
        <button
          type="button"
          ref={confirmRef}
          className={`admin-btn ${tone === "danger" ? "admin-btn-danger" : "admin-btn-primary"}`}
          onClick={onConfirm}
          disabled={busy}
        >
          {busy ? "Working…" : confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
