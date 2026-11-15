export type ProviderId = "slack" | "gmail";

export const PROVIDERS: { id: ProviderId; name: string; letter: string; blurb: string; connectHref: string; destNoun: string }[] = [
  { id: "slack", name: "Slack", letter: "S", blurb: "Post in a channel as you.", connectHref: "/api/connect/slack/start", destNoun: "channel" },
  { id: "gmail", name: "Gmail", letter: "G", blurb: "Email your manager or team from your address.", connectHref: "/api/connect/gmail/start", destNoun: "recipient" },
];

export const COMING_SOON = [
  { name: "Microsoft Teams", letter: "T" },
  { name: "Discord", letter: "D" },
];

export function providerName(id: string) {
  return PROVIDERS.find((p) => p.id === id)?.name ?? id;
}

/** One line that says exactly where a message goes. */
export function destinationLine(provider: string, label: string, account: string | null) {
  if (provider === "gmail") return `Emails ${label} from ${account ?? "your Gmail"}`;
  return `Posts as you in ${label}${account ? ` on the ${account} Slack` : " on Slack"}`;
}
