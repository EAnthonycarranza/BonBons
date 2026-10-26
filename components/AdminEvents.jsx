"use client";
import AdminSelect from "./AdminSelect";
import AdminEditorSection, { AdminEditorNav, revealInvalidEditorField } from "./AdminEditorSection";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import AdminIcon from "./AdminIcon";
import EventPhotoPicker from "./EventPhotoPicker";
import EventEmailStudio from "./EventEmailStudio";
import EventSubscribers from "./EventSubscribers";
import { eventDateLabel, eventTimeLabel, isUpcomingEvent } from "@/lib/events";
import "./coupons.css";
import "./events-admin.css";
import { eventRequest } from "@/lib/event-request";
const EMPTY_EVENT = { title: "", description: "", venue: "", address: "", date: "", endDate: "", startTime: "", endTime: "", link: "", image: "", status: "draft" };
export function EventPager({ page, total, size = 12, onChange }) {
  const pages = Math.max(1, Math.ceil(total / size));
  return <div className="coupon-pager"><span>{total ? `${(page - 1) * size + 1}–${Math.min(total, page * size)} of ${total}` : "0 results"}</span><div><button className="admin-btn admin-btn-secondary" disabled={page <= 1} onClick={() => onChange(page - 1)}>Previous</button><span>{page} / {pages}</span><button className="admin-btn admin-btn-secondary" disabled={page >= pages} onClick={() => onChange(page + 1)}>Next</button></div></div>;
}
export default function AdminEvents() {
  const [view, setView] = useState("events"), [events, setEvents] = useState([]), [subscribers, setSubscribers] = useState([]), [campaigns, setCampaigns] = useState([]);
  const [configured, setConfigured] = useState(false), [loading, setLoading] = useState(true), [error, setError] = useState(""), [notice, setNotice] = useState("");
  const [form, setForm] = useState(null), [saving, setSaving] = useState(false), [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState(""), [filter, setFilter] = useState("upcoming"), [page, setPage] = useState(1);
  async function load() {
    setError("");
    try {
      const [calendar, audience, emails] = await Promise.all([eventRequest("/api/admin/events"), eventRequest("/api/admin/events/subscribers"), eventRequest("/api/admin/events/emails")]);
      setEvents(calendar.events); setSubscribers(audience.subscribers); setCampaigns(emails.campaigns); setConfigured(emails.emailConfigured);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);
  useEffect(() => {
    let disposed = false;
    const timer = setInterval(async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const calendar = await eventRequest("/api/admin/events");
        if (!disposed) setEvents(calendar.events);
      } catch { /* The next refresh will retry; edited form values stay intact. */ }
    }, 60000);
    return () => { disposed = true; clearInterval(timer); };
  }, []);
  const active = subscribers.filter(s => s.status === "active" && s.event_opt_in && s.confirmed_at).length;
  const shown = events.filter(e => `${e.title} ${e.venue} ${e.address}`.toLowerCase().includes(search.toLowerCase()) && (filter === "all" || filter === "upcoming" ? (filter === "all" || (e.status === "published" && isUpcomingEvent(e))) : e.status === filter));
  function field(key, value) { setForm(current => ({ ...current, [key]: value })); }
  async function save(event) {
    event.preventDefault(); if (saving || uploading) return; setSaving(true); setError("");
    try {
      const result = await eventRequest("/api/admin/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      setForm(null); setNotice(result.event.status === "published" ? "Event published. It is now on the public calendar." : "Event saved."); setFilter("all"); setPage(1); await load();
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  }
  return <section><div className="admin-page-heading"><div><span className="admin-eyebrow">OUT IN THE COMMUNITY</span><h1>Events & email updates</h1><p>Share where you&apos;ll be, and keep your subscribers in the loop.</p></div><Link href="/events" target="_blank" className="admin-btn admin-btn-secondary">View public calendar<AdminIcon name="external"/></Link></div><div className="coupon-summary"><div><b>{events.filter(e => e.status === "published" && isUpcomingEvent(e)).length}</b><span>Upcoming events</span></div><div><b>{active}</b><span>Confirmed subscribers</span></div><div><b>{campaigns.filter(c => c.status === "draft").length}</b><span>Email drafts</span></div></div><div className="desk-tabs" role="tablist" aria-label="Events workspace">{[["events", "Events"], ["emails", "Email studio"], ["subscribers", "Subscribers"]].map(([id, label]) => <button key={id} role="tab" aria-selected={view === id} onClick={() => { setView(id); setNotice(""); }}>{label}</button>)}</div>{error && <p className="admin-alert is-error" role="alert">{error}</p>}{notice && <p className="admin-alert" role="status">{notice}</p>}{loading ? <p>Loading events…</p> : <>
    {view === "events" && <>{form ? <form className="admin-panel event-editor" onSubmit={save} onInvalidCapture={revealInvalidEditorField}><div className="event-editor-heading"><h2>{form.id ? "Edit event" : "New local event"}</h2><button type="button" className="admin-btn admin-btn-ghost" disabled={saving || uploading} onClick={() => setForm(null)}>Close</button></div><AdminEditorNav sections={[["event-details","Details"],["schedule","Date & time"],["venue","Location"],["visibility","Visibility"],["photo","Photo"]]}/><AdminEditorSection id="event-details" title="Event details" summary="Name & what customers should know" defaultOpen><div className="event-fields"><label className="is-wide">Event title<input required maxLength={120} value={form.title} onChange={e => field("title", e.target.value)} placeholder="A name customers will recognize"/></label><label className="is-wide">What should customers know?<textarea rows={5} maxLength={4000} value={form.description} onChange={e => field("description", e.target.value)} placeholder="What you're bringing, where to find your booth, and anything else to know."/></label></div></AdminEditorSection><AdminEditorSection id="schedule" title="Date & time" summary="San Antonio time · finished events archive automatically" icon="orders"><div className="event-fields"><label>Start date<input type="date" required value={form.date} onChange={e => field("date", e.target.value)}/></label><label>End date <small>(optional for one day)</small><input type="date" min={form.date} value={form.endDate} onChange={e => field("endDate", e.target.value)}/></label><label>Starts at<input type="time" value={form.startTime} onChange={e => field("startTime", e.target.value)}/></label><label>Ends at<input type="time" value={form.endTime} onChange={e => field("endTime", e.target.value)}/></label></div></AdminEditorSection><AdminEditorSection id="venue" title="Where to find you" summary="Venue, address & event website" icon="pin"><div className="event-fields"><label>Venue<input required maxLength={160} value={form.venue} onChange={e => field("venue", e.target.value)}/></label><label>Address<input required maxLength={300} value={form.address} onChange={e => field("address", e.target.value)}/></label><label>Event website <small>(optional)</small><input type="url" value={form.link} onChange={e => field("link", e.target.value)} placeholder="https://…"/></label></div></AdminEditorSection><AdminEditorSection id="visibility" title="Publishing & archiving" summary={form.status === "published" ? "Public calendar" : "Current status: " + form.status} icon="eye"><div className="event-fields"><label>Visibility<AdminSelect value={form.status} onChange={e => field("status", e.target.value)}><option value="draft">Draft — only admins</option><option value="published">Published — public calendar</option><option value="cancelled">Cancelled — public notice</option><option value="archived">Archived — only admins</option></AdminSelect></label></div><p className="event-help">Dates and times use San Antonio time. Published and cancelled events move to Archived after their end time, or at midnight after the end date if no end time is entered. Email updates are reviewed and sent from Email studio.</p></AdminEditorSection><AdminEditorSection id="photo" title="Event artwork" summary={form.image ? "Flyer added · view or replace" : "Optional · upload the full flyer"} icon="photo"><EventPhotoPicker value={form.image} onChange={value => field("image", value)} onBusy={setUploading} onError={setError}/></AdminEditorSection><div className="event-editor-footer"><button type="button" className="admin-btn admin-btn-secondary" disabled={saving || uploading} onClick={() => setForm(null)}>Cancel</button><button className="admin-btn admin-btn-primary" disabled={saving || uploading}>{saving ? "Saving…" : form.status === "published" ? "Save & publish event" : "Save event"}</button></div></form> : <><div className="event-list-toolbar"><div className="coupon-filters"><label className="event-search">Search events<input type="search" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Event name or venue"/></label><label>Show<AdminSelect value={filter} onChange={e => { setFilter(e.target.value); setPage(1); }}>{[["upcoming", "Upcoming"], ["draft", "Drafts"], ["cancelled", "Cancelled"], ["archived", "Archived"], ["all", "All events"]].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</AdminSelect></label></div><button className="admin-btn admin-btn-primary" onClick={() => { setForm({ ...EMPTY_EVENT }); setError(""); setNotice(""); }}><AdminIcon name="plus"/>New event</button></div><p className="event-help">Finished events move to Archived automatically. Their details and images stay available in your workspace.</p>{shown.length ? <div className="admin-events-grid">{shown.slice((page - 1) * 12, page * 12).map(event => <article key={event.id} className="admin-event-card">{event.image && <a className="admin-event-artwork" href={event.image} target="_blank" rel="noopener noreferrer" aria-label={`View full image for ${event.title}`}><Image src={event.image} alt={`${event.title} flyer`} fill sizes="(max-width: 700px) 90vw, 40vw"/><span>View full image ↗</span></a>}<div className="event-card-meta"><span className={`event-status is-${event.status}`}>{event.status}</span><span className="event-card-date">{eventDateLabel(event)}</span></div><h2>{event.title}</h2><p><AdminIcon name="pin"/>{event.venue}</p><small>{eventTimeLabel(event)}</small><div className="event-card-actions"><button className="admin-btn admin-btn-secondary" onClick={() => { setForm(event); setError(""); setNotice(""); }}><AdminIcon name="edit"/>Edit event</button>{["published", "cancelled"].includes(event.status) && <Link className="admin-btn admin-btn-ghost" href={`/events#event-${event.id}`} target="_blank">View<AdminIcon name="external"/></Link>}</div></article>)}</div> : <div className="event-empty"><AdminIcon name="pin"/><h2>{events.length ? "No events match this view." : "Your next sweet stop starts here."}</h2><p>Create a local event, publish it to your calendar, then design an email to spread the word.</p></div>}<EventPager page={page} total={shown.length} onChange={setPage}/></>}</>}
    {view === "emails" && <EventEmailStudio events={events} campaigns={campaigns} activeSubscribers={active} emailConfigured={configured} onRefresh={load}/>}
    {view === "subscribers" && <EventSubscribers subscribers={subscribers} onRefresh={load}/>}
    </>}</section>;
}
