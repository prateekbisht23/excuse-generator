import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Header, Status, Section } from "prateek-design-system";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/SignOutButton";

async function DashboardBody() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, timezone")
    .eq("id", user.id)
    .maybeSingle();

  const name = profile?.display_name ?? user.email ?? "there";

  return (
    <>
      <div className="pk-hero">
        <h1 className="pk-name" style={{ fontSize: 32, lineHeight: "40px" }}>Hello, {name}</h1>
        <Status>Signed in, connecting tools comes next</Status>
      </div>
      <div className="pk-sections">
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

export default function Dashboard() {
  return (
    <div className="pk-page">
      <Header name="Excuse generator" links={[{ label: "Dashboard", href: "/dashboard", active: true }]} />
      <Suspense fallback={null}><DashboardBody /></Suspense>
    </div>
  );
}
