import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/AppHeader";
import { appNav } from "@/lib/nav";

function when(iso: string) {
  return new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
}

async function Body() {
  await connection();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: rows } = await supabase
    .from("excuse_log").select("id, target_label, text, status, error, source, schedule_id, created_at")
    .order("created_at", { ascending: false }).limit(100);

  return (
    <>
      <div className="ex-hero"><h1 className="ex-title">History</h1></div>
      {rows?.length ? (
        <div className="ex-list">
          {rows.map((r) => (
            <div key={r.id}>
              <div className="ex-row-between">
                <span className="t-body">{r.target_label}</span>
                <span className="ex-meta">
                  {r.schedule_id ? "scheduled · " : ""}{r.status !== "sent" ? `${r.status} · ` : ""}{r.source === "ai" ? "AI · " : r.source === "bank" ? "list · " : ""}{when(r.created_at)}
                </span>
              </div>
              <p className="t-body" style={{ margin: "var(--space-1) 0 0", color: "var(--ink-muted)" }}>{r.text}</p>
              {r.error ? <p className="ex-error" style={{ marginTop: "var(--space-1)" }}>{r.error}</p> : null}
            </div>
          ))}
        </div>
      ) : (
        <p className="t-body" style={{ color: "var(--ink-muted)" }}>Nothing yet. Every excuse you send or schedule shows up here.</p>
      )}
    </>
  );
}

export default function HistoryPage() {
  return (
    <>
      <AppHeader links={appNav("history")} />
      <main className="ex-main narrow"><Suspense fallback={null}><Body /></Suspense></main>
    </>
  );
}
