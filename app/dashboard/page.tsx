import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Header, Status, Section, Button } from "prateek-design-system";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/SignOutButton";
import { SlackTargets } from "@/components/SlackTargets";

const SLACK_NOTES: Record<string, string> = {
  connected: "Slack connected.",
  denied: "Slack access was not granted.",
  state: "That Slack sign-in expired. Try again.",
  exchange: "Slack did not accept the sign-in. Try again.",
  store: "Slack connected, but I could not save it.",
};

async function DashboardBody({ searchParams }: { searchParams: PageProps<"/dashboard">["searchParams"] }) {
  const { slack } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, timezone")
    .eq("id", user.id)
    .maybeSingle();

  const name = profile?.display_name ?? user.email ?? "there";

  const { data: slackConns } = await supabase
    .from("connections").select("id, label").eq("provider", "slack").order("created_at");
  const { data: targets } = await supabase
    .from("targets").select("id, connection_id, label, template, persona_updated_at").order("created_at");

  return (
    <>
      <div className="pk-hero">
        <h1 className="pk-name" style={{ fontSize: 32, lineHeight: "40px" }}>Hello, {name}</h1>
        <Status>Signed in, connecting tools comes next</Status>
      </div>
      <div className="pk-sections">
        <Section label="Connections">
          <div className="ex-stack">
            {typeof slack === "string" && SLACK_NOTES[slack] ? <p className="ex-note" role="status">{SLACK_NOTES[slack]}</p> : null}
            {(slackConns ?? []).map((c) => (
              <div key={c.id} className="ex-stack" style={{ gap: "var(--space-3)" }}>
                <p className="t-body" style={{ margin: 0 }}>Slack <span className="t-meta" style={{ color: "var(--ink-muted)" }}>· {c.label}</span></p>
                <SlackTargets connectionId={c.id} targets={(targets ?? []).filter((t) => t.connection_id === c.id).map((t) => ({ id: t.id, label: t.label, template: t.template, learned: Boolean(t.persona_updated_at) }))} />
              </div>
            ))}
            <div><Button variant={slackConns?.length ? "text" : "solid"} href="/api/connect/slack/start">{slackConns?.length ? "Connect another workspace" : "Connect Slack"}</Button></div>
          </div>
        </Section>
        <Section label="Account">
          <dl style={{ margin: 0 }}>
            <div className="ex-fact"><dt>Email</dt><dd>{user.email}</dd></div>
            <div className="ex-fact"><dt>Time zone</dt><dd>{profile?.timezone ?? "not set"}</dd></div>
          </dl>
          <div style={{ marginTop: "var(--space-4)" }}><SignOutButton /></div>
        </Section>
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
