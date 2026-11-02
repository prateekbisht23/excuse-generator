import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/AppHeader";
import { ScheduleForm } from "@/components/ScheduleForm";
import { ScheduleRow } from "@/components/ScheduleRow";
import { appNav } from "@/lib/nav";
import { describe, type ScheduleSpec } from "@/lib/schedule";
import { REASONS } from "@/lib/excuses/bank";

function fmt(iso: string, tz: string) {
  return new Date(iso).toLocaleString("en-GB", { timeZone: tz, weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false });
}

async function Body() {
  await connection();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: targets }, { data: schedules }] = await Promise.all([
    supabase.from("targets").select("id, label").order("created_at"),
    supabase.from("schedules").select("*").order("created_at", { ascending: false }),
  ]);
  const label = new Map((targets ?? []).map((t) => [t.id, t.label]));

  return (
    <>
      <div className="ex-hero"><h1 className="ex-title">Schedules</h1></div>
      {!targets?.length ? (
        <p className="t-body" style={{ color: "var(--ink-muted)" }}>Add a channel on the <Link href="/dashboard" style={{ color: "var(--ink)" }}>dashboard</Link> first, then schedule excuses for it.</p>
      ) : (
        <div className="ex-grid">
          <section className="ex-panel">
            <h2 className="ex-panel-title">New schedule</h2>
            <ScheduleForm targets={targets.map((t) => ({ id: t.id, label: t.label }))} />
          </section>
          <section className="ex-panel">
            <h2 className="ex-panel-title">Upcoming</h2>
            {schedules?.length ? (
              <div className="ex-list">
                {schedules.map((s) => {
                  const reason = REASONS.find((r) => r.value === s.reason)?.label ?? s.reason;
                  const finished = s.kind === "once" && !s.next_run_at;
                  return (
                    <ScheduleRow
                      key={s.id} id={s.id} active={s.active} finished={finished}
                      title={`${label.get(s.target_id) ?? "removed channel"} · ${reason}`}
                      detail={`${describe(s as ScheduleSpec)} · ${s.timezone} · ${
                        finished ? "done" : !s.active ? "paused" : s.next_run_at ? `next ${fmt(s.next_run_at, s.timezone)}` : "none left"}`}
                    />
                  );
                })}
              </div>
            ) : (
              <p className="t-body" style={{ margin: 0, color: "var(--ink-muted)" }}>Nothing scheduled yet.</p>
            )}
          </section>
        </div>
      )}
    </>
  );
}

export default function SchedulesPage() {
  return (
    <>
      <AppHeader links={appNav("schedules")} />
      <main className="ex-main"><Suspense fallback={null}><Body /></Suspense></main>
    </>
  );
}
