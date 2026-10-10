"use client";
import { useRef, useState } from "react";
import Image from "next/image";
export default function EventPhotoPicker({ value, onChange, onBusy, onError }) {
  const input = useRef(null), [busy, setBusy] = useState(false);
  async function upload(event) {
    const file = event.target.files?.[0]; if (!file) return;
    setBusy(true); onBusy?.(true);
    try {
      const body = new FormData(); body.append("photo", file);
      const response = await fetch("/api/admin/menu/photo", { method: "POST", body });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "Upload failed.");
      onChange(data.url);
    } catch (err) { onError(err.message); }
    finally { setBusy(false); onBusy?.(false); event.target.value = ""; }
  }
  return <div className="event-photo-picker">{value && <div className="event-photo-thumb"><Image src={value} alt="Selected event photo" fill sizes="220px"/></div>}<input ref={input} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={upload}/><button type="button" className="admin-btn admin-btn-secondary" disabled={busy} onClick={() => input.current.click()}>{busy ? "Uploading…" : value ? "Change photo" : "Upload a photo"}</button>{value && <button type="button" className="admin-btn admin-btn-ghost" disabled={busy} onClick={() => onChange("")}>Remove photo</button>}<small>JPG, PNG or WebP · up to 5 MB</small></div>;
}
