import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Button } from "prateek-design-system";
import { createClient } from "@/lib/supabase/server";
import { AiKeyForm } from "@/components/AiKeyForm";
import { SignOutButton } from "@/components/SignOutButton";
import { DisconnectButton } from "@/components/DisconnectButton";
import { AppHeader } from "@/components/AppHeader";
import { appNav } from "@/lib/nav";
import { COMING_SOON, PROVIDERS } from "@/lib/providers";

async function SettingsBody() {
  await connection();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const [{ data: profile }, { data: key }, { data: conns }, { data: targets }] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
    supabase.from("ai_keys").select("provider").maybeSingle(),
    supabase.from("connections").select("id, provider, label, created_at").order("created_at"),
    supabase.from("targets").select("connection_id"),
  ]);
  const name = profile?.display_name ?? user.email ?? "You";
  const initials = name.split(/\s+/).map((w: string) => w[0]).slice(0, 2).join("").toUpperCase();
  const destCount = (id: string) => (targets ?? []).filter((t) => t.connection_id === id).length;
  const since = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  return (
    <>
      <div className="ex-hero">
        <h1 className="ex-title">Settings</h1>
        <p className="ex-note">Your account, the apps you send through, and the AI that writes your excuses.</p>
      </div>

      <section className="ex-setting">
        <div className="ex-setting-label"><h2>Profile</h2><p>Signed in with Google.</p></div>
        <div className="ex-row-between" style={{ alignItems: "center" }}>
          <div className="ex-profile">
            <span className="ex-avatar" aria-hidden="true">{initials}</span>
            <div>
              <div className="t-body">{name}</div>
              <div className="ex-meta">{user.email}</div>
            </div>
          </div>
          <SignOutButton />
        </div>
      </section>

      <section className="ex-setting">
        <div className="ex-setting-label"><h2>Connected apps</h2><p>Where your excuses are sent from. Disconnecting removes its destinations and schedules.</p></div>
        <div className="ex-apps">
          {PROVIDERS.map((p) => {
            const mine = (conns ?? []).filter((c) => c.provider === p.id);
            return (
              <div key={p.id} className="ex-app" style={{ gap: "var(--space-3)" }}>
                {mine.length ? mine.map((c) => (
                  <div key={c.id} className="ex-app-head">
                    <span className="ex-mono-badge" aria-hidden="true">{p.letter}</span>
                    <div className="ex-app-name">
                      <strong>{p.name}</strong>
                      <span>{p.id === "slack" ? `Workspace ${c.label}` : c.label} · {destCount(c.id)} destination{destCount(c.id) === 1 ? "" : "s"} · since {since(c.created_at)}</span>
                    </div>
                    <DisconnectButton id={c.id} name={`${p.name} (${c.label})`} destinations={destCount(c.id)} />
                  </div>
                )) : (
                  <div className="ex-app-head">
                    <span className="ex-mono-badge muted" aria-hidden="true">{p.letter}</span>
                    <div className="ex-app-name"><strong>{p.name}</strong><span>{p.blurb}</span></div>
                    <Button variant="ghost" href={p.connectHref}>Connect</Button>
                  </div>
                )}
              </div>
            );
          })}
          {COMING_SOON.map((p) => (
            <div key={p.name} className="ex-app">
              <div className="ex-app-head">
                <span className="ex-mono-badge muted" aria-hidden="true">{p.letter}</span>
                <div className="ex-app-name"><strong style={{ color: "var(--ink-muted)" }}>{p.name}</strong><span>Coming soon</span></div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="ex-setting">
        <div className="ex-setting-label"><h2>AI</h2><p>Which model writes your excuses. If it fails, a built-in list is used so a send never stalls.</p></div>
        <AiKeyForm current={key?.provider ?? null} />
      </section>
    </>
  );
}

export default function Settings() {
  return (
    <>
      <AppHeader links={appNav("settings")} />
      <main className="ex-main" style={{ maxWidth: 920 }}>
        <Suspense fallback={null}><SettingsBody /></Suspense>
      </main>
    </>
  );
}
