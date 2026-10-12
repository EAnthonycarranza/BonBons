export const PICKUP_TIME_ZONE = "America/Chicago";
export const PICKUP_SCHEDULE_LABEL =
  "Tuesdays, Thursdays & Fridays · 3–8 p.m. · San Antonio time";
export const ALTERNATE_PICKUP_COPY =
  "Need another pickup time? Request a date and time, and Bon Bon will contact you to see what we can arrange.";
export const REGULAR_PICKUP_TIMES = Array.from(
  { length: 11 },
  (_, index) =>
    `${String(15 + Math.floor(index / 2)).padStart(2, "0")}:${index % 2 ? "30" : "00"}`,
);
export function localPickupNow(now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: PICKUP_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(now)
      .filter((p) => p.type !== "literal")
      .map((p) => [p.type, p.value]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
  };
}
export function validPickupDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}
export function regularPickupDay(value) {
  return (
    validPickupDate(value) &&
    [2, 4, 5].includes(new Date(`${value}T12:00:00Z`).getUTCDay())
  );
}
export function pickupTimeLabel(value) {
  const [h, m] = String(value).split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}
export function pickupDateLabel(value) {
  return validPickupDate(value)
    ? new Intl.DateTimeFormat("en-US", {
        timeZone: "UTC",
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }).format(new Date(`${value}T12:00:00Z`))
    : "Choose a date";
}
export function availablePickupTimes(date, now = new Date()) {
  if (!regularPickupDay(date)) return [];
  const local = localPickupNow(now);
  return REGULAR_PICKUP_TIMES.filter(
    (time) => date > local.date || (date === local.date && time > local.time),
  );
}
export function validatePickupRequest(
  { wantedDate, wantedTime, pickupRequestType = "regular" },
  now = new Date(),
) {
  if (!["regular", "custom"].includes(pickupRequestType))
    throw new Error("Choose a regular pickup or request another time.");
  if (!validPickupDate(wantedDate))
    throw new Error("Choose a valid pickup date.");
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(String(wantedTime || "")))
    throw new Error("Choose a pickup time.");
  const local = localPickupNow(now);
  if (
    wantedDate < local.date ||
    (wantedDate === local.date && wantedTime <= local.time)
  )
    throw new Error(
      "Choose a pickup date and time in the future (San Antonio time).",
    );
  if (
    pickupRequestType === "regular" &&
    (!regularPickupDay(wantedDate) ||
      !REGULAR_PICKUP_TIMES.includes(wantedTime))
  )
    throw new Error(
      "Regular pickup is Tuesday, Thursday, or Friday, 3–8 p.m. Choose an available time or request another time.",
    );
  return { wantedDate, wantedTime, pickupRequestType };
}
