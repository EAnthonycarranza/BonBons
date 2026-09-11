"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ConfirmDialog from "./ConfirmDialog";
import OrderDataTools from "./OrderDataTools";
import { DatePicker, TimePicker } from "./DateTimePicker";
import { money } from "@/lib/format";
import { SITE } from "@/lib/sample-data";
import { ORDER_STATUSES, PAYMENT_STATUSES, QUOTE_STATUSES, pickupDateState } from "@/lib/order-tracking";
import { partySizeLabel } from "@/lib/cart-rental";
import PickupLocationManager, { PickupLocationPicker } from "@/components/PickupLocationManager";

const STAGE_FILTERS = [
  { value: "all", label: "All stages" },
  { value: "attention", label: "Needs attention" },
  { value: "confirmed", label: "Confirmed" },
  { value: "preparing", label: "Preparing" },
  { value: "ready", label: "Ready" },
  { value: "complete", label: "Complete" },
];

const ATTENTION_STATUSES = ["pending", "new", "contacted", "quoted"];
const CONFIRMED_STATUSES = ["confirmed", "booked"];
const COMPLETE_STATUSES = ["collected", "closed", "cancelled"];

function shortId(id) {
  return `REQ-${String(id || "").slice(-5).toUpperCase()}`;
}

function customerFor(record, kind) {
  return kind === "orders" ? record.customer || {} : record;
}

function requestedDate(record) {
  return record.pickupDate || record.wantedDate || record.eventDate || "";
}

function dateLabel(value, options = {}) {
  if (!value) return "Not scheduled";
  const parsed = String(value).includes("T") ? new Date(value) : new Date(`${value}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: options.year ? "numeric" : undefined,
  }).format(parsed);
}

function timeStamp(value) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed);
}

function stageLabel(status, kind) {
  const options = kind === "orders" ? ORDER_STATUSES : QUOTE_STATUSES;
  return options.find((option) => option.value === status)?.label || "New request";
}

function statusTone(status) {
  if (["ready", "collected", "closed"].includes(status)) return "mint";
  if (["confirmed", "booked", "preparing"].includes(status)) return "pink";
  if (status === "cancelled") return "muted";
  return "gold";
}

function stageMatches(status, filter) {
  if (filter === "all") return true;
  if (filter === "attention") return ATTENTION_STATUSES.includes(status);
  if (filter === "confirmed") return CONFIRMED_STATUSES.includes(status);
  if (filter === "complete") return COMPLETE_STATUSES.includes(status);
  return status === filter;
}

function amountLabel(record, kind) {
  const value = record.confirmedTotal ?? (kind === "orders" ? record.subtotal : null);
  return value === null || value === undefined ? "Price pending" : money(value);
}

function ContactLinks({ customer }) {
  return (
    <div className="crm-contact-actions">
      {customer.phone ? <a href={`tel:${customer.phone}`}>Call</a> : null}
      {customer.phone ? <a href={`sms:${customer.phone}`}>Text</a> : null}
      {customer.email ? <a href={`mailto:${customer.email}`}>Email</a> : null}
    </div>
  );
}

function Field({ label, children, wide = false, compact = false, hint }) {
  return (
    <label className={`crm-field${wide ? " crm-field-wide" : ""}${compact ? " crm-field-compact" : ""}`}>
      <span>{label}</span>
      {children}
      {hint ? <small>{hint}</small> : null}
    </label>
  );
}

function RequestSummary({ record, kind }) {
  if (kind === "orders") {
    return (
      <div className="crm-line-items">
        {record.items?.length ? record.items.map((item, index) => (
          <div className="crm-line-item" key={`${item.key || item.name}-${index}`}>
            <div>
              <b>{item.qty} × {item.name}</b>
              {item.description ? <small>{item.description}</small> : null}
            </div>
            <strong>{money(Number(item.price || 0) * Number(item.qty || 1))}</strong>
          </div>
        )) : <p className="crm-empty-note">No item details were included.</p>}
      </div>
    );
  }

  const details = [
    ["Event type", record.occasion],
    ["Party size", partySizeLabel(record.guests)],
    ["Theme or colors", record.colors],
    ["Cake-pop interests", record.interests?.join(", ")],
  ].filter(([, value]) => value);

  return (
    <dl className="crm-request-facts">
      {details.length ? details.map(([label, value]) => (
        <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
      )) : <p className="crm-empty-note">No custom details were included.</p>}
    </dl>
  );
}

function RecordWorkspace({ record, kind, emailState, pickupLocations, onManageLocations, onSaved, onDeleted }) {
  const statusOptions = kind === "orders" ? ORDER_STATUSES : QUOTE_STATUSES;
  const fallbackStatus = kind === "orders" ? "pending" : "new";
  const customer = customerFor(record, kind);
  const [form, setForm] = useState(() => ({
    status: record.status || fallbackStatus,
    paymentStatus: record.paymentStatus || "not_arranged",
    confirmedTotal: record.confirmedTotal ?? (kind === "orders" ? record.subtotal ?? "" : ""),
    pickupDate: record.pickupDate || record.wantedDate || record.eventDate || "",
    pickupTime: record.pickupTime ? String(record.pickupTime).slice(0, 5) : "",
    pickupLocation: record.pickupLocation || "",
    paymentInstructions: record.paymentInstructions || SITE.paymentInstructions,
    adminNotes: record.adminNotes || "",
  }));
  const [saveState, setSaveState] = useState("idle");
  const [notice, setNotice] = useState("");
  const [emailBusy, setEmailBusy] = useState("");
  const [pendingResend, setPendingResend] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [personalMessage, setPersonalMessage] = useState("");
  const [delayNotice, setDelayNotice] = useState(false);

  useEffect(() => {
    if (record.pickupLocation || form.pickupLocation || !pickupLocations.length) return;
    setForm((current) => ({ ...current, pickupLocation: pickupLocations[0].formattedAddress }));
  }, [form.pickupLocation, pickupLocations, record.pickupLocation]);

  const original = useMemo(() => ({
    status: record.status || fallbackStatus,
    paymentStatus: record.paymentStatus || "not_arranged",
    confirmedTotal: String(record.confirmedTotal ?? (kind === "orders" ? record.subtotal ?? "" : "")),
    pickupDate: record.pickupDate || record.wantedDate || record.eventDate || "",
    pickupTime: record.pickupTime ? String(record.pickupTime).slice(0, 5) : "",
    pickupLocation: record.pickupLocation || "",
    paymentInstructions: record.paymentInstructions || SITE.paymentInstructions,
    adminNotes: record.adminNotes || "",
  }), [fallbackStatus, kind, record]);

  const dirty = Object.keys(original).some((key) => String(form[key] ?? "") !== String(original[key] ?? ""));
  const confirmationStage = kind === "orders" ? "confirmed" : "booked";
  const willConfirm = form.status === confirmationStage && !record.orderNumber;

  function change(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
    setNotice("");
    if (saveState !== "idle") setSaveState("idle");
  }

  async function removeRecord() {
    setDeleting(true);
    setNotice("");
    try {
      const response = await fetch(`/api/${kind}/${record._id}`, { method: "DELETE" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not delete this request.");
      setPendingDelete(false);
      onDeleted?.(record._id);
    } catch (error) {
      setNotice(error.message);
      setPendingDelete(false);
    } finally {
      setDeleting(false);
    }
  }

  async function save() {
    setSaveState("saving");
    setNotice("");
    try {
      const response = await fetch(`/api/${kind}/${record._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save changes.");
      const saved = data.order || data.quote;
      onSaved(saved);
      setSaveState("saved");
      setNotice(saved.orderNumber && !record.orderNumber
        ? `Order confirmed. ${saved.orderNumber} is ready to send to the customer.`
        : "Changes saved.");
    } catch (error) {
      setSaveState("error");
      setNotice(error.message);
    }
  }

  async function sendEmail(emailType, confirmedResend = false) {
    const isResend = (emailType === "confirmation" && Boolean(record.confirmationSentAt)) ||
      (emailType === "request_received" && Boolean(record.receiptSentAt)) ||
      (emailType === "paid_invoice" && Boolean(record.paidInvoiceSentAt));
    // Sending a second copy to a customer deserves a deliberate confirmation.
    if (isResend && !confirmedResend) { setPendingResend(emailType); return; }

    setEmailBusy(emailType);
    setNotice("");
    try {
      const response = await fetch("/api/admin/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, id: record._id, emailType, personalMessage, force: isResend, delayNotice: emailType === "status_update" && delayNotice }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not send the email.");
      if (data.record) onSaved(data.record);
      setPersonalMessage("");
      setDelayNotice(false);
      setNotice(data.trackingWarning ? `${data.message} ${data.trackingWarning}` : data.message);
    } catch (error) {
      setNotice(error.message);
    } finally {
      setEmailBusy("");
    }
  }

  // Judged on what is currently in the form, so picking a new date clears the
  // warning immediately rather than waiting for a save.
  const overdue = pickupDateState({ status: form.status, pickupDate: form.pickupDate || requestedDate(record) }) === "overdue";
  // Judged on the saved record, not the form: the email is built from what
  // the database holds, so an unsaved "paid" must not unlock the invoice.
  const isPaid = ["paid_cash", "paid_direct"].includes(record.paymentStatus);
  const emailDisabled = !record.orderNumber || dirty || !emailState.connected || Boolean(emailBusy);

  return (
    <section className="crm-workspace" aria-label="Selected order workspace">
      <header className="crm-workspace-header">
        <div>
          <span className="crm-record-type">{kind === "orders" ? "Menu order" : "Cart rental request"}</span>
          <div className="crm-customer-title">
            <h2>{customer.name || "Unnamed customer"}</h2>
            <span className={`crm-status crm-status-${statusTone(record.status)}`}>{stageLabel(record.status, kind)}</span>
            {record.paymentStatus === "cash_at_pickup" ? (
              <span className="crm-status crm-status-cash" title="The customer chose to pay cash when they pick up">Cash at pickup</span>
            ) : null}
          </div>
          <p className="crm-order-reference">
            {record.orderNumber ? <b>{record.orderNumber}</b> : <span>{shortId(record._id)}</span>}
            <span>Received {dateLabel(record.createdAt, { year: true })}</span>
          </p>
        </div>
        <div className="crm-workspace-tools">
          <button
            className="crm-delete-btn"
            type="button"
            onClick={() => setPendingDelete(true)}
            disabled={deleting}
            title="Delete this request at any stage"
          >
            Delete request
          </button>
        </div>
        <div className="crm-workspace-total">
          <span>{record.confirmedTotal === null || record.confirmedTotal === undefined ? "Current estimate" : "Confirmed total"}</span>
          <b>{amountLabel(record, kind)}</b>
        </div>
      </header>

      <div className="crm-customer-strip">
        <div><span>Email</span><b>{customer.email || "Not supplied"}</b></div>
        <div><span>Phone</span><b>{customer.phone || "Not supplied"}</b></div>
        <div className={`crm-pickup-cell is-${pickupDateState(record)}`}>
          <span>{kind === "orders" ? "Requested pickup" : "Event date"}</span>
          <b>{dateLabel(requestedDate(record), { year: true })}</b>
          {pickupDateState(record) === "overdue" ? <em>{kind === "orders" ? "Pickup date has passed" : "Event date has passed"}</em> : null}
          {pickupDateState(record) === "today" ? <em>{kind === "orders" ? "Pickup is today" : "Event is today"}</em> : null}
        </div>
        <ContactLinks customer={customer} />
      </div>

      <div className="crm-detail-grid">
        <div className="crm-main-column">
          <section className="crm-card">
            <div className="crm-card-heading">
              <div><span>Request details</span><h3>What the customer asked for</h3></div>
              {kind === "orders" ? <b>{money(record.subtotal || 0)} estimate</b> : null}
            </div>
            <RequestSummary record={record} kind={kind} />
            {record.notes ? <div className="crm-customer-note"><span>Customer note</span><p>{record.notes}</p></div> : null}
          </section>

          <section className="crm-card">
            <div className="crm-card-heading">
              <div><span>Fulfilment</span><h3>Confirmation and pickup</h3></div>
              <span className="crm-pickup-label">Pickup only</span>
            </div>
            <div className="crm-form-grid">
              <Field label="Order stage">
                <select value={form.status} onChange={(event) => change("status", event.target.value)}>
                  {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </Field>
              <Field label="Payment arrangement">
                <select value={form.paymentStatus} onChange={(event) => change("paymentStatus", event.target.value)}>
                  {PAYMENT_STATUSES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </Field>
              <Field label="Confirmed total">
                <div className="crm-money-input"><span>$</span><input type="number" min="0" step="0.01" value={form.confirmedTotal} onChange={(event) => change("confirmedTotal", event.target.value)} /></div>
              </Field>
              <Field label={kind === "orders" ? "Pickup date" : "Event date"} compact hint={overdue ? "This date has passed. Set a new one, then send a status update." : undefined}>
                <DatePicker value={form.pickupDate} onChange={(next) => change("pickupDate", next)} invalid={overdue} />
              </Field>
              <Field label={kind === "orders" ? "Pickup time" : "Cart arrival time"} compact>
                <TimePicker value={form.pickupTime} onChange={(next) => change("pickupTime", next)} />
              </Field>
              <Field label={kind === "orders" ? "Pickup location" : "Event location"} wide>
                <PickupLocationPicker
                  locations={pickupLocations}
                  value={form.pickupLocation}
                  onChange={(nextValue) => change("pickupLocation", nextValue)}
                  onManage={onManageLocations}
                />
              </Field>
              <Field label="Payment instructions" wide hint="This will appear in customer emails.">
                <textarea value={form.paymentInstructions} onChange={(event) => change("paymentInstructions", event.target.value)} />
              </Field>
              <Field label="Private staff notes" wide hint="Only staff can see these notes.">
                <textarea value={form.adminNotes} onChange={(event) => change("adminNotes", event.target.value)} placeholder="Conversation history, preferences, or follow-up notes" />
              </Field>
            </div>
            {willConfirm ? <div className="crm-confirm-hint">Saving this stage will create the customer&apos;s permanent order number.</div> : null}
            <div className="crm-save-bar">
              <span className={dirty ? "crm-unsaved" : "crm-saved-state"}>{dirty ? "Unsaved changes" : "Up to date"}</span>
              <button className="btn btn-pink btn-sm" type="button" onClick={save} disabled={saveState === "saving" || !dirty}>
                {saveState === "saving" ? "Saving…" : willConfirm ? "Confirm order & save" : "Save changes"}
              </button>
            </div>

            <ConfirmDialog
              open={pendingDelete}
              title="Delete this request?"
              message={`${customer.name || "This customer"}'s ${kind === "orders" ? "order" : "cart rental request"}${record.orderNumber ? ` (${record.orderNumber})` : ""} will be removed from the Shop Desk, including any confirmed pickup details.`}
              consequence="This permanently deletes the customer's name, contact details and order history, whatever stage it has reached. It cannot be undone, and no email is sent to them."
              confirmLabel="Delete permanently"
              tone="danger"
              busy={deleting}
              onConfirm={removeRecord}
              onCancel={() => setPendingDelete(false)}
            />
            <ConfirmDialog
              open={Boolean(pendingResend)}
              title="Send this email again?"
              message="This customer has already received this email. Sending again delivers a second copy."
              confirmLabel="Send it again"
              busy={Boolean(emailBusy)}
              onConfirm={() => { const type = pendingResend; setPendingResend(null); sendEmail(type, true); }}
              onCancel={() => setPendingResend(null)}
            />
          </section>
        </div>

        <aside className="crm-side-column">
          <section className="crm-card crm-email-card">
            <div className="crm-email-heading">
              <div><span>Customer email</span><h3>Order communication</h3></div>
              <span className={`crm-connection ${emailState.connected ? "is-connected" : ""}`}>
                {emailState.loading ? "Checking…" : emailState.connected ? "Gmail connected" : "Gmail needs attention"}
              </span>
            </div>

            {record.orderNumber ? (
              <div className="crm-number-panel"><span>Customer order number</span><b>{record.orderNumber}</b></div>
            ) : (
              <div className="crm-number-panel is-pending"><span>Order number pending</span><p>Set the stage to {kind === "orders" ? "Order Confirmed" : "Cart booked"} and save first.</p></div>
            )}

            <label className="crm-email-note">
              <span>Optional message to customer</span>
              <textarea value={personalMessage} onChange={(event) => setPersonalMessage(event.target.value)} placeholder="Add a short personal note to this email…" maxLength={2000} />
            </label>

            <button className="btn btn-pink btn-block" type="button" disabled={emailDisabled} onClick={() => sendEmail("confirmation")}>
              {emailBusy === "confirmation" ? "Sending…" : record.confirmationSentAt ? "Resend confirmation" : "Send order confirmation"}
            </button>
            <label className="crm-delay-toggle">
              <input
                type="checkbox"
                checked={delayNotice}
                onChange={(event) => setDelayNotice(event.target.checked)}
              />
              <span>
                <b>Tell them the pickup date changed</b>
                <small>
                  {form.pickupDate
                    ? `The update will say pickup has moved to ${dateLabel(form.pickupDate, { year: true })}, and to call or text ${SITE.phone} if that date doesn't work.`
                    : `No pickup date is set, so the update will ask them to call or text ${SITE.phone} to arrange one.`}
                </small>
              </span>
            </label>
            <button className="btn btn-ghost btn-block" type="button" disabled={emailDisabled} onClick={() => sendEmail("status_update")}>
              {emailBusy === "status_update" ? "Sending…" : delayNotice ? "Send delay update" : "Send status update"}
            </button>

            <button
              className="btn btn-invoice btn-block"
              type="button"
              disabled={emailDisabled || !isPaid}
              title={isPaid ? "Email a paid invoice with a PDF attached" : "Mark the payment as received and save it first"}
              onClick={() => sendEmail("paid_invoice")}
            >
              {emailBusy === "paid_invoice"
                ? "Sending…"
                : record.paidInvoiceSentAt ? "Resend paid invoice" : "Send paid invoice"}
            </button>
            {!isPaid ? (
              <p className="crm-email-help">A paid invoice unlocks once the payment arrangement is set to a paid option and saved.</p>
            ) : null}

            {kind === "orders" && !record.orderNumber && ["pending", "contacted"].includes(record.status) ? (
              <button className="btn btn-ghost btn-block" type="button" disabled={dirty || !emailState.connected || Boolean(emailBusy)} onClick={() => sendEmail("request_received")}>
                {emailBusy === "request_received" ? "Sending…" : record.receiptSentAt ? "Resend request receipt" : "Send request receipt"}
              </button>
            ) : null}

            {dirty ? <p className="crm-email-help">Save your changes before sending so the email contains the latest pickup details.</p> : null}
            {!emailState.connected && !emailState.loading ? <p className="crm-email-error">{emailState.error || "Check the Gmail settings."}</p> : null}
            {record.receiptSentAt ? <p className="crm-email-history">Request receipt emailed {timeStamp(record.receiptSentAt)}</p> : null}
            {record.receiptEmailError ? <p className="crm-email-error">{record.receiptEmailError}</p> : null}
            {record.confirmationSentAt ? <p className="crm-email-history">Confirmation sent {timeStamp(record.confirmationSentAt)}</p> : null}
            {record.paidInvoiceSentAt ? <p className="crm-email-history">Paid invoice sent {timeStamp(record.paidInvoiceSentAt)}</p> : null}
            {record.lastUpdateSentAt ? <p className="crm-email-history">Latest update sent {timeStamp(record.lastUpdateSentAt)}</p> : null}
          </section>

          <section className="crm-card crm-timeline-card">
            <div className="crm-card-heading"><div><span>At a glance</span><h3>Order timeline</h3></div></div>
            <ol className="crm-timeline">
              <li className="done"><span /><div><b>Request received</b><small>{timeStamp(record.createdAt)}</small></div></li>
              <li className={record.orderNumber ? "done" : "current"}><span /><div><b>Order confirmed</b><small>{record.confirmedAt ? timeStamp(record.confirmedAt) : "Waiting for confirmation"}</small></div></li>
              <li className={record.status === "ready" || ["collected", "closed"].includes(record.status) ? "done" : ""}><span /><div><b>Ready for pickup</b><small>{record.status === "ready" ? "Customer can be notified" : "Not ready yet"}</small></div></li>
              <li className={["collected", "closed"].includes(record.status) ? "done" : ""}><span /><div><b>Pickup completed</b><small>{["collected", "closed"].includes(record.status) ? stageLabel(record.status, kind) : "Open"}</small></div></li>
            </ol>
          </section>
        </aside>
      </div>

      {notice ? <div className={`crm-notice${saveState === "error" ? " is-error" : ""}`} role="status">{notice}</div> : null}
    </section>
  );
}

export default function AdminOrders({ dbReady }) {
  const [quotes, setQuotes] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selectedKey, setSelectedKey] = useState("");
  const [kindFilter, setKindFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [emailState, setEmailState] = useState({ loading: true, configured: false, connected: false, error: "" });
  const [pickupLocations, setPickupLocations] = useState([]);
  const [locationsOpen, setLocationsOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const [quoteResponse, orderResponse, emailResponse, locationResponse] = await Promise.all([
        fetch("/api/quotes", { cache: "no-store" }),
        fetch("/api/orders", { cache: "no-store" }),
        fetch("/api/admin/email", { cache: "no-store" }),
        fetch("/api/admin/pickup-locations", { cache: "no-store" }),
      ]);
      if (!quoteResponse.ok || !orderResponse.ok || !locationResponse.ok) throw new Error("Could not load the pickup order desk.");
      const [quoteData, orderData, emailData, locationData] = await Promise.all([
        quoteResponse.json(),
        orderResponse.json(),
        emailResponse.json().catch(() => ({})),
        locationResponse.json(),
      ]);
      setQuotes(quoteData.quotes || []);
      setOrders(orderData.orders || []);
      setPickupLocations(locationData.locations || []);
      setEmailState({
        loading: false,
        configured: Boolean(emailData.configured),
        connected: emailResponse.ok && Boolean(emailData.connected),
        error: emailData.error || "",
      });
    } catch (error) {
      setLoadError(error.message);
      setEmailState((current) => ({ ...current, loading: false }));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const records = useMemo(() => [
    ...orders.map((record) => ({ record, kind: "orders", key: `orders:${record._id}` })),
    ...quotes.map((record) => ({ record, kind: "quotes", key: `quotes:${record._id}` })),
  ].sort((a, b) => new Date(b.record.createdAt || 0) - new Date(a.record.createdAt || 0)), [orders, quotes]);

  const visibleRecords = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return records.filter(({ record, kind }) => {
      if (kindFilter !== "all" && kind !== kindFilter) return false;
      if (!stageMatches(record.status, stageFilter)) return false;
      if (!needle) return true;
      const customer = customerFor(record, kind);
      return [record.orderNumber, shortId(record._id), customer.name, customer.email, customer.phone]
        .some((value) => String(value || "").toLowerCase().includes(needle));
    });
  }, [kindFilter, query, records, stageFilter]);

  const selected = visibleRecords.find((item) => item.key === selectedKey) || visibleRecords[0] || null;
  const needsAttention = records.filter(({ record }) => ATTENTION_STATUSES.includes(record.status)).length;
  const confirmed = records.filter(({ record }) => CONFIRMED_STATUSES.includes(record.status)).length;
  const ready = records.filter(({ record }) => record.status === "ready").length;

  function updateRecord(saved, kind) {
    const setter = kind === "orders" ? setOrders : setQuotes;
    setter((current) => current.map((item) => item._id === saved._id ? saved : item));
  }

  function removeRecordFromList(id, kind) {
    const setter = kind === "orders" ? setOrders : setQuotes;
    setter((current) => current.filter((item) => item._id !== id));
    // The deleted record was the open one, so clear the workspace.
    setSelectedKey("");
  }

  return (
    <div className="crm-shell">
      <header className="crm-header">
        <div className="crm-brand-block">
          <span>Bon Bon&apos;s staff</span>
          <h1>Orders &amp; cart rentals.</h1>
          <p>Customer requests, pickup details, and order communication in one place.</p>
        </div>
        <div className="crm-header-actions">
          <span className={`crm-connection crm-header-connection ${emailState.connected ? "is-connected" : ""}`}>
            {emailState.loading ? "Checking Gmail" : emailState.connected ? "Gmail connected" : "Gmail needs attention"}
          </span>
          <button className="btn btn-ghost btn-sm" type="button" onClick={load}>Refresh</button>
          <button className="btn btn-ghost btn-sm" type="button" onClick={() => setLocationsOpen(true)}>Pickup locations</button>
        </div>
      </header>

      <OrderDataTools orders={orders} onImported={load} />

      {!dbReady ? (
        <div className="admin-setup-warning">
          <b>Connect Supabase before accepting real requests.</b>
          <p>The staff workspace is ready, but customer requests cannot be saved until the database environment variables are configured.</p>
        </div>
      ) : null}
      {loadError ? <div className="admin-load-error" role="alert">{loadError}</div> : null}

      <section className="crm-metrics" aria-label="Order pipeline summary">
        <div><span>Open pipeline</span><b>{records.filter(({ record }) => !COMPLETE_STATUSES.includes(record.status)).length}</b><small>active pickup requests</small></div>
        <div><span>Needs attention</span><b>{needsAttention}</b><small>new or awaiting follow-up</small></div>
        <div><span>Confirmed</span><b>{confirmed}</b><small>on the pickup calendar</small></div>
        <div><span>Ready</span><b>{ready}</b><small>waiting for pickup</small></div>
      </section>

      <section className="crm-board">
        <aside className="crm-queue">
          <div className="crm-queue-heading">
            <div><span>Request queue</span><b>{visibleRecords.length} shown</b></div>
            {loading ? <small>Refreshing…</small> : null}
          </div>
          <div className="crm-kind-tabs" aria-label="Request type filter">
            {[["all", "All"], ["orders", "Menu"], ["quotes", "Cart rentals"]].map(([value, label]) => (
              <button type="button" key={value} className={kindFilter === value ? "active" : ""} onClick={() => setKindFilter(value)}>{label}</button>
            ))}
          </div>
          <div className="crm-queue-tools">
            <label className="crm-search">
              <span className="sr-only">Search requests</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, email, phone…" />
            </label>
            <label className="crm-stage-filter">
              <span className="sr-only">Filter by stage</span>
              <select value={stageFilter} onChange={(event) => setStageFilter(event.target.value)}>
                {STAGE_FILTERS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
          </div>
          <div className="crm-record-list">
            {loading && !records.length ? <p className="crm-list-empty">Loading requests…</p> : null}
            {!loading && !visibleRecords.length ? <p className="crm-list-empty">No requests match these filters.</p> : null}
            {visibleRecords.map(({ record, kind, key }) => {
              const customer = customerFor(record, kind);
              return (
                <button className={`crm-record-row${selected?.key === key ? " active" : ""}`} type="button" key={key} onClick={() => setSelectedKey(key)}>
                  <span className={`crm-row-marker crm-row-marker-${statusTone(record.status)}`} />
                  <span className="crm-row-copy">
                    <span className="crm-row-topline"><b>{customer.name || "Unnamed customer"}</b><strong>{amountLabel(record, kind)}{record.paymentStatus === "cash_at_pickup" ? <em className="crm-row-cash" title="Customer chose cash at pickup"> · cash</em> : null}</strong></span>
                    {kind === "quotes" && (record.occasion || record.guests) ? (
                      <span className="crm-row-event">
                        {[record.occasion, partySizeLabel(record.guests)].filter(Boolean).join(" · ")}
                      </span>
                    ) : null}
                    <span className="crm-row-meta"><span>{record.orderNumber || shortId(record._id)}</span><span>{kind === "orders" ? "Menu" : "Cart"}</span><span className={`crm-row-date is-${pickupDateState(record)}`}>{dateLabel(requestedDate(record))}</span></span>
                    <span className="crm-row-stage">{stageLabel(record.status, kind)}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        {selected ? (
          <RecordWorkspace
            key={selected.key}
            record={selected.record}
            kind={selected.kind}
            emailState={emailState}
            pickupLocations={pickupLocations}
            onManageLocations={() => setLocationsOpen(true)}
            onSaved={(saved) => updateRecord(saved, selected.kind)}
            onDeleted={(id) => removeRecordFromList(id, selected.kind)}
          />
        ) : (
          <section className="crm-no-selection">
            <span>Order desk</span>
            <h2>{records.length ? "No requests match your filters" : "No pickup requests yet"}</h2>
            <p>{records.length ? "Adjust the search or stage filter to see other requests." : "New menu orders and cart rental requests will appear here."}</p>
          </section>
        )}
      </section>
      <PickupLocationManager
        open={locationsOpen}
        locations={pickupLocations}
        onClose={() => setLocationsOpen(false)}
        onChanged={setPickupLocations}
      />
    </div>
  );
}
