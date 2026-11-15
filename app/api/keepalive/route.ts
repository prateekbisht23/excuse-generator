import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Supabase pauses free projects after 7 days without activity. Vercel cron calls this daily
// (see vercel.json) and it runs a real query, so the project never looks idle.
// Vercel sends "Authorization: Bearer $CRON_SECRET" automatically when CRON_SECRET is set.
function authorised(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  const given = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  if (!secret || given.length !== secret.length) return false;
  return timingSafeEqual(Buffer.from(given), Buffer.from(secret));
}

export async function GET(request: Request) {
  if (!authorised(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { error } = await createAdminClient().from("profiles").select("id").limit(1);
  if (error) return NextResponse.json({ ok: false, error: error.message.slice(0, 200) }, { status: 500 });
  return NextResponse.json({ ok: true, at: new Date().toISOString() });
}
