import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { deliver } from "@/lib/delivery";
import { resolveBrain } from "@/lib/ai/resolve";
import { applyTemplate, generateExcuse, type Persona } from "@/lib/excuses/generate";
import { DEFAULT_TEMPLATES, type Reason } from "@/lib/excuses/bank";
import { nextRun, type ScheduleSpec } from "@/lib/schedule";

// A run more than this late is skipped: "working from home today" at 3pm helps nobody.
const MAX_LATE_MS = 30 * 60_000;

type Row = ScheduleSpec & { id: string; user_id: string; target_id: string; reason: Reason; next_run_at: string };

function authorised(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  const given = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  if (!secret || given.length !== secret.length) return false;
  return timingSafeEqual(Buffer.from(given), Buffer.from(secret));
}

/** Called every minute by the scheduler. Sends every due schedule once. */
export async function POST(request: Request) {
  if (!authorised(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const dry = new URL(request.url).searchParams.get("dry") === "1";

  const admin = createAdminClient();
  const { data: due, error } = await admin.rpc("claim_due_schedules", { batch: 25 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const results: { id: string; outcome: string }[] = [];
  for (const s of (due ?? []) as Row[]) {
    const scheduledFor = new Date(s.next_run_at);
    const late = Date.now() - scheduledFor.getTime();
    let outcome: "sent" | "failed" | "skipped" = "sent";
    let errMsg: string | undefined;
    let label = "";
    let text = "";
    let source: "ai" | "bank" = "bank";

    const { data: target } = await admin.from("targets")
      .select("connection_id, external_id, label, templates, persona").eq("id", s.target_id).maybeSingle();

    if (!target) { outcome = "failed"; errMsg = "channel was removed"; }
    else {
      label = target.label;
      if (late > MAX_LATE_MS) { outcome = "skipped"; errMsg = "missed: the app was not running at the scheduled time"; }
      else if (dry) { outcome = "skipped"; errMsg = "dry run"; }
      else {
        try {
          const { brain } = await resolveBrain(admin, s.user_id);
          const gen = await generateExcuse(brain, s.reason, (target.persona as Persona | null) ?? null);
          source = gen.source;
          text = applyTemplate((target.templates as Record<string, string> | null)?.[s.reason] ?? DEFAULT_TEMPLATES[s.reason], gen.excuse);
          await deliver(admin, target.connection_id, target.external_id, text, s.reason);
        } catch (e) {
          outcome = "failed"; errMsg = (e as Error).message;
        }
      }
    }

    if (!dry) {
      // The unique (schedule_id, scheduled_for) index means a retried run cannot log twice.
      await admin.from("excuse_log").insert({
        user_id: s.user_id, target_id: target ? s.target_id : null, target_label: label || "removed channel",
        reason: s.reason, text: text || "(not generated)", source, status: outcome, error: errMsg ?? null,
        schedule_id: s.id, scheduled_for: scheduledFor.toISOString(),
      });
    }

    // Move on to the next run whatever happened, so one failure never makes a schedule retry forever.
    const next = dry ? scheduledFor : nextRun(s, new Date(Math.max(Date.now(), scheduledFor.getTime())));
    await admin.from("schedules").update(
      dry
        ? { claimed_until: null }
        : { next_run_at: next?.toISOString() ?? null, active: next !== null, last_run_at: new Date().toISOString(), claimed_until: null },
    ).eq("id", s.id);

    results.push({ id: s.id, outcome: dry ? "dry run" : outcome });
  }
  return NextResponse.json({ processed: results.length, results });
}
