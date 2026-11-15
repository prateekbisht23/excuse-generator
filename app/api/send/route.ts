import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { deliver } from "@/lib/delivery";
import { REASONS } from "@/lib/excuses/bank";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await request.json()) as { targetId?: string; text?: string; reason?: string; source?: string };
  const text = body.text?.trim();
  const reason = REASONS.find((r) => r.value === body.reason)?.value;
  if (!body.targetId || !text || !reason) return NextResponse.json({ error: "targetId, text and reason are required" }, { status: 400 });
  if (text.length > 1000) return NextResponse.json({ error: "That message is too long." }, { status: 400 });
  const source = body.source === "ai" || body.source === "bank" ? body.source : "manual";

  const { data: target } = await supabase
    .from("targets").select("connection_id, external_id, label").eq("id", body.targetId).maybeSingle();
  if (!target) return NextResponse.json({ error: "not found" }, { status: 404 });

  const log = (status: "sent" | "failed", error?: string) =>
    supabase.from("excuse_log").insert({
      user_id: user.id, target_id: body.targetId, target_label: target.label, reason, text, source, status, error: error ?? null,
    });

  try {
    await deliver(supabase, target.connection_id, target.external_id, text, reason);
    await log("sent");
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = (e as Error).message;
    await log("failed", msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
