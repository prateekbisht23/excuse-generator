import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { slackTokenFor } from "@/lib/connections";
import { fetchOwnMessages } from "@/lib/connectors/slack";
import { resolveBrain } from "@/lib/ai/resolve";
import { buildPersona } from "@/lib/excuses/generate";

/** Learn the user's writing style from their own past messages in this channel. */
export async function POST(_req: Request, ctx: RouteContext<"/api/targets/[id]/persona">) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: target } = await supabase
    .from("targets").select("connection_id, external_id").eq("id", id).maybeSingle();
  if (!target) return NextResponse.json({ error: "not found" }, { status: 404 });
  const { data: conn } = await supabase
    .from("connections").select("external_account").eq("id", target.connection_id).maybeSingle();
  const token = await slackTokenFor(supabase, target.connection_id);
  if (!conn || !token) return NextResponse.json({ error: "connection not found" }, { status: 404 });

  try {
    const slackUserId = conn.external_account.split(":")[1];
    const samples = await fetchOwnMessages(token, target.external_id, slackUserId);
    if (samples.length < 3) {
      return NextResponse.json({ error: "Not enough of your own messages in this channel yet (need at least 3)." }, { status: 422 });
    }
    const { brain } = await resolveBrain(supabase, user.id);
    if (!brain) return NextResponse.json({ error: "No AI available right now. Try again later or add your own key in Settings." }, { status: 503 });
    const persona = await buildPersona(brain, samples);
    if (!persona) return NextResponse.json({ error: "Could not read a style from those messages." }, { status: 502 });
    await supabase.from("targets").update({ persona, persona_updated_at: new Date().toISOString() }).eq("id", id);
    return NextResponse.json({ persona, samples: samples.length });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/targets/[id]/persona">) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  await supabase.from("targets").update({ persona: null, persona_updated_at: null }).eq("id", id);
  return NextResponse.json({ ok: true });
}
