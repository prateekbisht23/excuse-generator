import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { slackTokenFor } from "@/lib/connections";
import { listChannels } from "@/lib/connectors/slack";

export async function GET(request: Request) {
  const connectionId = new URL(request.url).searchParams.get("connectionId");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!connectionId) return NextResponse.json({ error: "connectionId required" }, { status: 400 });

  const token = await slackTokenFor(supabase, connectionId);
  if (!token) return NextResponse.json({ error: "not found" }, { status: 404 });
  try {
    return NextResponse.json({ channels: await listChannels(token) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
