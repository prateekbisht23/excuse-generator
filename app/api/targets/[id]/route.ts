import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { REASONS } from "@/lib/excuses/bank";

export async function PATCH(request: Request, ctx: RouteContext<"/api/targets/[id]">) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { template, reason } = (await request.json()) as { template?: string; reason?: string };
  const t = template?.trim();
  const r = REASONS.find((x) => x.value === reason)?.value;
  if (!r || !t || t.length > 500) return NextResponse.json({ error: "Template must be 1 to 500 characters." }, { status: 400 });
  const { data: row } = await supabase.from("targets").select("templates").eq("id", id).maybeSingle();
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
  const { error } = await supabase.from("targets").update({ templates: { ...(row.templates as object), [r]: t } }).eq("id", id);
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/targets/[id]">) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  await supabase.from("targets").delete().eq("id", id);
  return NextResponse.json({ ok: true });
}
