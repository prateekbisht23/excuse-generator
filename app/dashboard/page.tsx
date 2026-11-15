import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Status } from "prateek-design-system";
import { AppHeader } from "@/components/AppHeader";
import { appNav } from "@/lib/nav";
import { createClient } from "@/lib/supabase/server";
import { Compose } from "@/components/Compose";
import { ConnectedApps } from "@/components/ConnectedApps";
import { providerName } from "@/lib/providers";

const NOTES: Record<string, Record<string, string>> = {
  slack: {
    connected: "Slack connected. Add a channel below to start.",
    denied: "Slack access was not granted.",
    state: "That Slack sign-in expired. Try again.",
    exchange: "Slack did not accept the sign-in. Try again.",
    store: "Slack connected, but I could not save it.",
  },
  gmail: {
    connected: "Gmail connected. Add a recipient below to start.",
    denied: "Gmail access was not granted.",
    state: "That Google sign-in expired. Try again.",
    exchange: "Google did not accept the sign-in. Try again.",
    scope: "Gmail sending permission was not granted. Tick the Gmail box on the Google screen.",
    store: "Gmail connected, but I could not save it.",
  },
};

function when(iso: string) {
  return new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false });
}

async function DashboardBody({ searchParams }: { searchParams: PageProps<"/dashboard">["searchParams"] }) {
  await connection();
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: conns }, { data: targets }, { data: recent }] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
    supabase.from("connections").select("id, label, provider").order("created_at"),
    supabase.from("targets").select("id, connection_id, kind, label, templates, persona_updated_at").order("created_at"),
    supabase.from("excuse_log").select("id, target_id, target_label, text, status, schedule_id, created_at").order("created_at", { ascending: false }).limit(5),
  ]);

  const first = (profile?.display_name ?? "there").split(" ")[0];
  const connList = conns ?? [];
  const targetList = targets ?? [];
  const connById = new Map(connList.map((c) => [c.id, c]));
  const sentTo = new Set((recent ?? []).filter((r) => r.status === "sent").map((r) => r.target_id));
  const providerOf = new Map(targetList.map((t) => [t.id, connById.get(t.connection_id)?.provider ?? ""]));
  const note = (["slack", "gmail"] as const).map((k) => (typeof sp[k] === "string" ? NOTES[k][sp[k] as string] : null)).find(Boolean) ?? null;

  const step = !connList.length ? 1 : !targetList.length ? 2 : 3;
  const connectedNames = [...new Set(connList.map((c) => providerName(c.provider)))];
  const status = step === 1 ? "Connect Slack or Gmail to start"
    : step === 2 ? "Add a channel or recipient to start"
    : `Sending through ${connectedNames.join(" and ")} · ${targetList.length} destination${targetList.length === 1 ? "" : "s"}`;

  return (
    <>
      <div className="ex-hero">
        <h1 className="ex-title">Hello, {first}</h1>
        <Status>{status}</Status>
      </div>

      {note ? <p className="ex-note" role="status" style={{ marginBottom: "var(--space-8)" }}>{note}</p> : null}

      {step < 3 ? (
        <section className="ex-panel" style={{ marginBottom: "var(--space-12)" }}>
          <h2 className="ex-panel-title">Get started</h2>
          <ol className="ex-steps">
            <li className={step > 1 ? "done" : ""}><span className="n">01</span><span className="t-body">Connect an app</span><span className="ex-note">Slack posts in a channel as you. Gmail emails from your address.</span></li>
            <li className={step > 2 ? "done" : ""}><span className="n">02</span><span className="t-body">Pick where it goes</span><span className="ex-note">Add a Slack channel or an email recipient under Connected apps.</span></li>
            <li><span className="n">03</span><span className="t-body">Send or schedule</span><span className="ex-note">Write an excuse here and send it now, or set it up on Schedules.</span></li>
          </ol>
        </section>
      ) : null}

      <div className="ex-grid">
        {step === 3 ? (
          <section className="ex-panel">
            <h2 className="ex-panel-title">Send an excuse</h2>
            <Compose
              targets={targetList.map((t) => {
                const c = connById.get(t.connection_id);
                return { id: t.id, label: t.label, provider: c?.provider ?? "slack", account: c?.label ?? null, sentBefore: sentTo.has(t.id) };
              })}
            />
          </section>
        ) : null}

        {step === 3 ? (
          <section className="ex-panel">
            <div className="ex-row-between" style={{ marginBottom: "var(--space-6)" }}>
              <h2 className="ex-panel-title" style={{ margin: 0 }}>Recent</h2>
              <Link href="/history" className="ex-note" style={{ color: "var(--ink-muted)" }}>All history →</Link>
            </div>
            {recent?.length ? (
              <div className="ex-list">
                {recent.map((r) => (
                  <div key={r.id}>
                    <div className="ex-row-between" style={{ alignItems: "center", marginBottom: "var(--space-1)" }}>
                      <span className="t-body">{r.target_label}</span>
                      <span className="ex-sched-meta">
                        {r.status !== "sent" ? <span className="ex-tag" style={{ color: "var(--marigold-ink)" }}>{r.status === "failed" ? "Failed" : "Skipped"}</span> : null}
                        {r.schedule_id ? <span className="ex-tag">Scheduled</span> : null}
                        {providerOf.get(r.target_id) ? <span className="ex-tag">{providerName(providerOf.get(r.target_id)!)}</span> : null}
                        <span className="ex-meta">{when(r.created_at)}</span>
                      </span>
                    </div>
                    <p className="t-body" style={{ margin: 0, color: "var(--ink-muted)" }}>{r.text}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="t-body" style={{ margin: 0, color: "var(--ink-muted)" }}>Nothing sent yet. Every message you send shows up here.</p>
            )}
          </section>
        ) : null}

        <section className="ex-panel ex-span" id="apps">
          <div className="ex-row-between" style={{ marginBottom: "var(--space-6)" }}>
            <h2 className="ex-panel-title" style={{ margin: 0 }}>Connected apps and destinations</h2>
            <Link href="/settings" className="ex-note" style={{ color: "var(--ink-muted)" }}>Manage in settings →</Link>
          </div>
          <ConnectedApps conns={connList} targets={targetList} />
        </section>
      </div>
    </>
  );
}

export default function Dashboard({ searchParams }: PageProps<"/dashboard">) {
  return (
    <>
      <AppHeader links={appNav("dashboard")} />
      <main className="ex-main">
        <Suspense fallback={null}><DashboardBody searchParams={searchParams} /></Suspense>
      </main>
    </>
  );
}
