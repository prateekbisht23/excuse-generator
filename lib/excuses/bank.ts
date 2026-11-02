export type Reason = "wfh" | "leave" | "late";
export const REASONS: { value: Reason; label: string }[] = [
  { value: "wfh", label: "Working from home" },
  { value: "leave", label: "On leave" },
  { value: "late", label: "Running late" },
];

export const DEFAULT_TEMPLATES: Record<Reason, string> = {
  wfh: "I'll be working from home today. {excuse}",
  leave: "I'll be on leave today. {excuse}",
  late: "I'll be running late today. {excuse}",
};

// Curated, harmless fallbacks. Used when no AI is available.
const BANK: Record<Reason, string[]> = {
  wfh: [
    "My commute got cancelled by a very persuasive couch.",
    "The Wi-Fi at my place is faster and my coffee is cheaper.",
    "I have a meeting with my to-do list and it needs quiet.",
    "My standing desk and I are finally on speaking terms.",
    "Traffic is a state of mind and I chose peace.",
    "My cat scheduled a stand-up and I am required to attend.",
    "I am doing deep work. The deeper part is the pillow.",
    "The office plants said they would be fine without me.",
    "My bike has opinions about today and I am listening.",
    "I am testing whether my sofa has a good uptime SLA.",
  ],
  leave: [
    "I am taking a day to debug my sleep schedule.",
    "My batteries are at 3 percent and the charger is a beach.",
    "I have a long overdue appointment with doing nothing.",
    "The to-do list will still be here. I will be somewhere with snacks.",
    "I am pushing a hotfix to my personal life.",
    "My calendar finally has a free slot and I am deploying to it.",
    "I am off to rebase my brain onto a quieter branch.",
    "I booked a meeting with a hammock. It is non-negotiable.",
    "A mountain sent an invite and I accepted.",
    "I am rolling back to a version of myself that rests.",
  ],
  late: [
    "My alarm and I disagree about what time it is.",
    "The elevator took the scenic route.",
    "I stopped to let a pigeon cross and it took its time.",
    "My coffee needed a longer standup than usual.",
    "I took the long way and it was longer than expected.",
    "My shoes were not ready for the day. I waited.",
    "The traffic lights held a strategy meeting.",
    "I misjudged how much of a hurry I was in.",
    "My bus drove past in a very confident manner.",
    "I was waiting for my morning motivation to load.",
  ],
};

export function bankExcuse(reason: Reason, avoid: string[] = []): string {
  const pool = BANK[reason].filter((e) => !avoid.includes(e));
  const list = pool.length ? pool : BANK[reason];
  return list[Math.floor(Math.random() * list.length)];
}

// Keep it light: no health, death, family emergencies, crime or discrimination.
const BLOCK = /\b(cancer|funeral|died|death|dying|covid|hospital|surgery|pregnan|divorce|lawsuit|arrest|police|racist|sexist|suicid)\w*/i;

/** One short line, no quotes, nothing sensitive. Returns null if it should be rejected. */
export function cleanExcuse(raw: string): string | null {
  const first = raw.split("\n").map((l) => l.trim()).find(Boolean) ?? "";
  const line = first.replace(/^["'“”‘’\s]+|["'“”‘’\s]+$/g, "");
  if (line.length < 8 || line.length > 160 || BLOCK.test(line)) return null;
  return line;
}
