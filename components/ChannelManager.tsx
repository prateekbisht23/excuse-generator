"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "prateek-design-system";

export type ManagedTarget = { id: string; label: string; templates: Record<string, string>; learned: boolean };
const REASONS = [["wfh", "Working from home"], ["leave", "On leave"], ["late", "Running late"]] as const;
type Channel = { id: string; name: string; isPrivate: boolean };

export function ChannelManager({ connectionId, targets, provider = "slack" }: { connectionId: string; targets: ManagedTarget[]; provider?: "slack" | "gmail" }) {
  const isEmail = provider === "gmail";
  const [email, setEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const router = useRouter();
  const [channels, setChannels] = useState<Channel[] | null>(null);
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const say = (id: string, msg: string) => setNotes((n) => ({ ...n, [id]: msg }));

  async function load() {
    setBusy("add"); say("add", "");
    const res = await fetch(`/api/slack/channels?connectionId=${connectionId}`);
    const json = await res.json();
    setBusy(null);
    if (!res.ok) return say("add", `Could not load channels: ${json.error}`);
    const taken = new Set(targets.map((t) => t.label));
    const list: Channel[] = json.channels.filter((c: Channel) => !taken.has(`#${c.name}`));
    setChannels(list); setSelected(list[0]?.id ?? "");
    if (!list.length) say("add", "No more channels to add. You can only add channels you are a member of.");
  }

  async function add() {
    const ch = channels?.find((c) => c.id === selected);
    if (!ch) return;
    setBusy("add");
    const res = await fetch("/api/targets", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ connectionId, externalId: ch.id, label: `#${ch.name}` }),
    });
    setBusy(null);
    if (!res.ok) return say("add", "Could not save that channel.");
    setChannels(null); router.refresh();
  }

  async function addEmail() {
    const address = email.trim();
    if (!address) return;
    setBusy("add"); say("add", "");
    const res = await fetch("/api/targets", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ connectionId, externalId: address, label: address, kind: "email" }),
    });
    const json = await res.json();
    setBusy(null);
    if (!res.ok) return say("add", json.error ?? "Could not save that address.");
    setEmail(""); setAdding(false); router.refresh();
  }

  async function saveTemplate(id: string, reason: string, value: string, original: string) {
    if (value.trim() === original) return;
    const res = await fetch(`/api/targets/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason, template: value }),
    });
    say(id, res.ok ? "Template saved." : "Could not save the template.");
    if (res.ok) router.refresh();
  }

  async function learn(id: string) {
    setBusy(id); say(id, "");
    const res = await fetch(`/api/targets/${id}/persona`, { method: "POST" });
    const json = await res.json();
    setBusy(null);
    if (!res.ok) return say(id, json.error);
    say(id, `Learned from ${json.samples} of your messages: ${json.persona.tone}.`);
    router.refresh();
  }

  async function remove(id: string) {
    setBusy(id);
    await fetch(`/api/targets/${id}`, { method: "DELETE" });
    setBusy(null); router.refresh();
  }

  return (
    <div className="ex-block" style={{ gap: "var(--space-4)" }}>
      <div className="ex-channels">
        {targets.map((t) => (
          <div key={t.id} className="ex-chan">
            <div className="ex-row-between">
              <span className="t-body">{t.label}</span>
              <span className="pk-row">
                {isEmail ? null : (
                  <Button variant="text" onClick={() => learn(t.id)} disabled={busy === t.id}>
                    {busy === t.id ? "Reading" : t.learned ? "Relearn my style" : "Learn my style"}
                  </Button>
                )}
                <Button variant="text" onClick={() => remove(t.id)} disabled={busy === t.id}>Remove</Button>
              </span>
            </div>
            <div className="ex-block" style={{ gap: "var(--space-3)" }}>
              <span className="ex-label" style={{ margin: 0 }}>Messages. Put {"{excuse}"} where the excuse goes.</span>
              {REASONS.map(([v, l]) => (
                <div key={v}>
                  <label className="ex-meta" htmlFor={`tpl-${t.id}-${v}`}>{l}</label>
                  <input
                    id={`tpl-${t.id}-${v}`} className="ex-field" defaultValue={t.templates[v]} maxLength={500}
                    style={{ marginTop: "var(--space-1)" }}
                    onBlur={(e) => saveTemplate(t.id, v, e.target.value, t.templates[v])}
                  />
                </div>
              ))}
            </div>
            {isEmail ? null : <p className="ex-meta" style={{ margin: 0 }}>{t.learned ? "writes in your style" : "no style learned yet"}</p>}
            {notes[t.id] ? <p className="ex-note" role="status">{notes[t.id]}</p> : null}
          </div>
        ))}
      </div>

      {isEmail ? (
        adding ? (
          <div className="pk-row" style={{ flexWrap: "wrap" }}>
            <input
              type="email" className="ex-field" style={{ flex: 1, minWidth: 180, width: "auto" }} placeholder="manager@company.com"
              value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addEmail()} aria-label="Email address" autoFocus
            />
            <Button variant="solid" onClick={addEmail} disabled={busy === "add" || !email.trim()}>Add recipient</Button>
            <Button variant="text" onClick={() => { setAdding(false); setEmail(""); }}>Cancel</Button>
          </div>
        ) : (
          <div><Button variant="ghost" onClick={() => setAdding(true)}>Add a recipient</Button></div>
        )
      ) : channels && channels.length ? (
        <div className="pk-row" style={{ flexWrap: "wrap" }}>
          <select className="ex-field" style={{ flex: 1, minWidth: 180, width: "auto" }} value={selected} onChange={(e) => setSelected(e.target.value)} aria-label="Channel">
            {channels.map((c) => <option key={c.id} value={c.id}>{c.isPrivate ? "private · " : "#"}{c.name}</option>)}
          </select>
          <Button variant="solid" onClick={add} disabled={busy === "add" || !selected}>Add channel</Button>
          <Button variant="text" onClick={() => setChannels(null)}>Cancel</Button>
        </div>
      ) : (
        <div><Button variant="ghost" onClick={load} disabled={busy === "add"}>{busy === "add" ? "Loading channels" : "Add a channel"}</Button></div>
      )}
      {notes.add ? <p className="ex-note" role="status">{notes.add}</p> : null}
    </div>
  );
}
