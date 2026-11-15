"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "prateek-design-system";

type Props = { id: string; when: string; target: string; provider: string; reason: string; next: string | null; zone: string; active: boolean; finished: boolean };

export function ScheduleRow({ id, when, target, provider, reason, next, zone, active, finished }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function toggle() {
    setBusy(true); setErr(null);
    const res = await fetch(`/api/schedules/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: !active }) });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) return setErr(json.error);
    router.refresh();
  }
  async function remove() {
    if (!confirm("Delete this schedule?")) return;
    setBusy(true);
    await fetch(`/api/schedules/${id}`, { method: "DELETE" });
    setBusy(false); router.refresh();
  }

  const state = finished ? "Done" : active ? "Active" : "Paused";
  return (
    <div className={`ex-sched ${active && !finished ? "" : "off"}`}>
      <div className="ex-sched-top">
        <div>
          <div className="ex-sched-when">{when}</div>
          <div className="ex-note">{reason} → {target}{provider ? ` · ${provider}` : ""}</div>
        </div>
        <span className={`ex-tag ${state === "Active" ? "on" : ""}`}>{state}</span>
      </div>
      <div className="ex-row-between" style={{ alignItems: "center" }}>
        <span className="ex-meta">{next ? `Next: ${next}` : finished ? "Already sent" : active ? "No runs left" : "Paused"} · {zone}</span>
        <span className="pk-row" style={{ gap: 0 }}>
          {finished ? null : <Button variant="text" onClick={toggle} disabled={busy}>{active ? "Pause" : "Resume"}</Button>}
          <Button variant="text" onClick={remove} disabled={busy}>Delete</Button>
        </span>
      </div>
      {err ? <p className="ex-error" role="status">{err}</p> : null}
    </div>
  );
}
