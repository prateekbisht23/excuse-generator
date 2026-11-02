"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "prateek-design-system";

export function ScheduleRow({ id, title, detail, active, finished }: { id: string; title: string; detail: string; active: boolean; finished: boolean }) {
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
    setBusy(true);
    await fetch(`/api/schedules/${id}`, { method: "DELETE" });
    setBusy(false); router.refresh();
  }

  return (
    <div>
      <div className="ex-row-between">
        <span className="t-body" style={{ color: active ? "var(--ink)" : "var(--ink-muted)" }}>{title}</span>
        <span className="pk-row">
          {finished ? null : <Button variant="text" onClick={toggle} disabled={busy}>{active ? "Pause" : "Resume"}</Button>}
          <Button variant="text" onClick={remove} disabled={busy}>Delete</Button>
        </span>
      </div>
      <p className="ex-meta" style={{ margin: "var(--space-1) 0 0" }}>{detail}</p>
      {err ? <p className="ex-error" role="status">{err}</p> : null}
    </div>
  );
}
