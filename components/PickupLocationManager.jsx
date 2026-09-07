"use client";

import { useEffect, useState } from "react";

const EMPTY_LOCATION = {
  label: "",
  streetAddress: "",
  city: "San Antonio",
  state: "TX",
  postalCode: "",
  country: "United States",
};

export function googleMapsUrl(address) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address || "")}`;
}

export function PickupLocationPicker({ locations, value, onChange, onManage }) {
  const savedValues = new Set(locations.map((location) => location.formattedAddress));
  const hasLegacyValue = Boolean(value && !savedValues.has(value));

  return (
    <div className="crm-pickup-picker">
      <select value={value} onChange={(event) => onChange(event.target.value)} aria-label="Pickup location">
        <option value="" disabled>Choose a pickup location</option>
        {hasLegacyValue ? <option value={value}>{value} · saved on this order</option> : null}
        {locations.map((location) => (
          <option key={location.id} value={location.formattedAddress}>
            {location.label} · {location.formattedAddress}
          </option>
        ))}
      </select>
      <div className="crm-pickup-picker-actions">
        {value ? (
          <a href={googleMapsUrl(value)} target="_blank" rel="noreferrer">View on Google Maps ↗</a>
        ) : <span>No address selected</span>}
        <button type="button" onClick={onManage}>Manage locations</button>
      </div>
    </div>
  );
}

export default function PickupLocationManager({ open, locations, onClose, onChanged }) {
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_LOCATION);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!open) return undefined;
    function onKeyDown(event) {
      if (event.key === "Escape" && !busy) onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [busy, onClose, open]);

  if (!open) return null;

  function startAdd() {
    setEditing("new");
    setForm(EMPTY_LOCATION);
    setMessage("");
  }

  function startEdit(location) {
    setEditing(location.id);
    setForm({
      label: location.label,
      streetAddress: location.streetAddress,
      city: location.city,
      state: location.state,
      postalCode: location.postalCode,
      country: location.country,
    });
    setMessage("");
  }

  function change(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
    setMessage("");
  }

  async function save(event) {
    event.preventDefault();
    setBusy("save");
    setMessage("");
    try {
      const isNew = editing === "new";
      const response = await fetch("/api/admin/pickup-locations", {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isNew ? form : { ...form, id: editing }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not save this pickup location.");
      onChanged(data.locations || []);
      setEditing(null);
      setForm(EMPTY_LOCATION);
      setMessage("Pickup locations updated.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy("");
    }
  }

  async function remove(location) {
    if (!window.confirm(`Delete “${location.label}”? Existing orders will keep the address already saved on them.`)) return;
    setBusy(`delete:${location.id}`);
    setMessage("");
    try {
      const response = await fetch("/api/admin/pickup-locations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: location.id }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not delete this pickup location.");
      onChanged(data.locations || []);
      setMessage("Pickup location deleted.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="crm-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && !busy && onClose()}>
      <section className="crm-location-modal" role="dialog" aria-modal="true" aria-labelledby="pickup-location-title">
        <header>
          <div>
            <span>Pickup settings</span>
            <h2 id="pickup-location-title">Saved pickup locations</h2>
            <p>Choose from these addresses when confirming an order. Customers receive a Google Maps link in their email.</p>
          </div>
          <button type="button" className="crm-modal-close" onClick={onClose} aria-label="Close pickup locations">×</button>
        </header>

        {editing ? (
          <form className="crm-location-form" onSubmit={save}>
            <div className="crm-location-form-heading">
              <div><span>{editing === "new" ? "New location" : "Edit location"}</span><h3>Complete address</h3></div>
              <button type="button" onClick={() => setEditing(null)}>Cancel</button>
            </div>
            <label className="crm-field crm-field-wide"><span>Location name</span><input autoFocus required maxLength={80} value={form.label} onChange={(event) => change("label", event.target.value)} placeholder="For example: West Ave" /></label>
            <label className="crm-field crm-field-wide"><span>Street address</span><input required maxLength={200} value={form.streetAddress} onChange={(event) => change("streetAddress", event.target.value)} placeholder="Street number and name" /></label>
            <div className="crm-location-form-grid">
              <label className="crm-field"><span>City</span><input required maxLength={100} value={form.city} onChange={(event) => change("city", event.target.value)} /></label>
              <label className="crm-field"><span>State</span><input required maxLength={100} value={form.state} onChange={(event) => change("state", event.target.value)} /></label>
              <label className="crm-field"><span>ZIP code</span><input required inputMode="numeric" maxLength={20} value={form.postalCode} onChange={(event) => change("postalCode", event.target.value)} placeholder="78216" /></label>
              <label className="crm-field"><span>Country</span><input required maxLength={100} value={form.country} onChange={(event) => change("country", event.target.value)} /></label>
            </div>
            <div className="crm-location-form-actions">
              <button className="btn btn-pink btn-sm" type="submit" disabled={busy === "save"}>{busy === "save" ? "Saving…" : "Save pickup location"}</button>
            </div>
          </form>
        ) : (
          <div className="crm-location-list">
            {locations.map((location) => (
              <article key={location.id}>
                <div>
                  <span>{location.label}</span>
                  <h3>{location.streetAddress}</h3>
                  <p>{location.city}, {location.state} {location.postalCode} · {location.country}</p>
                  <a href={googleMapsUrl(location.formattedAddress)} target="_blank" rel="noreferrer">Open in Google Maps ↗</a>
                </div>
                <div className="crm-location-row-actions">
                  <button type="button" onClick={() => startEdit(location)} disabled={Boolean(busy)}>Edit</button>
                  <button type="button" className="is-danger" onClick={() => remove(location)} disabled={Boolean(busy) || locations.length <= 1} title={locations.length <= 1 ? "Keep at least one pickup location" : undefined}>
                    {busy === `delete:${location.id}` ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </article>
            ))}
            {!locations.length ? <p className="crm-location-empty">No pickup locations are available yet.</p> : null}
            <button type="button" className="crm-add-location" onClick={startAdd}>+ Add pickup location</button>
          </div>
        )}

        {message ? <p className="crm-location-message" role="status">{message}</p> : null}
      </section>
    </div>
  );
}
