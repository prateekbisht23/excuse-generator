"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "prateek-design-system";
import { Select } from "@/components/Select";

type T = { id: string; label: string; provider: string; account: string | null };
const REASONS = [["wfh", "Working from home"], ["leave", "On leave"], ["late", "Running late"]] as const;
const KINDS = [["once", "Once"], ["daily", "Every day"], ["weekdays", "Weekdays"], ["weekly", "Weekly"]] as const;
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const FULL_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const PROVIDER = { slack: "Slack", gmail: "Gmail" } as Record<string, string>;

function browserZone() {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; } catch { return "UTC"; }
}
function zones(): string[] {
  try { return (Intl as unknown as { supportedValuesOf: (k: string) => string[] }).supportedValuesOf("timeZone"); } catch { return ["UTC"]; }
}
function offset(tz: string) {
  try {
    return new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "shortOffset" }).formatToParts(new Date())
      .find((p) => p.type === "timeZoneName")?.value.replace("GMT", "UTC") ?? "";
  } catch { return ""; }
}
const RENAMED: Record<string, string> = { Calcutta: "Kolkata", Saigon: "Ho Chi Minh", Kiev: "Kyiv", Rangoon: "Yangon", Katmandu: "Kathmandu" };
function city(tz: string) { const c = tz.split("/").pop()!.replace(/_/g, " "); return RENAMED[c] ?? c; }
function tomorrow() {
  const d = new Date(Date.now() + 86_400_000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function niceTime(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}
function niceDate(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
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

  const zoneOptions = useMemo(() => {
    const all = zones();
    return (all.includes(tz) ? all : [tz, ...all]).map((z) => ({ value: z, label: city(z), hint: `${offset(z)} · ${z}` }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const target = targets.find((t) => t.id === targetId);
  const reasonLabel = REASONS.find(([v]) => v === reason)?.[1].toLowerCase();
  const howOften =
    kind === "once" ? <>on <b>{niceDate(date)}</b></>
    : kind === "daily" ? <>every day</>
    : kind === "weekdays" ? <>every weekday, Monday to Friday,</>
    : days.length ? <>every <b>{[...days].sort().map((d) => FULL_DAYS[d]).join(", ")}</b></> : <>on the days you pick</>;

  async function save() {
    setBusy(true); setNote(null);
    const res = await fetch("/api/schedules", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetId, reason, kind, local_time: time, local_date: kind === "once" ? date : null, weekdays: days, timezone: tz }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) return setNote({ ok: false, msg: json.error });
    setNote({ ok: true, msg: "Scheduled. It shows up under Upcoming." });
    router.refresh();
  }

  return (
    <div className="ex-block">
      <div>
        <label className="ex-label" htmlFor="sf-target">Send to</label>
        <Select
          id="sf-target" value={targetId} onChange={setTargetId}
          options={targets.map((t) => ({ value: t.id, label: t.label, hint: PROVIDER[t.provider] ?? t.provider, group: `${PROVIDER[t.provider] ?? t.provider}${t.account ? ` · ${t.account}` : ""}` }))}
        />
      </div>
      <div>
        <span className="ex-label" id="sf-why">Reason</span>
        <div className="ex-seg" role="group" aria-labelledby="sf-why">
          {REASONS.map(([v, l]) => <button key={v} type="button" aria-pressed={reason === v} onClick={() => setReason(v)}>{l}</button>)}
        </div>
      </div>
      <div>
        <span className="ex-label" id="sf-when">Repeat</span>
        <div className="ex-seg" role="group" aria-labelledby="sf-when">
          {KINDS.map(([v, l]) => <button key={v} type="button" aria-pressed={kind === v} onClick={() => setKind(v)}>{l}</button>)}
        </div>
      </div>
      {kind === "weekly" ? (
        <div>
          <span className="ex-label" id="sf-days">On these days</span>
          <div className="ex-seg days" role="group" aria-labelledby="sf-days">
            {DAYS.map((d, i) => (
              <button key={d} type="button" aria-pressed={days.includes(i)}
                onClick={() => setDays((cur) => cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i])}>{d}</button>
            ))}
          </div>
        </div>
      ) : null}
      <div className="ex-form-row">
        {kind === "once" ? (
          <div><label className="ex-label" htmlFor="sf-date">Date</label>
            <input id="sf-date" type="date" className="ex-input" value={date} onChange={(e) => setDate(e.target.value)} /></div>
        ) : null}
        <div><label className="ex-label" htmlFor="sf-time">Time</label>
          <input id="sf-time" type="time" className="ex-input" value={time} onChange={(e) => setTime(e.target.value)} /></div>
        <div className="wide"><label className="ex-label" htmlFor="sf-tz">Time zone</label>
          <Select id="sf-tz" value={tz} onChange={setTz} options={zoneOptions} searchable /></div>
      </div>

      <p className="ex-summary">
        A fresh {reasonLabel} excuse goes to <b>{target?.label ?? "…"}</b>{target ? ` on ${PROVIDER[target.provider] ?? target.provider}` : ""} {howOften} at <b>{niceTime(time)}</b> {city(tz)} time.
        A run more than 30 minutes late is skipped, not sent.
      </p>

      <div className="pk-row">
        <Button variant="solid" onClick={save} disabled={busy || !targetId || (kind === "weekly" && !days.length)}>{busy ? "Scheduling" : "Create schedule"}</Button>
      </div>
      {note ? <p className={note.ok ? "ex-note" : "ex-error"} role="status">{note.msg}</p> : null}
    </div>
  );
}
