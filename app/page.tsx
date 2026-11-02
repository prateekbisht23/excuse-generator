import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Header, Status, Section } from "prateek-design-system";
import { createClient } from "@/lib/supabase/server";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";

// Signed-in visitors skip the landing page. The cookie read sits inside Suspense
// so the rest of the page can still be prerendered.
async function RedirectIfSignedIn() {
  await connection();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");
  return null;
}

export default function Home() {
  return (
    <div className="pk-page">
      <Suspense fallback={null}><RedirectIfSignedIn /></Suspense>
      <Header name="Excuse generator" links={[{ label: "Sign in", href: "/login" }]} />

      <div className="pk-hero">
        <h1 className="pk-name">Excuse generator</h1>
        <Status>Making WFH updates more interesting</Status>
        <p className="pk-lede">
          A random, funny excuse for your leave and work-from-home posts. Send one now, or schedule it for later.
        </p>
      </div>

      <div className="pk-row" style={{ marginTop: "var(--space-8)" }}>
        <GoogleSignInButton />
      </div>

      <div className="pk-sections">
        <Section label="How it works">
          <div className="ex-stack">
            <p className="t-body" style={{ margin: 0 }}>Connect Slack or email, and pick a message template for each.</p>
            <p className="t-body" style={{ margin: 0 }}>The excuse is written in your own style, learned from what you have posted before.</p>
            <p className="t-body" style={{ margin: 0 }}>Every message is logged, so you can see what you sent and when.</p>
          </div>
        </Section>
      </div>
    </div>
  );
}
