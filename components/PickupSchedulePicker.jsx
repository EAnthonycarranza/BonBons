"use client";
import { useEffect, useState } from "react";
import {
  localPickupNow,
  availablePickupTimes,
  pickupDateLabel,
  pickupTimeLabel,
  PICKUP_SCHEDULE_LABEL,
  ALTERNATE_PICKUP_COPY,
} from "@/lib/pickup-schedule";
import "./pickup-schedule.css";
export default function PickupSchedulePicker({
  value,
  onChange,
  error,
  disabled = false,
}) {
  const [now, setNow] = useState(() => new Date());
  const [month, setMonth] = useState(() => localPickupNow().date.slice(0, 7));
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);
  const today = localPickupNow(now).date;
  const custom = value.pickupRequestType === "custom";
  const [year, monthNumber] = month.split("-").map(Number);
  const start = new Date(Date.UTC(year, monthNumber - 1, 1)),
    days = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const times = availablePickupTimes(value.wantedDate, now);
  function moveMonth(delta) {
    setMonth(
      new Date(Date.UTC(year, monthNumber - 1 + delta, 1))
        .toISOString()
        .slice(0, 7),
    );
  }
  function chooseMode(mode) {
    if (mode === value.pickupRequestType) return;
    onChange({
      ...value,
      pickupRequestType: mode,
      wantedDate: "",
      wantedTime: "",
    });
  }
  return (
    <fieldset
      className="pickup-schedule-picker"
      disabled={disabled}
      id="c-wantedDate"
      tabIndex={-1}
      aria-invalid={Boolean(error)}
      aria-describedby={error ? "c-date-error" : undefined}
    >
      <legend>When would you like pickup?</legend>
      <p className="help">{PICKUP_SCHEDULE_LABEL}</p>
      <div
        className="pickup-mode"
        role="radiogroup"
        aria-label="Pickup options"
      >
        {[
          ["regular", "Choose a regular pickup"],
          ["custom", "Request another date or time"],
        ].map(([mode, label]) => (
          <label key={mode}>
            <input
              type="radio"
              name="pickupRequestType"
              checked={value.pickupRequestType === mode}
              onChange={() => chooseMode(mode)}
            />
            <span>{label}</span>
          </label>
        ))}
      </div>
      {!custom ? (
        <>
          <div
            className="pickup-calendar"
            role="group"
            aria-label="Choose an available pickup date"
          >
            <div className="pickup-calendar-head">
              <button
                type="button"
                aria-label="Previous month"
                disabled={month <= today.slice(0, 7) || disabled}
                onClick={() => moveMonth(-1)}
              >
                ←
              </button>
              <b>
                {new Intl.DateTimeFormat("en-US", {
                  timeZone: "UTC",
                  month: "long",
                  year: "numeric",
                }).format(start)}
              </b>
              <button
                type="button"
                aria-label="Next month"
                onClick={() => moveMonth(1)}
              >
                →
              </button>
            </div>
            <div className="pickup-calendar-days">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <small key={day}>{day}</small>
              ))}
              {Array.from({ length: start.getUTCDay() }, (_, i) => (
                <span key={`blank-${i}`} />
              ))}
              {Array.from({ length: days }, (_, i) => {
                const date = `${month}-${String(i + 1).padStart(2, "0")}`;
                return (
                  <button
                    key={date}
                    type="button"
                    aria-label={pickupDateLabel(date)}
                    aria-pressed={value.wantedDate === date}
                    disabled={
                      disabled || !availablePickupTimes(date, now).length
                    }
                    onClick={() =>
                      onChange({ ...value, wantedDate: date, wantedTime: "" })
                    }
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
          </div>
          <p className="help">
            {value.wantedDate
              ? pickupDateLabel(value.wantedDate)
              : "Select a highlighted date."}
          </p>
          <div className="field">
            <label htmlFor="c-wantedTime">
              Preferred pickup time <span className="req">*</span>
            </label>
            <select
              id="c-wantedTime"
              value={value.wantedTime}
              required
              disabled={!value.wantedDate || disabled}
              onChange={(event) =>
                onChange({ ...value, wantedTime: event.target.value })
              }
            >
              <option value="">Choose a time</option>
              {times.map((time) => (
                <option key={time} value={time}>
                  {pickupTimeLabel(time)}
                </option>
              ))}
            </select>
            <p className="help">
              Available in 30-minute intervals. Bonnie will confirm your pickup.
            </p>
          </div>
        </>
      ) : (
        <>
          <p className="pickup-alternate-copy">{ALTERNATE_PICKUP_COPY}</p>
          <div className="field">
            <label htmlFor="c-customDate">
              Requested pickup date <span className="req">*</span>
            </label>
            <input
              id="c-customDate"
              type="date"
              min={today}
              value={value.wantedDate}
              required
              onChange={(event) =>
                onChange({ ...value, wantedDate: event.target.value })
              }
            />
          </div>
          <div className="field">
            <label htmlFor="c-wantedTime">
              Requested pickup time <span className="req">*</span>
            </label>
            <input
              id="c-wantedTime"
              type="time"
              step="60"
              value={value.wantedTime}
              required
              onChange={(event) =>
                onChange({ ...value, wantedTime: event.target.value })
              }
            />
          </div>
          <p className="help">
            This is an accommodation request. The date and time are subject to
            Bonnie’s confirmation.
          </p>
        </>
      )}
      {error && (
        <p
          id="c-date-error"
          className="err"
          style={{ display: "block" }}
          role="alert"
        >
          {error}
        </p>
      )}
    </fieldset>
  );
}
