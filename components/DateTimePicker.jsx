"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AdminIcon from "./AdminIcon";
import {
  formatDateValue,
  formatTimeValue,
  parseDateValue,
  pickupSlots,
  toDateValue,
} from "@/lib/date-values";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

function sameDay(a, b) {
  return a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/**
 * Calendar picker for a pickup date.
 *
 * Past days stay selectable — an owner may be recording a pickup that already
 * happened — but are marked, which lines up with how an overdue pickup is
 * flagged elsewhere on the desk.
 */
export function DatePicker({ value, onChange, id, invalid = false, disabled = false }) {
  const [open, setOpen] = useState(false);
  const selected = parseDateValue(value);
  const today = startOfToday();
  const [view, setView] = useState(() => selected || today);
  const [focusDay, setFocusDay] = useState(() => selected || today);
  const rootRef = useRef(null);
  const gridRef = useRef(null);

  useEffect(() => { if (selected) { setView(selected); setFocusDay(selected); } }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    function onDocDown(event) {
      if (!rootRef.current?.contains(event.target)) close();
    }
    function onKey(event) {
      if (event.key === "Escape") { event.stopPropagation(); close(); }
    }
    document.addEventListener("mousedown", onDocDown);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("mousedown", onDocDown);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open, close]);

  useEffect(() => {
    if (open) gridRef.current?.querySelector('[tabindex="0"]')?.focus();
  }, [open, view]);

  const days = useMemo(() => {
    const first = new Date(view.getFullYear(), view.getMonth(), 1);
    const start = new Date(first);
    start.setDate(1 - first.getDay());
    return Array.from({ length: 42 }, (_, index) => {
      const day = new Date(start);
      day.setDate(start.getDate() + index);
      return day;
    });
  }, [view]);

  function pick(day) {
    onChange(toDateValue(day));
    close();
  }

  function onGridKey(event) {
    const moves = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (event.key in moves) {
      event.preventDefault();
      const next = new Date(focusDay);
      next.setDate(next.getDate() + moves[event.key]);
      setFocusDay(next);
      if (next.getMonth() !== view.getMonth() || next.getFullYear() !== view.getFullYear()) setView(next);
      return;
    }
    if (event.key === "Enter" || event.key === " ") { event.preventDefault(); pick(focusDay); }
  }

  return (
    <div className="dtp" ref={rootRef}>
      <button
        type="button"
        id={id}
        className={`dtp-trigger${invalid ? " is-invalid" : ""}${open ? " is-open" : ""}`}
        onClick={() => setOpen((current) => !current)}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <AdminIcon name="orders" />
        <span className={value ? "" : "is-placeholder"}>{value ? formatDateValue(value) : "Choose a date"}</span>
        {value ? (
          <span
            className="dtp-clear"
            role="button"
            tabIndex={0}
            aria-label="Clear the pickup date"
            onClick={(event) => { event.stopPropagation(); onChange(""); }}
            onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); event.stopPropagation(); onChange(""); } }}
          >
            <AdminIcon name="close" />
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="dtp-pop" role="dialog" aria-label="Choose a pickup date">
          <div className="dtp-pop-head">
            <button type="button" onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))} aria-label="Previous month">‹</button>
            <b>{MONTHS[view.getMonth()]} {view.getFullYear()}</b>
            <button type="button" onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))} aria-label="Next month">›</button>
          </div>
          <div className="dtp-weekdays" aria-hidden="true">
            {WEEKDAYS.map((day) => <span key={day}>{day}</span>)}
          </div>
          <div className="dtp-grid" role="grid" ref={gridRef} onKeyDown={onGridKey}>
            {days.map((day) => {
              const outside = day.getMonth() !== view.getMonth();
              const isToday = sameDay(day, today);
              const isSelected = sameDay(day, selected);
              const isPast = day.getTime() < today.getTime();
              return (
                <button
                  type="button"
                  key={day.toISOString()}
                  role="gridcell"
                  tabIndex={sameDay(day, focusDay) ? 0 : -1}
                  aria-selected={isSelected}
                  aria-current={isToday ? "date" : undefined}
                  className={`dtp-day${outside ? " is-outside" : ""}${isToday ? " is-today" : ""}${isSelected ? " is-selected" : ""}${isPast ? " is-past" : ""}`}
                  onClick={() => pick(day)}
                  onFocus={() => setFocusDay(day)}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>
          <div className="dtp-pop-foot">
            <button type="button" onClick={() => pick(today)}>Today</button>
            <button type="button" onClick={() => { const t = new Date(today); t.setDate(t.getDate() + 1); pick(t); }}>Tomorrow</button>
            <button type="button" onClick={() => { const t = new Date(today); t.setDate(t.getDate() + 7); pick(t); }}>Next week</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Pickup times as shop slots rather than a raw clock field. */
export function TimePicker({ value, onChange, id, disabled = false }) {
  const normalized = String(value || "").slice(0, 5);
  const options = useMemo(() => pickupSlots(normalized), [normalized]);
  return (
    <div className="dtp-time">
      <AdminIcon name="orders" />
      <select
        id={id}
        value={normalized}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        aria-label="Pickup time"
      >
        <option value="">Not set yet</option>
        {options.map((slot) => (
          <option key={slot} value={slot}>{formatTimeValue(slot)}</option>
        ))}
      </select>
    </div>
  );
}
