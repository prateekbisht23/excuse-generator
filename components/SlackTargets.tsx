"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "prateek-design-system";

type Target = { id: string; label: string; template: string; learned: boolean };
type Preview = { text: string; excuse: string; source: "ai" | "bank"; note?: string };
const REASONS = [["wfh", "Working from home"], ["leave", "On leave"], ["late", "Running late"]] as const;
type Channel = { id: string; name: string; isPrivate: boolean };

export function SlackTargets({ connectionId, targets }: { connectionId: string; targets: Target[] }) {
  const router = useRouter();
  const [channels, setChannels] = useState<Channel[] | null>(null);
  const [selected, setSelected] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState<string>("wfh");
  const [previews, setPreviews] = useState<Record<string, Preview>>({});

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

  async function preview(id: string) {
    setBusy(true); setNote(null);
    const res = await fetch("/api/excuses/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetId: id, reason, avoid: previews[id] ? [previews[id].excuse] : [] }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) return setNote(`Could not generate: ${json.error}`);
    setPreviews((p) => ({ ...p, [id]: json }));
  }

  async function learn(id: string) {
    setBusy(true); setNote(null);
    const res = await fetch(`/api/targets/${id}/persona`, { method: "POST" });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) return setNote(json.error);
    setNote(`Learned your style from ${json.samples} messages: ${json.persona.tone}.`);
    router.refresh();
  }

  return (
    <div className="ex-stack" style={{ gap: "var(--space-3)" }}>
      {targets.length ? (
        <select className="ex-select" value={reason} onChange={(e) => setReason(e.target.value)} aria-label="Reason" style={{ alignSelf: "flex-start" }}>
          {REASONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      ) : null}
      {targets.map((t) => (
        <div key={t.id} style={{ borderBottom: "1px solid var(--line)", paddingBottom: "var(--space-3)" }}>
          <div className="pk-row" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
            <span className="t-body">{t.label} <span className="t-meta" style={{ color: "var(--ink-muted)" }}>· {t.learned ? "style learned" : "no style yet"}</span></span>
            <span className="pk-row">
              <Button variant="text" onClick={() => preview(t.id)} disabled={busy}>Preview excuse</Button>
              <Button variant="text" onClick={() => learn(t.id)} disabled={busy}>{t.learned ? "Relearn style" : "Learn my style"}</Button>
              <Button variant="text" onClick={() => test(t.id)} disabled={busy}>Send test</Button>
            </span>
          </div>
          {previews[t.id] ? (
            <p className="t-body" style={{ margin: "var(--space-2) 0 0" }}>
              {previews[t.id].text}
              <span className="t-meta" style={{ color: "var(--ink-muted)" }}> · {previews[t.id].source === "ai" ? "written by AI" : "from the built-in list"}</span>
              {previews[t.id].note ? <span className="ex-note" style={{ display: "block" }}>{previews[t.id].note}</span> : null}
            </p>
          ) : null}
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
