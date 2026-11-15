import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/AppHeader";
import { ScheduleForm } from "@/components/ScheduleForm";
import { ScheduleRow } from "@/components/ScheduleRow";
import { appNav } from "@/lib/nav";
import { REASONS } from "@/lib/excuses/bank";
import { providerName } from "@/lib/providers";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function time12(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}
function whenText(s: { kind: string; local_time: string; local_date: string | null; weekdays: number[] | null }) {
  const t = time12(s.local_time);
  switch (s.kind) {
    case "once": return `${new Date(`${s.local_date}T12:00:00`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })} at ${t}`;
    case "daily": return `Every day at ${t}`;
    case "weekdays": return `Weekdays at ${t}`;
    default: return `Every ${(s.weekdays ?? []).map((d) => DAYS[d]).join(", ")} at ${t}`;
  }
}
function fmtNext(iso: string, tz: string) {
  const d = new Date(iso);
  return `${d.toLocaleDateString("en-GB", { timeZone: tz, weekday: "short", day: "numeric", month: "short" })}, ${d.toLocaleTimeString("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit" })}`;
}

async function Body() {
  await connection();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: targets }, { data: conns }, { data: schedules }] = await Promise.all([
    supabase.from("targets").select("id, label, connection_id").order("created_at"),
    supabase.from("connections").select("id, provider, label"),
    supabase.from("schedules").select("*").order("created_at", { ascending: false }),
  ]);
  const connById = new Map((conns ?? []).map((c) => [c.id, c]));
  const targetById = new Map((targets ?? []).map((t) => [t.id, t]));
  const list = schedules ?? [];
  const live = list.filter((s) => s.active && s.next_run_at).length;

  return (
    <>
      <div className="ex-hero">
        <h1 className="ex-title">Schedules</h1>
        <p className="ex-note">{live ? `${live} active schedule${live === 1 ? "" : "s"}. Each run writes a fresh excuse.` : "Send excuses automatically, once or on repeat."}</p>
      </div>
      {!targets?.length ? (
        <p className="t-body" style={{ color: "var(--ink-muted)" }}>
          Add a Slack channel or an email recipient on the <Link href="/dashboard#apps" style={{ color: "var(--ink)" }}>dashboard</Link> first, then schedule excuses for it.
        </p>
      ) : (
        <div className="ex-grid">
          <section className="ex-panel">
            <h2 className="ex-panel-title">New schedule</h2>
            <ScheduleForm
              targets={targets.map((t) => {
                const c = connById.get(t.connection_id);
                return { id: t.id, label: t.label, provider: c?.provider ?? "slack", account: c?.label ?? null };
              })}
            />
          </section>
          <section className="ex-panel">
            <h2 className="ex-panel-title">Upcoming</h2>
            {list.length ? (
              <div className="ex-list">
                {list.map((s) => {
                  const t = targetById.get(s.target_id);
                  const finished = s.kind === "once" && !s.next_run_at;
                  return (
                    <ScheduleRow
                      key={s.id} id={s.id} active={s.active} finished={finished}
                      when={whenText(s)}
                      target={t?.label ?? "removed destination"}
                      provider={t ? providerName(connById.get(t.connection_id)?.provider ?? "") : ""}
                      reason={REASONS.find((r) => r.value === s.reason)?.label ?? s.reason}
                      next={s.active && s.next_run_at ? fmtNext(s.next_run_at, s.timezone) : null}
                      zone={s.timezone}
                    />
                  );
                })}
              </div>
            ) : (
              <p className="t-body" style={{ margin: 0, color: "var(--ink-muted)" }}>Nothing scheduled yet. Create one and it appears here.</p>
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
