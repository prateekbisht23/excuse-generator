import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveBrain } from "@/lib/ai/resolve";
import { applyTemplate, generateExcuse, type Persona } from "@/lib/excuses/generate";
import { DEFAULT_TEMPLATES, REASONS, type Reason } from "@/lib/excuses/bank";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await request.json()) as { targetId?: string; reason?: string; avoid?: string[] };
  const reason = REASONS.find((r) => r.value === body.reason)?.value as Reason | undefined;
  if (!body.targetId || !reason) return NextResponse.json({ error: "targetId and a valid reason are required" }, { status: 400 });

  const { data: target } = await supabase
    .from("targets").select("templates, persona").eq("id", body.targetId).maybeSingle();
  if (!target) return NextResponse.json({ error: "not found" }, { status: 404 });

  const { brain, note } = await resolveBrain(supabase, user.id);
  const { excuse, source } = await generateExcuse(
    brain, reason, (target.persona as Persona | null) ?? null, (body.avoid ?? []).slice(0, 10),
  );
  return NextResponse.json({ excuse, text: applyTemplate((target.templates as Record<string, string> | null)?.[reason] ?? DEFAULT_TEMPLATES[reason], excuse), source, note: source === "bank" ? note : undefined });
}
