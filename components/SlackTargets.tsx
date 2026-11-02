"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "prateek-design-system";

type Target = { id: string; label: string; template: string };
type Channel = { id: string; name: string; isPrivate: boolean };

export function SlackTargets({ connectionId, targets }: { connectionId: string; targets: Target[] }) {
  const router = useRouter();
  const [channels, setChannels] = useState<Channel[] | null>(null);
  const [selected, setSelected] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    setBusy(true); setNote(null);
    const res = await fetch(`/api/slack/channels?connectionId=${connectionId}`);
    const json = await res.json();
    setBusy(false);
    if (!res.ok) return setNote(`Could not load channels: ${json.error}`);
    setChannels(json.channels);
    setSelected(json.channels[0]?.id ?? "");
  }

  async function add() {
    const ch = channels?.find((c) => c.id === selected);
    if (!ch) return;
    setBusy(true);
    const res = await fetch("/api/targets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ connectionId, externalId: ch.id, label: `#${ch.name}` }),
    });
    setBusy(false);
    if (!res.ok) return setNote("Could not save that channel.");
    setChannels(null);
    router.refresh();
  }

  async function test(id: string) {
    setBusy(true); setNote(null);
    const res = await fetch(`/api/targets/${id}/test`, { method: "POST" });
    const json = await res.json();
    setBusy(false);
    setNote(res.ok ? "Test message sent." : `Could not send: ${json.error}`);
  }

  return (
    <div className="ex-stack" style={{ gap: "var(--space-3)" }}>
      {targets.map((t) => (
        <div key={t.id} className="ex-fact">
          <dt style={{ color: "var(--ink)" }}>{t.label}</dt>
          <dd><Button variant="text" onClick={() => test(t.id)} disabled={busy}>Send test</Button></dd>
        </div>
      ))}
      {channels ? (
        <div className="pk-row">
          <select className="ex-select" value={selected} onChange={(e) => setSelected(e.target.value)} aria-label="Channel">
            {channels.map((c) => <option key={c.id} value={c.id}>{c.isPrivate ? "private · " : "#"}{c.name}</option>)}
          </select>
          <Button variant="ghost" onClick={add} disabled={busy || !selected}>Add channel</Button>
        </div>
      ) : (
        <div><Button variant="ghost" onClick={load} disabled={busy}>Add a channel</Button></div>
      )}
      {note ? <p className="ex-note" role="status">{note}</p> : null}
    </div>
  );
}
