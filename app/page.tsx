import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Status } from "prateek-design-system";
import { createClient } from "@/lib/supabase/server";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { AppHeader } from "@/components/AppHeader";

// Signed-in visitors skip the landing page. The cookie read sits inside Suspense
// so the rest of the page can still be prerendered.
async function RedirectIfSignedIn() {
  await connection();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");
  return null;
}

const STEPS = [
  ["Connect", "Link Slack, and pick the channel where you post your leave and work-from-home updates."],
  ["Write", "Each excuse is written fresh, in your own voice, learned from what you have posted before."],
  ["Send", "Send it now, or schedule it. Every message is logged, so you can see what went out and when."],
];

export default function Home() {
  return (
    <>
      <Suspense fallback={null}><RedirectIfSignedIn /></Suspense>
      <AppHeader links={[{ label: "Sign in", href: "/login" }]} />
      <main className="ex-main">
        <div className="ex-hero" style={{ paddingTop: "var(--space-12)" }}>
          <h1 className="ex-display">A better reason to work from home.</h1>
          <Status>Making leave updates more interesting</Status>
          <p className="ex-lede">
            Random, funny excuses for your leave and work-from-home posts, sent to Slack as you. Send one now, or schedule it for later.
          </p>
          <div className="pk-row" style={{ marginTop: "var(--space-6)" }}><GoogleSignInButton /></div>
        </div>
        <div className="ex-panel">
          <h2 className="ex-panel-title">How it works</h2>
          <div className="ex-three">
            {STEPS.map(([title, body]) => (
              <div key={title}>
                <p className="t-body ex-step" style={{ fontWeight: 500 }}>{title}</p>
                <p className="t-body" style={{ margin: 0, color: "var(--ink-muted)" }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
