import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Disconnects an account. Its destinations and their schedules go with it (foreign keys cascade); history stays. */
export async function DELETE(_req: Request, ctx: RouteContext<"/api/connections/[id]">) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { error } = await supabase.from("connections").delete().eq("id", id);
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({ ok: true });
}
