import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await request.json()) as {
    connectionId?: string; externalId?: string; label?: string; template?: string; kind?: string;
  };
  if (!body.connectionId || !body.externalId || !body.label) {
    return NextResponse.json({ error: "connectionId, externalId and label are required" }, { status: 400 });
  }
  const template = (body.template ?? "").trim().slice(0, 500);
  const { data, error } = await supabase
    .from("targets")
    .upsert(
      {
        user_id: user.id,
        connection_id: body.connectionId,
        kind: body.kind === "dm" ? "dm" : "channel",
        external_id: body.externalId,
        label: body.label,
        ...(template ? { template } : {}),
      },
      { onConflict: "connection_id,external_id" },
    )
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ id: data.id });
}
