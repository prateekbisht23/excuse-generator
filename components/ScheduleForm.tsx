"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "prateek-design-system";

type T = { id: string; label: string };
const REASONS = [["wfh", "Working from home"], ["leave", "On leave"], ["late", "Running late"]] as const;
const KINDS = [["once", "Once"], ["daily", "Every day"], ["weekdays", "Weekdays"], ["weekly", "Weekly"]] as const;
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function browserZone() {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; } catch { return "UTC"; }
}
function zones(): string[] {
  try { return (Intl as unknown as { supportedValuesOf: (k: string) => string[] }).supportedValuesOf("timeZone"); } catch { return ["UTC"]; }
}
function tomorrow() {
  const d = new Date(Date.now() + 86_400_000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function ScheduleForm({ targets }: { targets: T[] }) {
  const router = useRouter();
  const [targetId, setTargetId] = useState(targets[0]?.id ?? "");
  const [reason, setReason] = useState<string>("wfh");
  const [kind, setKind] = useState<string>("weekdays");
  const [time, setTime] = useState("09:00");
  const [date, setDate] = useState(tomorrow);
  const [days, setDays] = useState<number[]>([1]);
  const [tz, setTz] = useState(browserZone);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; msg: string } | null>(null);

  async function save() {
    setBusy(true); setNote(null);
    const res = await fetch("/api/schedules", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetId, reason, kind, local_time: time, local_date: kind === "once" ? date : null, weekdays: days, timezone: tz }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) return setNote({ ok: false, msg: json.error });
    setNote({ ok: true, msg: "Scheduled." });
    router.refresh();
  }

  return (
    <div className="ex-block">
      <div>
        <label className="ex-label" htmlFor="sf-target">Where</label>
        <select id="sf-target" className="ex-field" value={targetId} onChange={(e) => setTargetId(e.target.value)}>
          {targets.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
      </div>
      <div>
        <span className="ex-label" id="sf-why">Why</span>
        <div className="ex-seg" role="group" aria-labelledby="sf-why">
          {REASONS.map(([v, l]) => <button key={v} type="button" aria-pressed={reason === v} onClick={() => setReason(v)}>{l}</button>)}
        </div>
      </div>
      <div>
        <span className="ex-label" id="sf-when">How often</span>
        <div className="ex-seg" role="group" aria-labelledby="sf-when">
          {KINDS.map(([v, l]) => <button key={v} type="button" aria-pressed={kind === v} onClick={() => setKind(v)}>{l}</button>)}
        </div>
      </div>
      {kind === "weekly" ? (
        <div>
          <span className="ex-label" id="sf-days">On</span>
          <div className="ex-seg" role="group" aria-labelledby="sf-days" style={{ gap: "var(--space-4)" }}>
            {DAYS.map((d, i) => (
              <button key={d} type="button" aria-pressed={days.includes(i)}
                onClick={() => setDays((cur) => cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i])}>{d}</button>
            ))}
          </div>
        </div>
      ) : null}
      <div className="pk-row" style={{ alignItems: "flex-end", gap: "var(--space-4)" }}>
        {kind === "once" ? (
          <div><label className="ex-label" htmlFor="sf-date">Date</label>
            <input id="sf-date" type="date" className="ex-field" value={date} onChange={(e) => setDate(e.target.value)} /></div>
        ) : null}
        <div><label className="ex-label" htmlFor="sf-time">Time</label>
          <input id="sf-time" type="time" className="ex-field" value={time} onChange={(e) => setTime(e.target.value)} /></div>
      </div>
      <div>
        <label className="ex-label" htmlFor="sf-tz">Time zone</label>
        <select id="sf-tz" className="ex-field" value={tz} onChange={(e) => setTz(e.target.value)}>
          {(zones().includes(tz) ? zones() : [tz, ...zones()]).map((z) => <option key={z} value={z}>{z}</option>)}
        </select>
      </div>
      <div className="pk-row">
        <Button variant="solid" onClick={save} disabled={busy || !targetId}>{busy ? "Scheduling" : "Schedule"}</Button>
      </div>
      <p className="ex-note">A fresh excuse is written each time it sends, in your style. A run that is more than 30 minutes late is skipped, not sent.</p>
      {note ? <p className={note.ok ? "ex-note" : "ex-error"} role="status">{note.msg}</p> : null}
    </div>
  );
}
