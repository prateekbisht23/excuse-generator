import { decrypt } from "@/lib/crypto";
import type { createClient } from "@/lib/supabase/server";
import type { Brain } from "@/lib/excuses/generate";
import type { Provider } from "@/lib/ai";

type Supa = Awaited<ReturnType<typeof createClient>>;
const HOURLY_LIMIT = 20;

/** The user's own key if they added one, otherwise the shared Gemini key within a per-user hourly limit. */
export async function resolveBrain(supabase: Supa, userId: string): Promise<{ brain: Brain | null; note?: string }> {
  const { data: own } = await supabase.from("ai_keys").select("provider, encrypted_key").maybeSingle();
  if (own) return { brain: { provider: own.provider as Provider, key: decrypt(own.encrypted_key) } };

  const shared = process.env.GEMINI_API_KEY;
  if (!shared) return { brain: null, note: "No AI key is configured, so I used the built-in list." };

  const since = new Date(Date.now() - 3600_000).toISOString();
  const { count } = await supabase
    .from("ai_usage").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("created_at", since);
  if ((count ?? 0) >= HOURLY_LIMIT) {
    return { brain: null, note: "Hourly limit reached on the shared AI, so I used the built-in list. Add your own key in Settings." };
  }
  await supabase.from("ai_usage").insert({ user_id: userId });
  return { brain: { provider: "gemini", key: shared } };
}
