import Image from "next/image";
import NewsletterForm from "@/components/NewsletterForm";
import EventCalendarRefresh from "@/components/EventCalendarRefresh";
import { getPublicEvents } from "@/lib/events-data";
import { eventDateLabel, eventTimeLabel, isUpcomingEvent } from "@/lib/events";
import "./events.css";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Local events | Bon Bon's Sweets & More",
  description: "Find Bon Bon's handmade treats at local events around San Antonio. Sign up for email updates about where we'll be next.",
};

function EventIcon({ name }) {
  const paths = {
    calendar: <><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M16 3v4M8 3v4M3 11h18M8 15h2M14 15h2"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    location: <><path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m3 7 9 6 9-6"/></>,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function EventCard({ event }) {
  return (
    <article className={`local-event-card ${event.status === "cancelled" ? "is-cancelled" : ""}`} id={`event-${event.id}`}>
      {event.image ? (
        <div className="local-event-photo">
          <Image src={event.image} alt={`${event.title} flyer`} fill quality={90} sizes="(max-width: 760px) 95vw, (max-width: 1280px) 45vw, 550px"/>
        </div>
      ) : (
        <div className="local-event-photo is-placeholder">
          <span aria-hidden="true">♡</span>
          <p>Handmade treats.<br/><em>Happy local moments.</em></p>
        </div>
      )}
      <div className="local-event-body">
        <div className="local-event-badges">
          <span className="local-event-date"><EventIcon name="calendar"/>{eventDateLabel(event)}</span>
          {event.status === "cancelled" && <b className="local-event-cancelled">Cancelled</b>}
        </div>
        <h2>{event.title}</h2>
        <dl className="local-event-details">
          <div>
            <dt><EventIcon name="clock"/>When</dt>
            <dd>{eventTimeLabel(event)}</dd>
          </div>
          <div>
            <dt><EventIcon name="location"/>Where</dt>
            <dd><strong>{event.venue}</strong><span>{event.address}</span></dd>
          </div>
        </dl>
        {event.description && <p className="local-event-description">{event.description}</p>}
        <div className="local-event-links">
          <a className="local-event-directions" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${event.venue} ${event.address}`)}`} target="_blank" rel="noopener noreferrer">Get directions <span aria-hidden="true">↗</span></a>
          {event.link && <a className="local-event-website" href={event.link} target="_blank" rel="noopener noreferrer">Event website <span aria-hidden="true">↗</span></a>}
        </div>
      </div>
    </article>
  );
}

export default async function EventsPage() {
  let events = [], error = "";
  try {
    events = await getPublicEvents();
  } catch {
    error = "Our event calendar is temporarily unavailable. Please check back shortly.";
  }
  const upcoming = events.filter(event => isUpcomingEvent(event));

  return (
    <div className="local-events-page wrap">
      <EventCalendarRefresh endsAt={upcoming.map(event => event.endsAt).filter(Boolean).sort()[0] || ""}/>
      <header className="local-events-hero">
        <div>
          <span className="local-events-eyebrow"><EventIcon name="location"/>Around San Antonio</span>
          <h1>Sweet treats.<br/><em>Local meetups.</em></h1>
        </div>
        <div className="local-events-intro">
          <p>Come say hello, pick up something sweet, and find us at the events we love being part of.</p>
          <a href="#event-updates" className="local-events-update-link">Get event updates <span aria-hidden="true">↗</span></a>
        </div>
      </header>

      <section aria-labelledby="upcoming-events">
        <div className="local-events-heading">
          <h2 id="upcoming-events">Where we&apos;ll be next</h2>
          <span>{upcoming.length} upcoming {upcoming.length === 1 ? "event" : "events"}</span>
        </div>
        {error ? (
          <p className="local-events-empty" role="status">{error}</p>
        ) : upcoming.length ? (
          <div className="local-events-grid">{upcoming.map(event => <EventCard key={event.id} event={event}/>)}</div>
        ) : (
          <div className="local-events-empty">
            <span aria-hidden="true">♡</span>
            <h3>More sweet stops are on the way.</h3>
            <p>We&apos;re planning our next local appearances. Join the list below and we&apos;ll let you know when they&apos;re announced.</p>
          </div>
        )}
      </section>

      <section className="local-events-signup" id="event-updates" aria-labelledby="event-updates-heading">
        <div>
          <span className="local-events-eyebrow"><EventIcon name="mail"/>Let&apos;s stay in touch</span>
          <h2 id="event-updates-heading">A little sweetness<br/><em>in your inbox.</em></h2>
          <p>Get the details about the local events we&apos;re attending. Confirm your email after signing up, and unsubscribe whenever you like.</p>
        </div>
        <NewsletterForm source="events"/>
      </section>
    </div>
  );
}
