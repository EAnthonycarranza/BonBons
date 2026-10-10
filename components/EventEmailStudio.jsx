"use client";
import { useEffect, useState } from "react";
import { DEFAULT_EVENT_EMAIL, eventDateLabel } from "@/lib/events";
import { eventRequest } from "@/lib/event-request";
import EventPhotoPicker from "./EventPhotoPicker";
import ConfirmDialog from "./ConfirmDialog";
import AdminIcon from "./AdminIcon";
export default function EventEmailStudio({ events, campaigns, activeSubscribers, emailConfigured, onRefresh }) {
  const [id, setId] = useState(""), [design, setDesign] = useState({ ...DEFAULT_EVENT_EMAIL, eventIds: [] }), [saved, setSaved] = useState("");
  const [html, setHtml] = useState(""), [previewError, setPreviewError] = useState(""), [previewing, setPreviewing] = useState(false), [mobile, setMobile] = useState(false);
  const [error, setError] = useState(""), [notice, setNotice] = useState(""), [saving, setSaving] = useState(false), [uploading, setUploading] = useState(false), [sending, setSending] = useState(false), [confirm, setConfirm] = useState("");
  const [progress, setProgress] = useState(null);
  const campaign = campaigns.find(c => String(c.id) === id), editable = !campaign || campaign.status === "draft";
  const dirty = !id || JSON.stringify(design) !== saved;
  const availableEvents = events.filter(e => ["published", "cancelled"].includes(e.status));
  useEffect(() => {
    if (!editable) return;
    let disposed = false;
    setPreviewing(true); setPreviewError("");
    const timer = window.setTimeout(async () => {
      try {
        const data = await eventRequest("/api/admin/events/emails/preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ design }) });
        if (!disposed) { setHtml(data.html); setPreviewError(""); }
      } catch (err) { if (!disposed) { setPreviewError(err.message); setHtml(""); } }
      finally { if (!disposed) setPreviewing(false); }
    }, 450);
    return () => { window.clearTimeout(timer); disposed = true; };
  }, [design, editable]);
  useEffect(() => {
    setProgress(null);
    if (id && !editable) eventRequest(`/api/admin/events/emails/${id}/send`).then(data => setProgress(data.progress)).catch(err => setError(err.message));
  }, [id, editable]);
  function field(key, value) { setDesign(current => ({ ...current, [key]: value })); setNotice(""); }
  function choose(value) {
    const next = campaigns.find(c => String(c.id) === value);
    setId(value); setDesign(next ? next.design : { ...DEFAULT_EVENT_EMAIL, eventIds: [] }); setSaved(next ? JSON.stringify(next.design) : ""); setError(""); setNotice(""); setProgress(null);
  }
  async function save() {
    setSaving(true); setError(""); setNotice("");
    try {
      const data = await eventRequest("/api/admin/events/emails", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: id || null, design }) });
      setId(String(data.campaign.id)); setDesign(data.campaign.design); setSaved(JSON.stringify(data.campaign.design)); setNotice("Email draft saved."); await onRefresh();
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  }
  async function send(action) {
    if (sending) return; setSending(true); setConfirm(""); setError(""); setNotice("");
    try {
      let next = action;
      while (true) {
        const data = await eventRequest(`/api/admin/events/emails/${id}/send`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: next, reviewed: action === "retry" }) });
        setProgress(data.progress);
        if (!data.progress.queued) break;
        next = "process";
      }
      setNotice("Send progress saved. Review the delivery counts below.");
    } catch (err) { setError(`${err.message} Sending has stopped. Refresh progress before continuing; completed deliveries are kept.`); }
    finally { await onRefresh(); setSending(false); }
  }
  async function refreshProgress() { try { const data = await eventRequest(`/api/admin/events/emails/${id}/send`); setProgress(data.progress); await onRefresh(); } catch (err) { setError(err.message); } }
  function duplicate() { setId(""); setSaved(""); setProgress(null); setNotice("Copied to a new draft. Review the selected events before sending."); setDesign(current => ({ ...current, eventIds: current.eventIds.filter(eventId => availableEvents.some(e => e.id === String(eventId))) })); }
  return <div className="email-studio"><div className="event-section-heading"><div><h2>Email studio</h2><p>Design an update, preview it, and send it to your confirmed event subscribers.</p></div><button className="admin-btn admin-btn-secondary" disabled={sending || saving} onClick={() => choose("")}><AdminIcon name="plus"/>New email</button></div><div className="email-draft-bar"><label>Saved emails<select aria-label="Saved emails" value={id} disabled={sending || saving} onChange={e => choose(e.target.value)}><option value="">New draft</option>{campaigns.map(c => <option key={c.id} value={String(c.id)}>{c.design.subject} · {c.status}</option>)}</select></label><span><b>{activeSubscribers}</b> confirmed {activeSubscribers === 1 ? "subscriber" : "subscribers"}</span></div>{!emailConfigured && <p className="admin-alert is-error">Connect Gmail in Shop settings to send email updates.</p>}{error && <p className="admin-alert is-error" role="alert">{error}</p>}{notice && <p className="admin-alert" role="status">{notice}</p>}
    {!editable ? <div className="admin-panel email-delivery-panel"><span className="event-status">{campaign.status}</span><h3>{campaign.design.subject}</h3><p>This email&apos;s content and audience were saved when sending began.</p>{progress && <div className="email-delivery-counts">{[["sent", "Sent"], ["queued", "Queued"], ["sending", "In progress"], ["failed", "Failed"], ["skipped", "Unsubscribed / skipped"]].map(([key, label]) => <div key={key}><b>{progress[key] || 0}</b><span>{label}</span></div>)}</div>}<div className="event-card-actions"><button className="admin-btn admin-btn-secondary" disabled={sending} onClick={refreshProgress}>Refresh progress</button>{progress?.queued > 0 && <button className="admin-btn admin-btn-primary" disabled={sending} onClick={() => send("process")}>{sending ? "Sending…" : "Continue queued emails"}</button>}{(progress?.failed > 0 || progress?.stalled > 0) && <button className="admin-btn admin-btn-secondary" disabled={sending} onClick={() => setConfirm("retry")}>Review & retry</button>}<button className="admin-btn admin-btn-secondary" disabled={sending} onClick={duplicate}>Duplicate as new draft</button></div></div> : <div className="email-studio-grid"><div className="admin-panel email-design-panel"><div className="event-fields"><label className="is-wide">Subject<input maxLength={150} value={design.subject} onChange={e => field("subject", e.target.value)}/></label><label className="is-wide">Inbox preview text<input maxLength={180} value={design.preheader} onChange={e => field("preheader", e.target.value)}/></label><label>Layout<select value={design.layout} onChange={e => field("layout", e.target.value)}><option value="spotlight">Event spotlight</option><option value="digest">Event digest</option><option value="brief">Simple announcement</option></select></label><label>Accent color<input type="color" value={design.accent} onChange={e => field("accent", e.target.value)}/></label><label className="is-wide">Headline<input maxLength={160} value={design.headline} onChange={e => field("headline", e.target.value)}/></label><label className="is-wide">Your message<textarea rows={6} maxLength={6000} value={design.message} onChange={e => field("message", e.target.value)}/></label><label className="is-wide">Sign-off<input maxLength={200} value={design.signoff} onChange={e => field("signoff", e.target.value)}/></label><label className="is-wide">Button label<input maxLength={60} value={design.buttonLabel} onChange={e => field("buttonLabel", e.target.value)}/></label></div><fieldset className="email-events-picker"><legend>Events in this email <span>up to 12</span></legend>{availableEvents.length ? availableEvents.map(event => <label key={event.id}><input type="checkbox" checked={design.eventIds.includes(event.id)} disabled={!design.eventIds.includes(event.id) && design.eventIds.length >= 12} onChange={e => field("eventIds", e.target.checked ? [...design.eventIds, event.id] : design.eventIds.filter(value => value !== event.id))}/><span><b>{event.title}</b><small>{eventDateLabel(event)} · {event.status}</small></span></label>) : <p>Publish an event to include it in an email.</p>}</fieldset>{design.eventIds.filter(eventId => !availableEvents.some(event => event.id === eventId)).map(eventId => <label className="email-unavailable-event" key={eventId}><input type="checkbox" checked onChange={() => field("eventIds", design.eventIds.filter(value => value !== eventId))}/><span>{events.find(event => event.id === eventId)?.title || "Event no longer available"}<small>Uncheck to remove this unpublished event from the draft.</small></span></label>)}<h3 className="event-photo-label">Cover photo <small>(optional)</small></h3><EventPhotoPicker value={design.image} onChange={value => field("image", value)} onBusy={setUploading} onError={setError}/><p className="event-help">Photos appear in spotlight and digest layouts. Without a cover photo, each event uses its own photo.</p><div className="email-save-actions"><button className="admin-btn admin-btn-secondary" disabled={saving || uploading || sending} onClick={save}>{saving ? "Saving…" : "Save draft"}</button><button className="admin-btn admin-btn-primary" disabled={dirty || !design.eventIds.length || !activeSubscribers || !emailConfigured || !!previewError || previewing || saving || uploading || sending} onClick={() => setConfirm("begin")}><AdminIcon name="mail"/>Review & send</button></div><p className="event-help">{dirty ? "Save your draft before sending." : !activeSubscribers ? "Sending becomes available when customers confirm their subscriptions." : "Each subscriber receives a separate email with an unsubscribe link."}</p></div><div className="email-preview-panel"><div className="email-preview-heading"><h3>Live preview</h3><div><button type="button" aria-pressed={!mobile} onClick={() => setMobile(false)}>Desktop</button><button type="button" aria-pressed={mobile} onClick={() => setMobile(true)}>Phone</button></div></div><p>{previewing ? "Updating preview…" : previewError || "This is how the email will look. Links open in the sent email."}</p>{html && <iframe title="Event email preview" sandbox="allow-same-origin" srcDoc={html} className={mobile ? "is-mobile" : ""}/>}</div></div>}
    <ConfirmDialog open={!!confirm} title={confirm === "retry" ? "Review before retrying" : "Send this event update?"} message={confirm === "retry" ? "Check Gmail's Sent folder for failed or stalled deliveries first. A message may have reached the recipient even if its confirmation was lost." : `${design.subject} — to ${activeSubscribers} confirmed subscribers.`} consequence={confirm === "retry" ? "Retrying can send a duplicate if the earlier message was accepted. Sent deliveries will never be retried." : "Your current draft and audience will be saved. Emails will start sending after you confirm."} confirmLabel={confirm === "retry" ? "I've checked Gmail — retry" : "Send update"} busy={sending} onCancel={() => setConfirm("")} onConfirm={() => send(confirm)}/>
  </div>;
}
