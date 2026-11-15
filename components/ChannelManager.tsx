"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "prateek-design-system";
import { Select } from "@/components/Select";

export type ManagedTarget = { id: string; label: string; templates: Record<string, string>; learned: boolean };
const REASONS = [["wfh", "Working from home"], ["leave", "On leave"], ["late", "Running late"]] as const;
type Channel = { id: string; name: string; isPrivate: boolean };

/** The destinations (channels or email recipients) under one connected account. */
export function ChannelManager({ connectionId, targets, provider = "slack" }: { connectionId: string; targets: ManagedTarget[]; provider?: "slack" | "gmail" }) {
  const isEmail = provider === "gmail";
  const router = useRouter();
  const [channels, setChannels] = useState<Channel[] | null>(null);
  const [selected, setSelected] = useState("");
  const [email, setEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, { msg: string; err?: boolean }>>({});
  const say = (id: string, msg: string, err = false) => setNotes((n) => ({ ...n, [id]: { msg, err } }));

  async function startAdd() {
    say("add", "");
    if (isEmail) { setAdding(true); return; }
    setBusy("add");
    const res = await fetch(`/api/slack/channels?connectionId=${connectionId}`);
    const json = await res.json();
    setBusy(null);
    if (!res.ok) return say("add", `Could not load channels: ${json.error}`, true);
    const taken = new Set(targets.map((t) => t.label));
    const list: Channel[] = json.channels.filter((c: Channel) => !taken.has(`#${c.name}`));
    if (!list.length) return say("add", "No more channels to add. You can only add channels you are a member of.");
    setChannels(list); setSelected(list[0].id); setAdding(true);
  }

  function cancel() { setAdding(false); setChannels(null); setEmail(""); }

  async function add() {
    const body = isEmail
      ? { connectionId, externalId: email.trim(), label: email.trim(), kind: "email" }
      : (() => { const ch = channels?.find((c) => c.id === selected); return ch ? { connectionId, externalId: ch.id, label: `#${ch.name}` } : null; })();
    if (!body || !body.externalId) return;
    setBusy("add");
    const res = await fetch("/api/targets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const json = await res.json();
    setBusy(null);
    if (!res.ok) return say("add", json.error ?? "Could not save that.", true);
    cancel(); router.refresh();
  }

  async function saveTemplate(id: string, reason: string, value: string, original: string) {
    if (value.trim() === original) return;
    const res = await fetch(`/api/targets/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason, template: value }),
    });
    say(id, res.ok ? "Saved." : "Could not save the message.", !res.ok);
    if (res.ok) router.refresh();
  }

  async function learn(id: string) {
    setBusy(id); say(id, "");
    const res = await fetch(`/api/targets/${id}/persona`, { method: "POST" });
    const json = await res.json();
    setBusy(null);
    if (!res.ok) return say(id, json.error, true);
    say(id, `Learned from ${json.samples} of your messages: ${json.persona.tone}.`);
    router.refresh();
  }

  async function remove(id: string, label: string) {
    if (!confirm(`Remove ${label}? Its schedules are removed too.`)) return;
    setBusy(id);
    await fetch(`/api/targets/${id}`, { method: "DELETE" });
    setBusy(null); router.refresh();
  }

  const noun = isEmail ? "recipient" : "channel";
  return (
    <div className="ex-dests">
      {targets.length === 0 && !adding ? (
        <p className="ex-note">No {noun}s yet. Add one to start sending.</p>
      ) : null}

      {targets.map((t) => (
        <div key={t.id} className="ex-dest">
          <div className="ex-dest-head">
            <div className="ex-dest-title">
              <span className="t-body">{t.label}</span>
              <span>{isEmail ? "Email recipient" : t.learned ? "Slack channel · writes in your style" : "Slack channel"}</span>
            </div>
            <span className="pk-row" style={{ gap: 0 }}>
              <Button variant="text" onClick={() => setOpen(open === t.id ? null : t.id)} aria-expanded={open === t.id}>
                {open === t.id ? "Done" : "Edit messages"}
              </Button>
              {isEmail ? null : (
                <Button variant="text" onClick={() => learn(t.id)} disabled={busy === t.id}>
                  {busy === t.id ? "Reading" : t.learned ? "Relearn style" : "Learn my style"}
                </Button>
              )}
              <Button variant="text" onClick={() => remove(t.id, t.label)} disabled={busy === t.id}>Remove</Button>
            </span>
          </div>
          {open === t.id ? (
            <div className="ex-dest-body">
              <p className="ex-note">One message per reason. Put <code>{"{excuse}"}</code> where the excuse goes. Changes save when you leave a field.</p>
              {REASONS.map(([v, l]) => (
                <div key={v}>
                  <label className="ex-label" htmlFor={`tpl-${t.id}-${v}`}>{l}</label>
                  <input
                    id={`tpl-${t.id}-${v}`} className="ex-input sm" defaultValue={t.templates[v]} maxLength={500}
                    onBlur={(e) => saveTemplate(t.id, v, e.target.value, t.templates[v])}
                  />
                </div>
              ))}
            </div>
          ) : null}
          {notes[t.id]?.msg ? <p className={notes[t.id].err ? "ex-error" : "ex-note"} role="status" style={{ padding: "0 var(--space-4) var(--space-3)" }}>{notes[t.id].msg}</p> : null}
        </div>
      ))}

      {adding ? (
        <div className="ex-add-row">
          {isEmail ? (
            <input
              type="email" className="ex-input sm" placeholder="manager@company.com" value={email} autoFocus
              onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} aria-label="Email address"
            />
          ) : (
            <Select
              size="sm" ariaLabel="Channel" value={selected} onChange={setSelected} searchable={(channels?.length ?? 0) > 8}
              options={(channels ?? []).map((c) => ({ value: c.id, label: `#${c.name}`, hint: c.isPrivate ? "private" : undefined }))}
            />
          )}
          <Button variant="solid" onClick={add} disabled={busy === "add" || (isEmail ? !email.trim() : !selected)}>Add {noun}</Button>
          <Button variant="text" onClick={cancel}>Cancel</Button>
        </div>
      ) : (
        <div><Button variant="ghost" onClick={startAdd} disabled={busy === "add"}>{busy === "add" ? "Loading channels" : `Add a ${noun}`}</Button></div>
      )}
      {notes.add?.msg ? <p className={notes.add.err ? "ex-error" : "ex-note"} role="status">{notes.add.msg}</p> : null}
    </div>
  );
}
