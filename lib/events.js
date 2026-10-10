import { parseDateValue, formatDateValue, formatTimeValue } from "./date-values.js";

export const EVENT_STATUSES = ["draft", "published", "cancelled", "archived"];
export const DEFAULT_EVENT_EMAIL = { subject: "Find Bon Bon's at our next local event", preheader: "Sweet treats, local events, and a little something to look forward to.", headline: "Come say hello!", message: "We're bringing your favorite handmade treats to the neighborhood. Here's where you can find Bon Bon's next.", signoff: "With love, Bonnie & the Bon Bon's team", accent: "#d83f86", layout: "spotlight", buttonLabel: "See our events", image: "", eventIds: [] };
function text(value, label, max, required = false) {
  const result = String(value ?? "").trim();
  if ((required && !result) || result.length > max) throw new Error(`${label} ${required ? "is required and " : ""}must be ${max} characters or fewer.`);
  return result;
}
export function safeEventImage(value) {
  if (!value) return "";
  const url = String(value);
  if (/^\/photos\/[A-Za-z0-9_./-]+\.(png|jpe?g|webp)$/.test(url) && !url.split("/").some(part => part === "." || part === "..")) return url;
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" || parsed.hostname !== "slerrjoiowaskmvgykxt.supabase.co" || !parsed.pathname.startsWith("/storage/v1/object/public/menu-photos/") || parsed.username || parsed.password) throw new Error("Upload a photo using the image picker.");
  return parsed.href;
}
export function validateEvent(input = {}) {
  const date = text(input.date, "Event date", 10, true), endDate = text(input.endDate || input.date, "End date", 10, true);
  if (!parseDateValue(date) || !parseDateValue(endDate) || endDate < date) throw new Error("Choose valid event dates, with the end on or after the start.");
  const startTime = text(input.startTime, "Start time", 5), endTime = text(input.endTime, "End time", 5);
  for (const time of [startTime, endTime]) if (time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error("Choose a valid event time.");
  if (date === endDate && startTime && endTime && endTime <= startTime) throw new Error("The end time must be after the start time.");
  const status = input.status || "draft";
  if (!EVENT_STATUSES.includes(status)) throw new Error("Choose draft, published, cancelled, or archived.");
  let link = text(input.link, "Event link", 1000);
  if (link) { const url = new URL(link); if (url.protocol !== "https:" || url.username || url.password) throw new Error("Use an https event link."); link = url.href; }
  return { title: text(input.title, "Event title", 120, true), description: text(input.description, "Description", 4000), venue: text(input.venue, "Venue", 160, true), address: text(input.address, "Address", 300, true), date, endDate, startTime, endTime, link, image: safeEventImage(input.image), status };
}
export function toEvent(row) {
  return { id: String(row.id), title: row.title, description: row.description, venue: row.venue, address: row.address, date: row.event_date, endDate: row.end_date, startTime: (row.start_time || "").slice(0, 5), endTime: (row.end_time || "").slice(0, 5), image: row.image || "", link: row.event_link || "", status: row.status, createdAt: row.created_at, updatedAt: row.updated_at };
}
export function eventToRow(event) { return { title: event.title, description: event.description, venue: event.venue, address: event.address, event_date: event.date, end_date: event.endDate, start_time: event.startTime || null, end_time: event.endTime || null, image: event.image, event_link: event.link, status: event.status }; }
export function eventDateLabel(event) { return formatDateValue(event.date) + (event.endDate && event.endDate !== event.date ? ` – ${formatDateValue(event.endDate)}` : ""); }
export function eventTimeLabel(event) { return event.startTime ? `${formatTimeValue(event.startTime)}${event.endTime ? ` – ${formatTimeValue(event.endTime)}` : ""} · San Antonio time` : "Time to be announced"; }
export function texasToday() { return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago" }).format(new Date()); }
export function isUpcomingEvent(event, today = texasToday()) { return (event.endDate || event.date) >= today; }
export function validateEventEmail(input = {}) {
  const result = {};
  for (const [key, max] of Object.entries({ subject: 150, preheader: 180, headline: 160, message: 6000, signoff: 200, buttonLabel: 60 })) result[key] = text(input[key], key, max, ["subject", "headline", "buttonLabel"].includes(key));
  if (/[\r\n]/.test(result.subject)) throw new Error("Keep the subject on one line.");
  result.accent = String(input.accent || "#d83f86"); if (!/^#[0-9a-f]{6}$/i.test(result.accent)) throw new Error("Choose a valid accent color.");
  result.layout = input.layout || "spotlight"; if (!["spotlight", "digest", "brief"].includes(result.layout)) throw new Error("Choose an email layout.");
  result.image = safeEventImage(input.image);
  if (!Array.isArray(input.eventIds) || input.eventIds.length > 12 || !input.eventIds.every(id => /^\d+$/.test(String(id)))) throw new Error("Choose up to 12 events.");
  result.eventIds = [...new Set(input.eventIds.map(String))];
  return result;
}
