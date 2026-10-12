import test from "node:test";
import assert from "node:assert/strict";
import {
  validatePickupRequest,
  availablePickupTimes,
  regularPickupDay,
  localPickupNow,
  pickupTimeLabel,
  validPickupDate,
} from "../lib/pickup-schedule.js";
const NOW = new Date("2026-10-12T06:00:00Z");
const choice = (
  wantedDate,
  wantedTime = "15:00",
  pickupRequestType = "regular",
) => ({ wantedDate, wantedTime, pickupRequestType });
test("regular pickups allow Tuesday Thursday Friday and both window endpoints", () => {
  for (const date of ["2026-10-13", "2026-10-15", "2026-10-16"])
    for (const time of ["15:00", "15:30", "19:30", "20:00"])
      assert.deepEqual(
        validatePickupRequest(choice(date, time), NOW),
        choice(date, time),
      );
  for (const date of ["2026-10-14", "2026-10-17", "2026-10-18", "2026-10-19"])
    assert.throws(
      () => validatePickupRequest(choice(date), NOW),
      /Regular pickup/,
    );
  for (const time of ["14:30", "20:30", "15:01"])
    assert.throws(
      () => validatePickupRequest(choice("2026-10-13", time), NOW),
      /Regular pickup/,
    );
});
test("alternate requests allow other days and times while remaining future requests", () => {
  assert.deepEqual(
    validatePickupRequest(choice("2026-10-14", "10:17", "custom"), NOW),
    choice("2026-10-14", "10:17", "custom"),
  );
  assert.throws(
    () => validatePickupRequest(choice("2026-10-10", "18:00", "custom"), NOW),
    /future/,
  );
  assert.throws(() =>
    validatePickupRequest(choice("2026-10-13", "15:00", "bypass"), NOW),
  );
});
test("dates are strict and times cannot normalize invalid values", () => {
  for (const date of [
    "2026-02-29",
    "2026-02-31",
    "2026-13-01",
    "2026-2-01",
    "",
  ])
    assert.equal(validPickupDate(date), false);
  assert.equal(validPickupDate("2028-02-29"), true);
  for (const time of ["24:00", "15:99", "3:00", "15:00:00", ""])
    assert.throws(() => validatePickupRequest(choice("2026-10-13", time), NOW));
});
test("same-day slots follow Chicago time rather than the browser or UTC date", () => {
  const now = new Date("2026-10-14T00:45:00Z"); // Tuesday 7:45 PM CDT.
  assert.deepEqual(localPickupNow(now), { date: "2026-10-13", time: "19:45" });
  assert.deepEqual(availablePickupTimes("2026-10-13", now), ["20:00"]);
  assert.throws(
    () => validatePickupRequest(choice("2026-10-13", "19:30"), now),
    /future/,
  );
  assert.equal(
    availablePickupTimes("2026-10-13", new Date("2026-10-14T01:01:00Z")).length,
    0,
  );
});
test("winter time and midnight remain in the San Antonio calendar", () => {
  assert.deepEqual(localPickupNow(new Date("2026-11-04T01:45:00Z")), {
    date: "2026-11-03",
    time: "19:45",
  });
  assert.deepEqual(
    availablePickupTimes("2026-11-03", new Date("2026-11-04T01:45:00Z")),
    ["20:00"],
  );
  assert.equal(regularPickupDay("2026-11-03"), true);
  assert.equal(pickupTimeLabel("20:00"), "8:00 PM");
});
