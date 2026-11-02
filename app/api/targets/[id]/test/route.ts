import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { slackTokenFor } from "@/lib/connections";
import { sendMessage } from "@/lib/connectors/slack";

export async function POST(_req: Request, ctx: RouteContext<"/api/targets/[id]/test">) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: target } = await supabase
    .from("targets").select("connection_id, external_id").eq("id", id).maybeSingle();
  if (!target) return NextResponse.json({ error: "not found" }, { status: 404 });

  const token = await slackTokenFor(supabase, target.connection_id);
  if (!token) return NextResponse.json({ error: "connection not found" }, { status: 404 });
  try {
    await sendMessage(token, target.external_id, "Test message from Excuse generator. Nothing to see here.");
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
