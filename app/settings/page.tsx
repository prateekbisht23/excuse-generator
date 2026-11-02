import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Header, Section } from "prateek-design-system";
import { createClient } from "@/lib/supabase/server";
import { AiKeyForm } from "@/components/AiKeyForm";

async function SettingsBody() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: key } = await supabase.from("ai_keys").select("provider").maybeSingle();
  return (
    <>
      <div className="pk-hero">
        <h1 className="pk-name" style={{ fontSize: 32, lineHeight: "40px" }}>Settings</h1>
      </div>
      <div className="pk-sections">
        <Section label="AI">
          <AiKeyForm current={key?.provider ?? null} />
        </Section>
      </div>
    </>
  );
}

export default function Settings() {
  return (
    <div className="pk-page">
      <Header name="Excuse generator" links={[{ label: "Dashboard", href: "/dashboard" }, { label: "Settings", href: "/settings", active: true }]} />
      <Suspense fallback={null}><SettingsBody /></Suspense>
    </div>
  );
}
