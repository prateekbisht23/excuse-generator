import { decrypt } from "@/lib/crypto";
import type { createClient } from "@/lib/supabase/server";

type Supa = Awaited<ReturnType<typeof createClient>>;

/** Decrypts the Slack user token of a connection the signed-in user owns (RLS enforces ownership). */
export async function slackTokenFor(supabase: Supa, connectionId: string): Promise<string | null> {
  const { data } = await supabase
    .from("connections")
    .select("encrypted_tokens")
    .eq("id", connectionId)
    .eq("provider", "slack")
    .maybeSingle();
  if (!data) return null;
  return (JSON.parse(decrypt(data.encrypted_tokens)) as { access_token: string }).access_token;
}
