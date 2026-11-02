export const SLACK_USER_SCOPES = [
  "chat:write", "channels:read", "groups:read", "im:write", "users:read", "channels:history", "groups:history",
];

export type SlackChannel = { id: string; name: string; isPrivate: boolean };

async function slack<T>(method: string, token: string, params: Record<string, string> = {}): Promise<T> {
  const res = await fetch(`https://slack.com/api/${method}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
    cache: "no-store",
  });
  const json = (await res.json()) as { ok: boolean; error?: string } & T;
  if (!json.ok) throw new Error(`slack ${method}: ${json.error ?? "unknown_error"}`);
  return json;
}

/** Public and private channels the user is a member of. */
export async function listChannels(token: string): Promise<SlackChannel[]> {
  const out: SlackChannel[] = [];
  let cursor = "";
  for (let page = 0; page < 5; page++) {
    const r = await slack<{
      channels: { id: string; name: string; is_private: boolean; is_member: boolean }[];
      response_metadata?: { next_cursor?: string };
    }>("conversations.list", token, {
      types: "public_channel,private_channel",
      exclude_archived: "true",
      limit: "200",
      ...(cursor ? { cursor } : {}),
    });
    for (const c of r.channels) if (c.is_member) out.push({ id: c.id, name: c.name, isPrivate: c.is_private });
    cursor = r.response_metadata?.next_cursor ?? "";
    if (!cursor) break;
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

/** Posts as the user, because we hold their user token. */
export async function sendMessage(token: string, channel: string, text: string) {
  return slack<{ ts: string; channel: string }>("chat.postMessage", token, { channel, text });
}
