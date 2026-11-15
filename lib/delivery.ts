import type { SupabaseClient } from "@supabase/supabase-js";
import { decrypt } from "@/lib/crypto";
import { sendMessage } from "@/lib/connectors/slack";
import { sendEmail } from "@/lib/connectors/gmail";

const SUBJECTS: Record<string, string> = {
  wfh: "Working from home today",
  leave: "On leave today",
  late: "Running late today",
  test: "Test message from Excuse generator",
};

/**
 * Sends text to a target through whichever provider its connection belongs to.
 * Works with the user's client (RLS checks ownership) or the admin client (scheduler).
 */
export async function deliver(supabase: SupabaseClient, connectionId: string, externalId: string, text: string, reason: string) {
  const { data: conn } = await supabase
    .from("connections").select("provider, external_account, encrypted_tokens").eq("id", connectionId).maybeSingle();
  if (!conn) throw new Error("connection not found");
  const tokens = JSON.parse(decrypt(conn.encrypted_tokens)) as { access_token?: string; refresh_token?: string };

  if (conn.provider === "slack") {
    await sendMessage(tokens.access_token!, externalId, text);
  } else if (conn.provider === "gmail") {
    await sendEmail(tokens.refresh_token!, conn.external_account, externalId, SUBJECTS[reason] ?? SUBJECTS.wfh, text);
  } else {
    throw new Error(`unsupported provider ${conn.provider}`);
  }
}
