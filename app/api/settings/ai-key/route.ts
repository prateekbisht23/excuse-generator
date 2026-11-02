import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { encrypt } from "@/lib/crypto";
import { complete, PROVIDERS, type Provider } from "@/lib/ai";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await request.json()) as { provider?: string; key?: string };
  const provider = PROVIDERS.find((p) => p === body.provider) as Provider | undefined;
  const key = body.key?.trim();
  if (!provider || !key || key.length < 16 || key.length > 400) {
    return NextResponse.json({ error: "Choose a provider and paste a valid key." }, { status: 400 });
  }
  // Prove the key works before storing it.
  try {
    await complete(provider, key, { system: "Reply with one word.", user: "Say ok.", maxTokens: 20 });
  } catch {
    return NextResponse.json({ error: "That key was rejected by the provider." }, { status: 400 });
  }
  const { error } = await supabase.from("ai_keys").upsert({ user_id: user.id, provider, encrypted_key: encrypt(key) });
  if (error) return NextResponse.json({ error: "Could not save the key." }, { status: 500 });
  return NextResponse.json({ ok: true, provider });
}

export async function DELETE() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  await supabase.from("ai_keys").delete().eq("user_id", user.id);
  return NextResponse.json({ ok: true });
}
