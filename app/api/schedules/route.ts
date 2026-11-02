import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { REASONS } from "@/lib/excuses/bank";
import { isValidTimezone, nextRun, type Kind, type ScheduleSpec } from "@/lib/schedule";

const KINDS: Kind[] = ["once", "daily", "weekdays", "weekly"];

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const b = (await request.json()) as Partial<ScheduleSpec> & { targetId?: string; reason?: string };
  const reason = REASONS.find((r) => r.value === b.reason)?.value;
  const kind = KINDS.find((k) => k === b.kind);
  if (!b.targetId || !reason || !kind) return NextResponse.json({ error: "Choose a channel, a reason and how often." }, { status: 400 });
  if (!b.local_time || !/^([01]\d|2[0-3]):[0-5]\d$/.test(b.local_time)) return NextResponse.json({ error: "Choose a time." }, { status: 400 });
  if (!b.timezone || !isValidTimezone(b.timezone)) return NextResponse.json({ error: "Unknown time zone." }, { status: 400 });
  if (kind === "once" && !/^\d{4}-\d{2}-\d{2}$/.test(b.local_date ?? "")) return NextResponse.json({ error: "Choose a date." }, { status: 400 });
  const weekdays = kind === "weekly" ? [...new Set((b.weekdays ?? []).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))] : [];
  if (kind === "weekly" && !weekdays.length) return NextResponse.json({ error: "Choose at least one day." }, { status: 400 });

  const spec: ScheduleSpec = { kind, local_time: b.local_time, local_date: kind === "once" ? b.local_date : null, weekdays, timezone: b.timezone };
  const next = nextRun(spec, new Date());
  if (!next) return NextResponse.json({ error: "That time has already passed." }, { status: 400 });

  const { data, error } = await supabase.from("schedules").insert({
    user_id: user.id, target_id: b.targetId, reason, ...spec, next_run_at: next.toISOString(),
  }).select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ id: data.id, next_run_at: next.toISOString() });
}
