import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AiKeyForm } from "@/components/AiKeyForm";
import { SignOutButton } from "@/components/SignOutButton";
import { AppHeader } from "@/components/AppHeader";

async function SettingsBody() {
  await connection();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: key } = await supabase.from("ai_keys").select("provider").maybeSingle();
  return (
    <>
      <div className="ex-hero"><h1 className="ex-title">Settings</h1></div>
      <div className="ex-block" style={{ gap: "var(--space-12)" }}>
        <section className="ex-panel">
          <h2 className="ex-panel-title">Account</h2>
          <dl style={{ margin: 0 }}>
            <div className="ex-fact"><dt>Email</dt><dd>{user.email}</dd></div>
          </dl>
          <div style={{ marginTop: "var(--space-3)" }}><SignOutButton /></div>
        </section>
        <section className="ex-panel">
          <h2 className="ex-panel-title">AI</h2>
          <AiKeyForm current={key?.provider ?? null} />
        </section>
      </div>
    </>
  );
}

export default function Settings() {
  return (
    <>
      <AppHeader links={[{ label: "Dashboard", href: "/dashboard" }, { label: "Settings", href: "/settings", active: true }]} />
      <main className="ex-main narrow">
        <Suspense fallback={null}><SettingsBody /></Suspense>
      </main>
    </>
  );
}
