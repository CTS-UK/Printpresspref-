import type { Step } from "./types";

export const workshopPress = {
  name: "HTVRONT Auto Heat Press",
  kind: "flat" as const,
  platenNote: "38 × 38 cm",
  pressureStyle: "auto",
  maxSeconds: 199,
  notes:
    "UK 230V HTVRONT Auto Heat Press, about 38 × 38 cm. Temperature 100–210°C. Timer 1–199 seconds. Pressure is automatic, about 60 kg, with no knob. Pressing height is about 2.5 cm. Not a cup press.",
  tips: [
    "Set this card's Celsius temperature and seconds on the press. If the screen shows °F, press Temp. Wait until Start turns green.",
    "Put the supplied mat under the work and the Teflon sheet on top. Push the drawer fully in, then press Start (R).",
    "Pressure is automatic, about 60 kg. This flat press is not a mug press.",
    "Any button while the platen is closing opens it again. That is the emergency stop.",
    "The press switches itself off after 15 minutes with nothing pressed. The plate can still be hot.",
    "The timer stops at 199 seconds. A longer press needs a second Start.",
    "Modes 1–4 are shortcuts (ordinary vinyl, glitter, transfer paper, sublimation). Those times are often shorter than this card. Set the card's numbers, then save the pair on Custom A or B.",
    "The platen is 38 × 38 cm. A design bigger than that needs a second press, lined up carefully.",
    "Use a grounded 220–240 V socket. This press is about 1500 W. Do not run it from a coiled extension reel.",
    "If the side of the machine has a pressure dial marked 1–7, this is the newer Auto Heat Press 2. Edit these tips in the library.",
  ].join("\n"),
};

export const visibleTipCount = 3;

export function tipLines(tips: string): string[] {
  return tips
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function autoPressureSentence(): string {
  return "This press applies about 60 kg by itself. There is no light, medium, or firm knob.";
}

export function machineWarnings(blankName: string, pressureStyle: string): string[] {
  if (pressureStyle !== "auto") return [];
  const warnings: string[] = [];
  if (blankName === "Mouse mat") {
    warnings.push("If the foam dents, shorten the time. The pressure cannot be lightened.");
  }
  if (blankName === "Hoodie") {
    warnings.push("If the drawer will not close, the garment is too thick. Do not force it.");
  }
  return warnings;
}

export function splitLongPresses<T extends Step>(steps: T[], maxSeconds: number | null): T[] {
  if (maxSeconds == null || maxSeconds <= 0) return steps;
  const next: T[] = [];
  for (const step of steps) {
    if (step.kind === "press" && step.seconds != null && step.seconds > maxSeconds) {
      const rest = step.seconds - maxSeconds;
      const extra = `This press stops at ${maxSeconds} seconds, so press Start again for the rest.`;
      next.push({
        ...step,
        seconds: maxSeconds,
        detail: step.detail ? `${step.detail} ${extra}` : extra,
      });
      next.push({
        ...step,
        title: "Press the rest",
        seconds: rest,
        detail: `Press Start again for ${rest} seconds. The plate should still be at temperature.`,
      });
    } else {
      next.push(step);
    }
  }
  return next;
}
