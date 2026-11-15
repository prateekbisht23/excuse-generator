"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "prateek-design-system";
import { Select } from "@/components/Select";
import { destinationLine, providerName } from "@/lib/providers";

export type ComposeTarget = { id: string; label: string; provider: string; account: string | null; sentBefore: boolean };
const REASONS = [["wfh", "Working from home"], ["leave", "On leave"], ["late", "Running late"]] as const;

export function Compose({ targets }: { targets: ComposeTarget[] }) {
  const router = useRouter();
  const [targetId, setTargetId] = useState(targets[0]?.id ?? "");
  const [reason, setReason] = useState<string>("wfh");
  const [text, setText] = useState("");
  const [excuse, setExcuse] = useState("");
  const [source, setSource] = useState<"ai" | "bank" | "manual">("bank");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [note, setNote] = useState<{ kind: "ok" | "error" | "info"; msg: string } | null>(null);
  const seq = useRef(0);

  const target = targets.find((t) => t.id === targetId) ?? targets[0];

  const generate = useCallback(async (tid: string, rsn: string, avoid: string[] = []) => {
    if (!tid) return;
    const mine = ++seq.current;
    setLoading(true); setConfirming(false);
    try {
      const res = await fetch("/api/excuses/generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetId: tid, reason: rsn, avoid }),
      });
      const json = await res.json();
      if (mine !== seq.current) return; // a newer request replaced this one
      if (!res.ok) { setNote({ kind: "error", msg: json.error ?? "Could not write an excuse." }); return; }
      setText(json.text); setExcuse(json.excuse); setSource(json.source);
      setNote(json.note ? { kind: "info", msg: json.note } : null);
    } finally {
      if (mine === seq.current) setLoading(false);
    }
  }, []);

  // First excuse on load; later ones come from the handlers below.
  useEffect(() => {
    const t = setTimeout(() => generate(targets[0]?.id ?? "", "wfh"), 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pickTarget(id: string) { setTargetId(id); generate(id, reason); }
  function pickReason(r: string) { setReason(r); generate(targetId, r); }

  async function send() {
    if (!target) return;
    if (!target.sentBefore && !confirming) { setConfirming(true); return; }
    setSending(true); setNote(null);
    const res = await fetch("/api/send", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetId, text, reason, source }),
    });
    const json = await res.json();
    setSending(false); setConfirming(false);
    if (!res.ok) return setNote({ kind: "error", msg: `Not sent: ${json.error}` });
    setNote({ kind: "ok", msg: `Sent to ${target.label}.` });
    router.refresh();
  }

  return (
    <div className="ex-block">
      <div>
        <label className="ex-label" htmlFor="ex-target">Send to</label>
        <Select
          id="ex-target" value={targetId} onChange={pickTarget}
          options={targets.map((t) => ({
            value: t.id, label: t.label, hint: providerName(t.provider),
            group: `${providerName(t.provider)}${t.account ? ` · ${t.account}` : ""}`,
          }))}
        />
        {target ? <p className="ex-hint">→ {destinationLine(target.provider, target.label, target.account)}</p> : null}
      </div>

      <div>
        <span className="ex-label" id="ex-why">Why</span>
        <div className="ex-seg" role="group" aria-labelledby="ex-why">
          {REASONS.map(([v, l]) => (
            <button key={v} type="button" aria-pressed={reason === v} onClick={() => pickReason(v)}>{l}</button>
          ))}
        </div>
      </div>

      <div>
        <div className="ex-row-between">
          <label className="ex-label" htmlFor="ex-text" style={{ margin: 0 }}>Message</label>
          <Button variant="text" onClick={() => generate(targetId, reason, excuse ? [excuse] : [])} disabled={loading || sending}>
            {loading ? "Writing" : "Another excuse"}
          </Button>
        </div>
        <textarea
          id="ex-text" className="ex-field" value={text} rows={3} maxLength={1000}
          placeholder={loading ? "Writing an excuse. This takes a few seconds." : ""}
          style={{ marginTop: "var(--space-2)", opacity: loading ? 0.5 : 1 }}
          onChange={(e) => { setText(e.target.value); setSource("manual"); setConfirming(false); }}
        />
        <p className="ex-meta" style={{ margin: "var(--space-2) 0 0" }}>
          {source === "ai" ? "Written by AI" : source === "bank" ? "From the built-in list" : "Edited by you"}
        </p>
      </div>

      <div className="pk-row" style={{ alignItems: "center" }}>
        <Button variant="solid" onClick={send} disabled={sending || loading || !text.trim()}>
          {sending ? "Sending" : confirming ? `Confirm: send to ${target?.label}` : `Send to ${target?.label}`}
        </Button>
        {confirming ? <Button variant="text" onClick={() => setConfirming(false)}>Cancel</Button> : null}
      </div>
      {confirming ? <p className="ex-note">This is your first message to {target?.label}. Check it reads the way you want, then confirm.</p> : null}
      {note ? <p className={note.kind === "error" ? "ex-error" : "ex-note"} role="status">{note.msg}</p> : null}
    </div>
  );
}
