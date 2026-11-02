import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Header, Status, Section, Button } from "prateek-design-system";
import { createClient } from "@/lib/supabase/server";
import { Compose } from "@/components/Compose";
import { ChannelManager } from "@/components/ChannelManager";

const SLACK_NOTES: Record<string, string> = {
  connected: "Slack connected. Add a channel to start.",
  denied: "Slack access was not granted.",
  state: "That Slack sign-in expired. Try again.",
  exchange: "Slack did not accept the sign-in. Try again.",
  store: "Slack connected, but I could not save it.",
};

function when(iso: string) {
  return new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false });
}

async function DashboardBody({ searchParams }: { searchParams: PageProps<"/dashboard">["searchParams"] }) {
  await connection();
  const { slack } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: conns }, { data: targets }, { data: recent }] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
    supabase.from("connections").select("id, label").eq("provider", "slack").order("created_at"),
    supabase.from("targets").select("id, connection_id, label, templates, persona_updated_at").order("created_at"),
    supabase.from("excuse_log").select("id, target_id, target_label, text, status, created_at").order("created_at", { ascending: false }).limit(6),
  ]);

  const first = (profile?.display_name ?? "there").split(" ")[0];
  const sentTo = new Set((recent ?? []).filter((r) => r.status === "sent").map((r) => r.target_id));
  const hasTargets = (targets ?? []).length > 0;
  const note = typeof slack === "string" ? SLACK_NOTES[slack] : null;

  return (
    <>
      <div className="pk-hero">
        <h1 className="pk-name" style={{ fontSize: 32, lineHeight: "40px" }}>Hello, {first}</h1>
        <Status>
          {!conns?.length ? "Connect Slack to start" : !hasTargets ? "Add a channel to start" : `Ready to send to ${targets!.length} channel${targets!.length === 1 ? "" : "s"}`}
        </Status>
      </div>

      <div className="pk-sections">
        {note ? <p className="ex-note" role="status">{note}</p> : null}

        {hasTargets ? (
          <Section label="Send">
            <Compose targets={targets!.map((t) => ({ id: t.id, label: t.label, sentBefore: sentTo.has(t.id) }))} />
          </Section>
        ) : null}

        <Section label="Channels">
          {!conns?.length ? (
            <div className="ex-block" style={{ gap: "var(--space-4)" }}>
              <p className="t-body" style={{ margin: 0 }}>Connect Slack so I can post your excuses as you, in the channel you choose.</p>
              <div className="pk-row"><Button variant="solid" href="/api/connect/slack/start">Connect Slack</Button></div>
            </div>
          ) : (
            <div className="ex-block">
              {conns.map((c) => (
                <div key={c.id} className="ex-block" style={{ gap: "var(--space-4)" }}>
                  <p className="ex-meta" style={{ margin: 0 }}>slack · {c.label}</p>
                  <ChannelManager
                    connectionId={c.id}
                    targets={(targets ?? []).filter((t) => t.connection_id === c.id).map((t) => ({ id: t.id, label: t.label, templates: t.templates as Record<string, string>, learned: Boolean(t.persona_updated_at) }))}
                  />
                </div>
              ))}
              <div><Button variant="text" href="/api/connect/slack/start">Connect another workspace</Button></div>
            </div>
          )}
        </Section>

        {recent?.length ? (
          <Section label="Recent">
            <div className="ex-list">
              {recent.map((r) => (
                <div key={r.id}>
                  <div className="ex-row-between">
                    <span className="t-body">{r.target_label}</span>
                    <span className="ex-meta">{r.status === "failed" ? "failed · " : ""}{when(r.created_at)}</span>
                  </div>
                  <p className="t-body" style={{ margin: "var(--space-1) 0 0", color: "var(--ink-muted)" }}>{r.text}</p>
                </div>
              ))}
            </div>
          </Section>
        ) : null}
      </div>
    </>
  );
}

export default function Dashboard({ searchParams }: PageProps<"/dashboard">) {
  return (
    <div className="pk-page">
      <Header name="Excuse generator" links={[{ label: "Dashboard", href: "/dashboard", active: true }, { label: "Settings", href: "/settings" }]} />
      <Suspense fallback={null}><DashboardBody searchParams={searchParams} /></Suspense>
    </div>
  );
}
