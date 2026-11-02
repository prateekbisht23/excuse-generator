import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { nextRun, type ScheduleSpec } from "@/lib/schedule";

/** Pause or resume. Resuming recomputes the next run from now, so nothing fires for the time spent paused. */
export async function PATCH(request: Request, ctx: RouteContext<"/api/schedules/[id]">) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { active } = (await request.json()) as { active?: boolean };
  if (typeof active !== "boolean") return NextResponse.json({ error: "active must be true or false" }, { status: 400 });

  const { data: row } = await supabase.from("schedules").select("*").eq("id", id).maybeSingle();
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
  const next = active ? nextRun(row as ScheduleSpec, new Date()) : row.next_run_at ? new Date(row.next_run_at) : null;
  if (active && !next) return NextResponse.json({ error: "That one-time schedule has already run." }, { status: 400 });
  const { error } = await supabase.from("schedules").update({ active, next_run_at: next?.toISOString() ?? null }).eq("id", id);
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/schedules/[id]">) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  await supabase.from("schedules").delete().eq("id", id);
  return NextResponse.json({ ok: true });
}
