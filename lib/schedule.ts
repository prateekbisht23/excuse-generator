export type Kind = "once" | "daily" | "weekdays" | "weekly";
export type ScheduleSpec = {
  kind: Kind;
  local_time: string;          // "HH:MM" in `timezone`
  local_date?: string | null;  // "YYYY-MM-DD", once only
  weekdays?: readonly number[];  // 0 = Sunday .. 6 = Saturday, weekly only
  timezone: string;
};

/** Offset of `tz` from UTC at the instant `ms`, in minutes. */
function offsetMinutes(ms: number, tz: string): number {
  const p = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric",
    hour: "numeric", minute: "numeric", second: "numeric",
  }).formatToParts(new Date(ms));
  const n = (t: string) => Number(p.find((x) => x.type === t)!.value);
  const asUtc = Date.UTC(n("year"), n("month") - 1, n("day"), n("hour"), n("minute"), n("second"));
  return Math.round((asUtc - ms) / 60000);
}

/** The UTC instant at which a wall clock in `tz` reads y-m-d hh:mm. */
export function zonedToUtc(y: number, m: number, d: number, hh: number, mm: number, tz: string): Date {
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  let ms = guess - offsetMinutes(guess, tz) * 60000;
  ms = guess - offsetMinutes(ms, tz) * 60000; // re-check once: the offset can differ across a DST change
  return new Date(ms);
}

/** The wall clock date in `tz` at `at`. */
function localDate(at: Date, tz: string) {
  const p = new Intl.DateTimeFormat("en-US", { timeZone: tz, year: "numeric", month: "numeric", day: "numeric" }).formatToParts(at);
  const n = (t: string) => Number(p.find((x) => x.type === t)!.value);
  return { y: n("year"), m: n("month"), d: n("day") };
}

export function isValidTimezone(tz: string): boolean {
  try { new Intl.DateTimeFormat("en-US", { timeZone: tz }); return true; } catch { return false; }
}

/** First run strictly after `after`, or null when nothing is left (a one-time schedule in the past). */
export function nextRun(s: ScheduleSpec, after: Date): Date | null {
  const [hh, mm] = s.local_time.split(":").map(Number);

  if (s.kind === "once") {
    if (!s.local_date) return null;
    const [y, m, d] = s.local_date.split("-").map(Number);
    const at = zonedToUtc(y, m, d, hh, mm, s.timezone);
    return at.getTime() > after.getTime() ? at : null;
  }

  const start = localDate(after, s.timezone);
  for (let i = 0; i < 15; i++) {
    const day = new Date(Date.UTC(start.y, start.m - 1, start.d + i)); // calendar arithmetic only
    const dow = day.getUTCDay();
    const ok =
      s.kind === "daily" ||
      (s.kind === "weekdays" && dow >= 1 && dow <= 5) ||
      (s.kind === "weekly" && (s.weekdays ?? []).includes(dow));
    if (!ok) continue;
    const at = zonedToUtc(day.getUTCFullYear(), day.getUTCMonth() + 1, day.getUTCDate(), hh, mm, s.timezone);
    if (at.getTime() > after.getTime()) return at;
  }
  return null;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export function describe(s: ScheduleSpec): string {
  switch (s.kind) {
    case "once": return `Once, ${s.local_date} at ${s.local_time}`;
    case "daily": return `Every day at ${s.local_time}`;
    case "weekdays": return `Weekdays at ${s.local_time}`;
    case "weekly": return `${(s.weekdays ?? []).map((d) => DAYS[d]).join(", ")} at ${s.local_time}`;
  }
}
