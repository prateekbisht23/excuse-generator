export type Provider = "gemini" | "anthropic" | "openai";
export const PROVIDERS: Provider[] = ["gemini", "anthropic", "openai"];

type Req = { system: string; user: string; maxTokens: number; json?: boolean };

async function post(url: string, init: RequestInit) {
  const res = await fetch(url, { ...init, cache: "no-store", signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`${new URL(url).hostname} responded ${res.status}`);
  return res.json();
}

const impl: Record<Provider, (key: string, r: Req) => Promise<string>> = {
  async gemini(key, r) {
    const j = await post("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent", {
      method: "POST",
      headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: r.system }] },
        contents: [{ role: "user", parts: [{ text: r.user }] }],
        generationConfig: {
          maxOutputTokens: r.maxTokens,
          temperature: 1,
          thinkingConfig: { thinkingBudget: 0 },
          ...(r.json ? { responseMimeType: "application/json" } : {}),
        },
      }),
    });
    return j.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
  },
  async anthropic(key, r) {
    const j = await post("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-haiku-5-5", max_tokens: r.maxTokens, system: r.system,
        messages: [{ role: "user", content: r.user }],
      }),
    });
    return j.content?.map((c: { text?: string }) => c.text ?? "").join("") ?? "";
  },
  async openai(key, r) {
    const j = await post("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini", max_tokens: r.maxTokens,
        messages: [{ role: "system", content: r.system }, { role: "user", content: r.user }],
        ...(r.json ? { response_format: { type: "json_object" } } : {}),
      }),
    });
    return j.choices?.[0]?.message?.content ?? "";
  },
};

export function complete(provider: Provider, key: string, r: Req): Promise<string> {
  return impl[provider](key, r);
}
