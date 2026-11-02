import test from "node:test";
import assert from "node:assert/strict";
import { nextRun, zonedToUtc } from "../lib/schedule.ts";

const iso = (d: Date | null) => d?.toISOString() ?? null;

test("zonedToUtc: Kolkata is UTC+5:30 all year", () => {
  assert.equal(zonedToUtc(2026, 11, 3, 9, 0, "Asia/Kolkata").toISOString(), "2026-11-03T03:30:00.000Z");
});

test("daily: later today if the time has not passed, otherwise tomorrow", () => {
  const spec = { kind: "daily", local_time: "09:00", timezone: "Asia/Kolkata" } as const;
  assert.equal(iso(nextRun(spec, new Date("2026-11-02T20:00:00Z"))), "2026-11-03T03:30:00.000Z"); // 01:30 IST Nov 3
  assert.equal(iso(nextRun(spec, new Date("2026-11-03T03:30:00Z"))), "2026-11-04T03:30:00.000Z"); // exactly at the time: next day
});

test("weekdays: Friday evening goes to Monday", () => {
  const spec = { kind: "weekdays", local_time: "09:00", timezone: "UTC" } as const;
  assert.equal(iso(nextRun(spec, new Date("2026-11-06T10:00:00Z"))), "2026-11-09T09:00:00.000Z"); // Fri -> Mon
});

test("weekly: picks the next chosen day", () => {
  const spec = { kind: "weekly", local_time: "08:30", weekdays: [1, 3], timezone: "UTC" } as const;
  assert.equal(iso(nextRun(spec, new Date("2026-11-02T09:00:00Z"))), "2026-11-04T08:30:00.000Z"); // Mon after 08:30 -> Wed
});

test("once: in the future runs, in the past never", () => {
  const spec = { kind: "once", local_time: "09:00", local_date: "2026-11-10", timezone: "UTC" } as const;
  assert.equal(iso(nextRun(spec, new Date("2026-11-02T00:00:00Z"))), "2026-11-10T09:00:00.000Z");
  assert.equal(nextRun(spec, new Date("2026-11-11T00:00:00Z")), null);
});

test("DST: 09:00 New York stays 09:00 local across spring-forward (2026-03-08)", () => {
  const spec = { kind: "daily", local_time: "09:00", timezone: "America/New_York" } as const;
  assert.equal(iso(nextRun(spec, new Date("2026-03-07T15:00:00Z"))), "2026-03-08T13:00:00.000Z"); // EDT, UTC-4
  assert.equal(iso(nextRun(spec, new Date("2026-03-07T10:00:00Z"))), "2026-03-07T14:00:00.000Z"); // still EST, UTC-5
});

test("repeating schedules never get stuck: 400 consecutive days advance", () => {
  const spec = { kind: "daily", local_time: "02:30", timezone: "America/New_York" } as const; // 02:30 does not exist on spring-forward day
  let at = new Date("2026-01-01T00:00:00Z");
  for (let i = 0; i < 400; i++) {
    const next = nextRun(spec, at);
    assert.ok(next && next.getTime() > at.getTime());
    at = next;
  }
});
