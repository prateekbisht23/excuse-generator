"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "prateek-design-system";

export function AiKeyForm({ current }: { current: string | null }) {
  const router = useRouter();
  const [provider, setProvider] = useState("gemini");
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function save() {
    setBusy(true); setNote(null);
    const res = await fetch("/api/settings/ai-key", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider, key }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) return setNote(json.error);
    setKey(""); setNote("Key saved."); router.refresh();
  }

  async function remove() {
    setBusy(true);
    await fetch("/api/settings/ai-key", { method: "DELETE" });
    setBusy(false); setNote("Key removed. I will use the shared AI again."); router.refresh();
  }

  return (
    <div className="ex-stack" style={{ gap: "var(--space-3)" }}>
      <p className="t-body" style={{ margin: 0 }}>
        {current ? <>Using your own <strong style={{ fontWeight: 500 }}>{current}</strong> key.</> : "Using the shared AI, with a limit of 20 an hour."}
      </p>
      <div className="pk-row" style={{ flexWrap: "wrap" }}>
        <select className="ex-select" value={provider} onChange={(e) => setProvider(e.target.value)} aria-label="Provider">
          <option value="gemini">Gemini</option>
          <option value="anthropic">Anthropic</option>
          <option value="openai">OpenAI</option>
        </select>
        <input className="ex-select" type="password" autoComplete="off" placeholder="Paste an API key" value={key}
          onChange={(e) => setKey(e.target.value)} aria-label="API key" style={{ flex: 1, minWidth: 200 }} />
        <Button variant="ghost" onClick={save} disabled={busy || key.length < 16}>Save key</Button>
        {current ? <Button variant="text" onClick={remove} disabled={busy}>Remove</Button> : null}
      </div>
      <p className="ex-note">Your key is encrypted before it is stored, and only used to write your excuses. I check it works before saving.</p>
      {note ? <p className="ex-note" role="status">{note}</p> : null}
    </div>
  );
}
