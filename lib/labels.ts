import type { CoverSheet, Peel, Pressure, Recipe, Step } from "./types";

const pressureLabels: Record<Pressure, string> = {
  light: "Light pressure",
  medium: "Medium pressure",
  "medium-firm": "Medium-firm pressure",
  firm: "Firm pressure",
  heavy: "Heavy pressure",
};

const pressureHelp: Record<Pressure, string> = {
  light: "Light contact. You can still nudge the item.",
  medium: "A proper close. The handle meets resistance and does not fight you.",
  "medium-firm": "Harder than medium, with even contact across the design.",
  firm: "Strong resistance as the press locks. Used for mugs and coated blanks.",
  heavy: "Hard to close. Only when a film supplier asks for it on thick cotton.",
};

const peelLabels: Record<Peel, string> = {
  hot: "Hot peel",
  warm: "Warm peel",
  cold: "Cold peel",
  either: "Hot or cold peel",
};

const peelHelp: Record<Peel, string> = {
  hot: "Peel as soon as the press opens.",
  warm: "Wait a few seconds, then peel.",
  cold: "Let it cool before you peel.",
  either: "Hot or cold both work for this film.",
};

const coverLabels: Record<CoverSheet, string> = {
  none: "No cover sheet",
  teflon: "Teflon sheet",
  parchment: "Parchment",
  butcher: "Butcher paper",
};

export function pressureLabel(pressure: string): string {
  return pressureLabels[pressure as Pressure] ?? pressure;
}

export function pressureHelpText(pressure: string): string {
  return pressureHelp[pressure as Pressure] ?? "";
}

export function peelLabel(peel: string): string {
  return peelLabels[peel as Peel] ?? peel;
}

export function peelHelpText(peel: string): string {
  return peelHelp[peel as Peel] ?? "";
}

export function coverLabel(cover: string): string {
  return coverLabels[cover as CoverSheet] ?? cover;
}

export function pressKindLabel(kind: string): string {
  if (kind === "cup") return "Cup press";
  if (kind === "flat") return "Flat press";
  return "Any press";
}

export function timeHeadline(steps: Step[], fallbackSeconds: number): string {
  const presses = steps.filter((step) => step.kind === "press" && step.seconds);
  if (presses.length === 0) return `${fallbackSeconds} seconds`;
  if (presses.length === 1) return `${presses[0].seconds} seconds`;
  return presses.map((step) => `${step.seconds} seconds`).join(", then ");
}

export function mainPressSeconds(steps: Step[], fallbackSeconds: number): number {
  const press = steps.find((step) => step.kind === "press" && step.seconds);
  return press?.seconds ?? fallbackSeconds;
}

export function rangeLine(recipe: Recipe): string | null {
  const parts: string[] = [];
  if (recipe.tempMinC != null && recipe.tempMaxC != null && recipe.tempMinC !== recipe.tempMaxC) {
    parts.push(`${recipe.tempMinC}–${recipe.tempMaxC}°C`);
  }
  if (recipe.timeMinSeconds != null && recipe.timeMaxSeconds != null) {
    parts.push(`${recipe.timeMinSeconds}–${recipe.timeMaxSeconds} seconds`);
  }
  if (parts.length === 0) return null;
  return `Published window: ${parts.join(", ")}. The large number is the one to try first.`;
}

export function glanceChips(recipe: Recipe): string[] {
  const chips: string[] = [];
  if (recipe.mirrorPrint) chips.push("Mirrored");
  if (recipe.coverSheet !== "none") chips.push(coverLabel(recipe.coverSheet));
  if (recipe.blowoutSheet) chips.push("Sheet inside the shirt");
  if (recipe.heatTape) chips.push("Heat tape");
  if (recipe.shrinkSleeve) chips.push("Shrink sleeve");
  if (recipe.pressingPillow) chips.push("Pressing pillow");
  if (recipe.prepressSeconds > 0) chips.push(`Pre-press ${recipe.prepressSeconds}s`);
  if (recipe.washWaitHours) chips.push(`Wait ${recipe.washWaitHours}h before washing`);
  return chips;
}

export function stockReasonLabel(reason: string): string {
  const labels: Record<string, string> = {
    received: "Received",
    used: "Used",
    damaged: "Damaged",
    count: "Counted",
    press: "Pressed",
  };
  return labels[reason] ?? reason;
}

export const PRESSURES: Pressure[] = ["light", "medium", "medium-firm", "firm", "heavy"];
export const PEELS: Peel[] = ["hot", "warm", "cold", "either"];
export const COVERS: CoverSheet[] = ["none", "teflon", "parchment", "butcher"];
export const STEP_KINDS: Step["kind"][] = ["prepress", "press", "peel", "rotate", "finish", "cool", "note"];

export function stepKindLabel(kind: string): string {
  const labels: Record<string, string> = {
    prepress: "Pre-press",
    press: "Press",
    peel: "Peel",
    rotate: "Turn",
    finish: "Finish press",
    cool: "Cool",
    note: "Check",
  };
  return labels[kind] ?? kind;
}
