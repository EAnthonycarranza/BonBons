import Image from "next/image";
import NewsletterForm from "@/components/NewsletterForm";
import EventCalendarRefresh from "@/components/EventCalendarRefresh";
import { getPublicEvents } from "@/lib/events-data";
import { eventDateLabel, eventTimeLabel, isUpcomingEvent } from "@/lib/events";
import "./events.css";
export const dynamic = "force-dynamic";
export const metadata = { title: "Local events | Bon Bon's Sweets & More", description: "Find Bon Bon's handmade treats at local events around San Antonio. Sign up for email updates about where we'll be next." };
function EventCard({ event }) {
  return <article className={`local-event-card ${event.status === "cancelled" ? "is-cancelled" : ""}`} id={`event-${event.id}`}>
    {event.image ? <a className="local-event-photo" href={event.image} target="_blank" rel="noopener noreferrer" aria-label={`View full image for ${event.title}`}><Image src={event.image} alt={`${event.title} flyer`} fill quality={90} sizes="(max-width: 700px) 95vw, 45vw"/><span className="event-image-link">View full image ↗</span></a> : <div className="local-event-photo is-placeholder"><span>Handmade treats.<br/><em>Happy local moments.</em></span></div>}
    <div className="local-event-body"><span className="local-event-date">{eventDateLabel(event)}</span>{event.status === "cancelled" && <b className="local-event-cancelled">Cancelled</b>}<h2>{event.title}</h2><p className="local-event-time">{eventTimeLabel(event)}</p><h3>{event.venue}</h3><p>{event.address}</p>{event.description && <p className="local-event-description">{event.description}</p>}<div className="local-event-links"><a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${event.venue} ${event.address}`)}`} target="_blank" rel="noopener noreferrer">Get directions ↗</a>{event.link && <a href={event.link} target="_blank" rel="noopener noreferrer">Event website ↗</a>}</div></div>
  </article>;
}
export default async function EventsPage() {
  let events = [], error = "";
  try { events = await getPublicEvents(); } catch { error = "Our event calendar is temporarily unavailable. Please check back shortly."; }
  const upcoming = events.filter(event => isUpcomingEvent(event));
  return <div className="local-events-page wrap"><EventCalendarRefresh endsAt={upcoming.map(event => event.endsAt).filter(Boolean).sort()[0] || ""}/><header className="local-events-hero"><span className="eyebrow">Around San Antonio</span><h1>Sweet treats.<br/><em>Local meetups.</em></h1><p>Come say hello, pick up something sweet, and find us at the events we love being part of.</p><a href="#event-updates" className="btn btn-pink">Tell me where you&apos;ll be</a></header><section aria-labelledby="upcoming-events"><div className="local-events-heading"><h2 id="upcoming-events">Where we&apos;ll be next</h2><span>{upcoming.length} upcoming {upcoming.length === 1 ? "event" : "events"}</span></div>{error ? <p role="status">{error}</p> : upcoming.length ? <div className="local-events-grid">{upcoming.map(event => <EventCard key={event.id} event={event}/>)}</div> : <div className="local-events-empty"><span>♡</span><h3>More sweet stops are on the way.</h3><p>We&apos;re planning our next local appearances. Join the list below and we&apos;ll let you know when they&apos;re announced.</p></div>}</section><section className="local-events-signup" id="event-updates"><div><span className="eyebrow">Let&apos;s stay in touch</span><h2>A little sweetness<br/><em>in your inbox.</em></h2><p>Get the details about the local events we&apos;re attending. Confirm your email after signing up, and unsubscribe whenever you like.</p></div><NewsletterForm source="events"/></section></div>;
}
