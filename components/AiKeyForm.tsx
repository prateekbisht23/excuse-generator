"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "prateek-design-system";
import { Select } from "@/components/Select";

const PROVIDERS = [
  { value: "gemini", label: "Google Gemini", site: "aistudio.google.com" },
  { value: "anthropic", label: "Anthropic Claude", site: "console.anthropic.com" },
  { value: "openai", label: "OpenAI", site: "platform.openai.com" },
];

export function AiKeyForm({ current }: { current: string | null }) {
  const router = useRouter();
  const [mode, setMode] = useState<"shared" | "own">(current ? "own" : "shared");
  const [provider, setProvider] = useState(current ?? "gemini");
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ msg: string; err?: boolean } | null>(null);
  const currentLabel = PROVIDERS.find((p) => p.value === current)?.label ?? current;

  async function save() {
    setBusy(true); setNote(null);
    const res = await fetch("/api/settings/ai-key", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider, key }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) return setNote({ msg: json.error, err: true });
    setKey(""); setNote({ msg: "Key checked and saved." }); router.refresh();
  }

  async function useShared() {
    setMode("shared");
    if (!current) return;
    setBusy(true);
    await fetch("/api/settings/ai-key", { method: "DELETE" });
    setBusy(false); setNote({ msg: "Your key was removed. Using the built-in AI." }); router.refresh();
  }

  return (
    <div className="ex-block" style={{ gap: "var(--space-4)" }}>
      <div className="ex-choice" role="radiogroup" aria-label="AI source">
        <label>
          <input type="radio" name="ai" checked={mode === "shared"} onChange={useShared} disabled={busy} />
          <span>
            <strong>Built-in AI {mode === "shared" ? <span className="ex-tag on" style={{ marginLeft: 8 }}>In use</span> : null}</strong>
            <small>Free, nothing to set up. Up to 20 excuses an hour.</small>
          </span>
        </label>
        <label>
          <input type="radio" name="ai" checked={mode === "own"} onChange={() => setMode("own")} disabled={busy} />
          <span>
            <strong>Your own API key {current ? <span className="ex-tag on" style={{ marginLeft: 8 }}>{currentLabel}</span> : null}</strong>
            <small>No hourly limit. Works with Gemini, Claude or OpenAI.</small>
          </span>
        </label>
      </div>

      {mode === "own" ? (
        <div className="ex-block" style={{ gap: "var(--space-3)" }}>
          <div className="ex-form-row">
            <div>
              <label className="ex-label" htmlFor="ai-provider">Provider</label>
              <Select id="ai-provider" value={provider} onChange={setProvider} options={PROVIDERS.map(({ value, label }) => ({ value, label }))} />
            </div>
            <div className="wide">
              <label className="ex-label" htmlFor="ai-key">{current ? "Replace key" : "API key"}</label>
              <input id="ai-key" className="ex-input" type="password" autoComplete="off" placeholder={current ? "Paste a new key to replace it" : "Paste your API key"}
                value={key} onChange={(e) => setKey(e.target.value)} onKeyDown={(e) => e.key === "Enter" && key.length >= 16 && save()} />
            </div>
          </div>
          <div className="pk-row" style={{ alignItems: "center" }}>
            <Button variant="solid" onClick={save} disabled={busy || key.length < 16}>{busy ? "Checking key" : "Save key"}</Button>
            {current ? <Button variant="text" onClick={useShared} disabled={busy}>Remove key</Button> : null}
          </div>
          <p className="ex-note">
            Get a key at <a href={`https://${PROVIDERS.find((p) => p.value === provider)?.site}`} target="_blank" rel="noreferrer" style={{ color: "var(--ink)" }}>{PROVIDERS.find((p) => p.value === provider)?.site} ↗</a>.
            I test it with the provider before saving. It is encrypted at rest and only used to write your excuses.
          </p>
        </div>
      ) : null}
      {note ? <p className={note.err ? "ex-error" : "ex-note"} role="status">{note.msg}</p> : null}
    </div>
  );
}
