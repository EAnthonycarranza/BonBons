// Value handling for the pickup date and time pickers. Kept free of JSX so the
// rules can be tested directly and reused on the server.

export const SLOT_MINUTES = 15;
export const FIRST_SLOT_HOUR = 7;
export const LAST_SLOT_HOUR = 20;

export function toDateValue(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/**
 * Parsed as a local calendar day.
 * `new Date("2026-09-15")` is UTC midnight, which is the previous day anywhere
 * west of Greenwich — that would show the wrong day and mis-flag overdue
 * pickups, so the parts are read explicitly.
 */
export function parseDateValue(value) {
  const match = String(value ?? "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(year, month - 1, day);
  // Rejects impossible dates that would otherwise roll over, e.g. 2026-02-31.
  if (date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
}

export function formatDateValue(value) {
  const date = parseDateValue(value);
  if (!date) return "";
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short", month: "short", day: "numeric", year: "numeric",
  }).format(date);
}

export function formatTimeValue(value) {
  const match = String(value ?? "").match(/^(\d{1,2}):([0-5]\d)/);
  if (!match) return "";
  const hours = Number(match[1]);
  if (hours > 23) return "";
  const suffix = hours >= 12 ? "PM" : "AM";
  const display = hours % 12 === 0 ? 12 : hours % 12;
  return `${display}:${match[2]} ${suffix}`;
}

/**
 * Shop pickup slots, plus whatever time is already stored.
 * An imported or hand-entered time off the grid must stay selectable rather
 * than being silently snapped to the nearest slot.
 */
export function pickupSlots(current) {
  const slots = [];
  for (let hour = FIRST_SLOT_HOUR; hour <= LAST_SLOT_HOUR; hour += 1) {
    for (let minute = 0; minute < 60; minute += SLOT_MINUTES) {
      if (hour === LAST_SLOT_HOUR && minute > 0) break;
      slots.push(`${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`);
    }
  }
  const normalized = String(current ?? "").slice(0, 5);
  if (/^\d{2}:\d{2}$/.test(normalized) && !slots.includes(normalized)) slots.push(normalized);
  return slots.sort();
}
