import type { CoverSheet, Peel, Pressure, Step, StepKind } from "./types";

export type StarterSize = {
  label: string;
  widthMm?: number;
  heightMm?: number;
  diameterMm?: number;
  volumeMl?: number;
};

export type StarterMaterial = {
  name: string;
  groupName: string;
  polyesterPercent: number | null;
  sublimation: "yes" | "poor" | "no";
  heatNote: string;
};

export type StarterBlank = {
  name: string;
  category: string;
  shape: string;
  requiredPress: "flat" | "cup" | "any";
  notes: string;
  materials: string[];
  methods: string[];
  sites: string[];
  sizes: StarterSize[];
};

export type StarterRecipe = {
  name: string;
  blank: string;
  materials: string[];
  method: string;
  tempC: number;
  tempF: number | null;
  tempMinC: number | null;
  tempMaxC: number | null;
  timeSeconds: number;
  timeMinSeconds: number | null;
  timeMaxSeconds: number | null;
  pressure: Pressure;
  pressureNote: string;
  peel: Peel;
  peelWaitSeconds: number;
  prepressSeconds: number;
  coverSheet: CoverSheet;
  blowoutSheet: boolean;
  mirrorPrint: boolean;
  heatTape: boolean;
  shrinkSleeve: boolean;
  pressingPillow: boolean;
  coolDown: string;
  washWaitHours: number | null;
  careNote: string;
  warnings: string;
  sourceNote: string;
  notes: string;
  steps: Step[];
};

export type StarterEndProduct = {
  name: string;
  blank: string;
  material: string;
  method: string;
  recipe: string;
  sizeLabel: string | null;
  notes: string;
};

function step(kind: StepKind, title: string, seconds: number | null, detail: string): Step {
  return { kind, title, seconds, detail };
}

const subFabric = (seconds: number, tempC: number): Step[] => [
  step("prepress", "Pre-press", 4, "Close the press briefly so the garment is flat and dry."),
  step(
    "press",
    "Press",
    seconds,
    `Mirrored print face down at ${tempC}°C. Butcher paper on top, and another sheet inside so ink cannot ghost through.`,
  ),
  step("peel", "Peel hot", null, "Open the press and peel the paper straight away."),
];

const htvSteps = (seconds: number, tempC: number): Step[] => [
  step("prepress", "Pre-press", 3, "Two or three seconds is enough to flatten the fabric and drive off moisture."),
  step(
    "press",
    "Press",
    seconds,
    `Cover the vinyl with a Teflon sheet or parchment. ${tempC}°C, medium pressure. The design was cut in reverse.`,
  ),
  step("peel", "Peel", null, "Hot or cold both work for ordinary polyurethane vinyl. If an edge lifts, cover it and press again for 5–10 seconds."),
];

const dtfSteps = (seconds: number, tempC: number, finish: number, peel: string): Step[] => [
  step("prepress", "Pre-press", 5, "Five seconds, just to dry and flatten. Do not scorch the fabric."),
  step("press", "Press", seconds, `Film face down at ${tempC}°C. The print is mirrored.`),
  step("peel", "Peel", null, peel),
  step("finish", "Finish press", finish, "Cover the print with parchment or a Teflon sheet and press again. This locks the adhesive in."),
];

const SOURCES = {
  polyShirt:
    "Starter blended from common sublimation charts: 100% polyester shirts are usually 196–204°C (385–400°F) for 35–60 seconds at medium pressure. Joto Imaging Supplies lists 196°C for 45–60 seconds. The Stainless Depot lists 204°C for 35–40 seconds. Try 200°C for 45 seconds, then save a tested copy.",
  blendShirt:
    "The Stainless Depot lists 50/50 shirts around 149–177°C (300–350°F) for 15–30 seconds at light to medium pressure. Colour will be duller than 100% polyester. This is a starting point, not a brand guarantee.",
  polyRich:
    "Charts rarely agree on a 65% polyester shirt. This sits between the 50/50 window and a full polyester press. Compare it with a 100% polyester scrap before you run a batch.",
  hoodie:
    "Joto lists polyester hoodies at about 196°C (385°F) for 60 seconds, medium pressure. A pillow keeps seams and pockets from lifting the platen.",
  mug:
    "Ceramic mug charts cluster around 180–204°C. The Stainless Depot lists 11–15 oz mugs at about 180–200°C for 140 seconds, firm pressure. Joto lists about 204°C for 180–240 seconds. HTVRONT lists about 177–191°C for 150–180 seconds. Try 190°C for 180 seconds on a cup press.",
  tumbler:
    "Coated stainless tumblers are commonly 177–193°C (350–380°F). The Stainless Depot uses about 45 seconds a side. Joto uses about 182°C (360°F) for 60–90 seconds. This starter is 182°C for 70 seconds a side.",
  glass:
    "Coated glass is more fragile. The Stainless Depot suggests about 188–193°C (370–380°F) for 90 seconds a side, then a slow cool. Do not quench it.",
  mdf:
    "Joto lists MDF and hardboard sublimation blanks at about 204°C (400°F) for 45–60 seconds, medium pressure.",
  ceramicCoaster:
    "The Stainless Depot lists ceramic coasters at 193–204°C (380–400°F), medium pressure, 90 seconds, then a half turn and another 90 seconds.",
  mouse:
    "Neoprene mouse mats are commonly 193–204°C for 40–60 seconds at medium pressure (Joto; HTVRONT). Heavy pressure crushes the foam.",
  htv:
    "Siser EasyWeed instructions: 150°C / 305°F, medium pressure, 10–15 seconds, peel hot or cold, with a 2–3 second pre-press. This starter uses 12 seconds. Glitter, flock, and nylon films use different numbers.",
  dtfCotton:
    "Cotton DTF is often 149–163°C (300–325°F) for 10–15 seconds, medium-firm, then a second press of about 5–10 seconds. DTF Database and On Target Print Solutions sit in that window. Your film slip wins if it disagrees.",
  dtfPoly:
    "Polyester DTF is lower so the shirt dye does not crawl into the ink. Guides cluster around 132–143°C (270–290°F) for 8–12 seconds. Dark and red shirts are the risky ones.",
  dtfBlend:
    "Blend DTF sits between cotton and polyester. Higher polyester means less heat. Confirm with the film you bought.",
};

function recipe(input: StarterRecipe): StarterRecipe {
  return input;
}

const cottonHtv = recipe({
  name: "T-shirt · cotton · vinyl",
  blank: "T-shirt",
  materials: ["100% cotton", "Organic cotton"],
  method: "htv",
  tempC: 150,
  tempF: 305,
  tempMinC: 150,
  tempMaxC: 150,
  timeSeconds: 12,
  timeMinSeconds: 10,
  timeMaxSeconds: 15,
  pressure: "medium",
  pressureNote: "",
  peel: "either",
  peelWaitSeconds: 0,
  prepressSeconds: 3,
  coverSheet: "teflon",
  blowoutSheet: false,
  mirrorPrint: true,
  heatTape: false,
  shrinkSleeve: false,
  pressingPillow: false,
  coolDown: "air",
  washWaitHours: 24,
  careNote: "Wash inside out, warm or cold, with no fabric softener.",
  warnings: "",
  sourceNote: SOURCES.htv,
  notes: "Ordinary polyurethane film, the EasyWeed class. Make a separate recipe for glitter, flock, or nylon film.",
  steps: htvSteps(12, 150),
});

const cottonDtf = recipe({
  name: "T-shirt · cotton · DTF",
  blank: "T-shirt",
  materials: ["100% cotton", "Organic cotton"],
  method: "dtf",
  tempC: 160,
  tempF: 320,
  tempMinC: 149,
  tempMaxC: 163,
  timeSeconds: 15,
  timeMinSeconds: 10,
  timeMaxSeconds: 15,
  pressure: "medium-firm",
  pressureNote: "",
  peel: "cold",
  peelWaitSeconds: 20,
  prepressSeconds: 5,
  coverSheet: "none",
  blowoutSheet: false,
  mirrorPrint: true,
  heatTape: false,
  shrinkSleeve: false,
  pressingPillow: false,
  coolDown: "air",
  washWaitHours: 24,
  careNote: "Wash inside out on cold. Some films are warm-peel. Follow the slip in the pack if it disagrees.",
  warnings: "",
  sourceNote: SOURCES.dtfCotton,
  notes: "",
  steps: dtfSteps(15, 160, 10, "Wait about 20 seconds so the film is cool or only warm, then peel. If your film is marked hot peel, peel straight away instead."),
});

const polySub = recipe({
  name: "T-shirt · 100% polyester · sublimation",
  blank: "T-shirt",
  materials: ["100% polyester"],
  method: "sublimation",
  tempC: 200,
  tempF: 392,
  tempMinC: 196,
  tempMaxC: 204,
  timeSeconds: 45,
  timeMinSeconds: 35,
  timeMaxSeconds: 60,
  pressure: "medium",
  pressureNote: "",
  peel: "hot",
  peelWaitSeconds: 0,
  prepressSeconds: 4,
  coverSheet: "butcher",
  blowoutSheet: true,
  mirrorPrint: true,
  heatTape: false,
  shrinkSleeve: false,
  pressingPillow: false,
  coolDown: "air",
  washWaitHours: null,
  careNote: "Wash inside out in cold water. Skip fabric softener and a hot tumble dryer.",
  warnings: "Light or white shirts only. Sublimation ink is transparent, so it disappears on dark fabric.",
  sourceNote: SOURCES.polyShirt,
  notes: "A light tack spray or a small piece of heat tape stops the paper shifting. Do not soak the shirt.",
  steps: subFabric(45, 200),
});

const performanceSub = recipe({
  name: "T-shirt · performance polyester · sublimation",
  blank: "T-shirt",
  materials: ["Performance polyester"],
  method: "sublimation",
  tempC: 196,
  tempF: 385,
  tempMinC: 193,
  tempMaxC: 204,
  timeSeconds: 40,
  timeMinSeconds: 35,
  timeMaxSeconds: 50,
  pressure: "light",
  pressureNote: "Light enough that the cloth does not glaze.",
  peel: "hot",
  peelWaitSeconds: 0,
  prepressSeconds: 3,
  coverSheet: "butcher",
  blowoutSheet: true,
  mirrorPrint: true,
  heatTape: false,
  shrinkSleeve: false,
  pressingPillow: false,
  coolDown: "air",
  washWaitHours: null,
  careNote: "Wash inside out in cold water.",
  warnings: "Light colours only. Performance cloth marks easily. If you see a shiny box, use still lighter pressure and add 5 seconds.",
  sourceNote: "Same polyester dye window as a standard shirt, with less pressure because performance fabric shows press marks. Confirm on a scrap of the same shirt.",
  notes: "",
  steps: subFabric(40, 196),
});

const halfSub = recipe({
  name: "T-shirt · 50/50 · sublimation",
  blank: "T-shirt",
  materials: ["50/50 cotton-polyester"],
  method: "sublimation",
  tempC: 163,
  tempF: 325,
  tempMinC: 149,
  tempMaxC: 177,
  timeSeconds: 25,
  timeMinSeconds: 15,
  timeMaxSeconds: 30,
  pressure: "light",
  pressureNote: "",
  peel: "hot",
  peelWaitSeconds: 0,
  prepressSeconds: 4,
  coverSheet: "butcher",
  blowoutSheet: true,
  mirrorPrint: true,
  heatTape: false,
  shrinkSleeve: false,
  pressingPillow: false,
  coolDown: "air",
  washWaitHours: null,
  careNote: "Expect a vintage, lighter print. Wash cold.",
  warnings: "The cotton half cannot hold the dye, so the print looks faded. Do not use this setting on 100% cotton.",
  sourceNote: SOURCES.blendShirt,
  notes: "",
  steps: subFabric(25, 163),
});

const polyRichSub = recipe({
  name: "T-shirt · 65% polyester · sublimation",
  blank: "T-shirt",
  materials: ["65% polyester / 35% cotton"],
  method: "sublimation",
  tempC: 177,
  tempF: 350,
  tempMinC: 163,
  tempMaxC: 190,
  timeSeconds: 30,
  timeMinSeconds: 25,
  timeMaxSeconds: 40,
  pressure: "light",
  pressureNote: "",
  peel: "hot",
  peelWaitSeconds: 0,
  prepressSeconds: 4,
  coverSheet: "butcher",
  blowoutSheet: true,
  mirrorPrint: true,
  heatTape: false,
  shrinkSleeve: false,
  pressingPillow: false,
  coolDown: "air",
  washWaitHours: null,
  careNote: "Wash cold. Brighter than 50/50, quieter than 100% polyester.",
  warnings: "Light shirts only. If the cotton scorches before the print is strong, stop and use vinyl or DTF instead.",
  sourceNote: SOURCES.polyRich,
  notes: "",
  steps: subFabric(30, 177),
});

function fabricVinyl(
  name: string,
  materials: string[],
  seconds: number,
  warnings: string,
  pressure: Pressure = "medium",
): StarterRecipe {
  return recipe({
    ...cottonHtv,
    name,
    materials,
    timeSeconds: seconds,
    pressure,
    warnings,
    steps: htvSteps(seconds, 150),
  });
}

function fabricDtf(
  name: string,
  materials: string[],
  tempC: number,
  tempF: number,
  tempMinC: number,
  tempMaxC: number,
  seconds: number,
  finish: number,
  pressure: Pressure,
  peel: Peel,
  warnings: string,
  sourceNote: string,
): StarterRecipe {
  return recipe({
    ...cottonDtf,
    name,
    materials,
    tempC,
    tempF,
    tempMinC,
    tempMaxC,
    timeSeconds: seconds,
    pressure,
    peel,
    warnings,
    sourceNote,
    steps: dtfSteps(
      seconds,
      tempC,
      finish,
      peel === "cold"
        ? "Wait about 20 seconds, then peel. If the film is marked hot peel, ignore the wait."
        : "Peel while the film is warm, within a few seconds of opening, unless the pack says cold.",
    ),
  });
}

const teeRecipes: StarterRecipe[] = [
  polySub,
  performanceSub,
  halfSub,
  polyRichSub,
  cottonHtv,
  fabricVinyl("T-shirt · linen · vinyl", ["Linen"], 15, "Linen scorches more readily than cotton. Keep the pressure at medium and do not wander above 150°C."),
  fabricVinyl("T-shirt · canvas · vinyl", ["Canvas"], 15, "", "medium-firm"),
  fabricVinyl(
    "T-shirt · polyester · vinyl",
    ["100% polyester"],
    12,
    "Dark polyester can tint the vinyl. If a test looks stained, drop to 140°C and add a few seconds.",
  ),
  fabricVinyl(
    "T-shirt · performance polyester · vinyl",
    ["Performance polyester"],
    12,
    "Very likely to dye-migrate and to leave a shiny box. Test at 140°C if 150°C stains or glazes the cloth.",
    "light",
  ),
  fabricVinyl("T-shirt · 50/50 · vinyl", ["50/50 cotton-polyester"], 12, "Watch dark blends for dye migrating into the vinyl."),
  fabricVinyl("T-shirt · cotton-rich blend · vinyl", ["65% cotton / 35% polyester"], 12, ""),
  fabricVinyl(
    "T-shirt · polyester-rich blend · vinyl",
    ["65% polyester / 35% cotton"],
    12,
    "Treat it more like polyester. Drop toward 140°C if the vinyl picks up the shirt colour.",
  ),
  fabricVinyl("T-shirt · tri-blend · vinyl", ["Tri-blend"], 12, "Tri-blends are thin. Stay at medium pressure so the platen does not polish the cloth.", "medium"),
  cottonDtf,
  fabricDtf("T-shirt · linen · DTF", ["Linen"], 160, 320, 154, 166, 15, 8, "medium-firm", "warm", "Linen can scorch. Do not push past the top of the window.", SOURCES.dtfCotton),
  fabricDtf("T-shirt · canvas · DTF", ["Canvas"], 160, 320, 152, 163, 15, 10, "medium-firm", "warm", "", SOURCES.dtfCotton),
  fabricDtf(
    "T-shirt · polyester · DTF",
    ["100% polyester"],
    138,
    280,
    132,
    143,
    12,
    5,
    "medium",
    "cold",
    "If white ink turns pink, grey, or blue, the shirt dye has moved. Drop 5°C and add 3 seconds. Do not fix it by going hotter.",
    SOURCES.dtfPoly,
  ),
  fabricDtf(
    "T-shirt · performance polyester · DTF",
    ["Performance polyester"],
    132,
    270,
    129,
    138,
    10,
    5,
    "light",
    "cold",
    "High dye-migration risk and easy press marks. Light pressure. A low-bleed film is worth it on dark shirts.",
    SOURCES.dtfPoly,
  ),
  fabricDtf("T-shirt · 50/50 · DTF", ["50/50 cotton-polyester"], 154, 310, 143, 160, 15, 8, "medium", "warm", "More polyester means you should sit at the cooler end of the window.", SOURCES.dtfBlend),
  fabricDtf("T-shirt · cotton-rich blend · DTF", ["65% cotton / 35% polyester"], 157, 315, 149, 163, 15, 8, "medium-firm", "warm", "", SOURCES.dtfBlend),
  fabricDtf(
    "T-shirt · polyester-rich blend · DTF",
    ["65% polyester / 35% cotton"],
    143,
    290,
    138,
    149,
    12,
    5,
    "medium",
    "cold",
    "Closer to a polyester press. Watch white ink on dark shirts.",
    SOURCES.dtfBlend,
  ),
  fabricDtf(
    "T-shirt · tri-blend · DTF",
    ["Tri-blend"],
    149,
    300,
    143,
    154,
    12,
    5,
    "medium",
    "cold",
    "Thin cloth. Medium pressure, and stop if the surface shines.",
    SOURCES.dtfBlend,
  ),
  fabricDtf(
    "T-shirt · nylon · DTF",
    ["Nylon"],
    132,
    270,
    121,
    138,
    10,
    5,
    "light",
    "cold",
    "A water-repellent coating will stop the film sticking. That is the coating, not a reason to add heat. Nylon melts if you treat it like cotton.",
    "Nylon DTF guides sit roughly at 121–143°C, often nearer 132°C, with light pressure and a cold peel.",
  ),
];

function forHoodie(base: StarterRecipe, seconds: number, extraWarning = ""): StarterRecipe {
  const steps = base.steps.map((item) => {
    if (item.kind === "press" && item.seconds) {
      return {
        ...item,
        seconds,
        detail: `${item.detail} Slide a pressing pillow under seams, pockets, or the zip so the platen sits flat.`,
      };
    }
    return item;
  });
  return {
    ...base,
    name: base.name.replace("T-shirt", "Hoodie"),
    blank: "Hoodie",
    timeSeconds: seconds,
    pressingPillow: true,
    warnings: [base.warnings, extraWarning].filter(Boolean).join(" "),
    steps,
  };
}

const hoodieRecipes: StarterRecipe[] = [
  recipe({
    name: "Hoodie · 100% polyester · sublimation",
    blank: "Hoodie",
    materials: ["100% polyester"],
    method: "sublimation",
    tempC: 196,
    tempF: 385,
    tempMinC: 193,
    tempMaxC: 204,
    timeSeconds: 60,
    timeMinSeconds: 50,
    timeMaxSeconds: 70,
    pressure: "medium",
    pressureNote: "",
    peel: "hot",
    peelWaitSeconds: 0,
    prepressSeconds: 5,
    coverSheet: "butcher",
    blowoutSheet: true,
    mirrorPrint: true,
    heatTape: false,
    shrinkSleeve: false,
    pressingPillow: true,
    coolDown: "air",
    washWaitHours: null,
    careNote: "Wash inside out, cold.",
    warnings: "Light or white fleece only.",
    sourceNote: SOURCES.hoodie,
    notes: "Thicker than a T-shirt, so the press is longer rather than hotter.",
    steps: [
      step("prepress", "Pre-press", 5, "Dry the fleece. Use a pillow if the hood seam or a pocket lifts the garment."),
      step("press", "Press", 60, "Mirrored print at 196°C. Butcher paper on top and inside. Pillow under any thick seam."),
      step("peel", "Peel hot", null, "Peel as soon as you open the press."),
    ],
  }),
  forHoodie(cottonHtv, 15),
  forHoodie(cottonDtf, 15),
  forHoodie(teeRecipes.find((item) => item.name === "T-shirt · polyester · vinyl")!, 15),
  forHoodie(teeRecipes.find((item) => item.name === "T-shirt · polyester · DTF")!, 12),
  forHoodie(teeRecipes.find((item) => item.name === "T-shirt · 50/50 · vinyl")!, 15),
  forHoodie(teeRecipes.find((item) => item.name === "T-shirt · 50/50 · DTF")!, 15),
  forHoodie(teeRecipes.find((item) => item.name === "T-shirt · cotton-rich blend · vinyl")!, 15),
  forHoodie(teeRecipes.find((item) => item.name === "T-shirt · cotton-rich blend · DTF")!, 15),
];

const hardRecipes: StarterRecipe[] = [
  recipe({
    name: "Mug · coated ceramic · sublimation",
    blank: "Mug",
    materials: ["Polymer-coated ceramic"],
    method: "sublimation",
    tempC: 190,
    tempF: 374,
    tempMinC: 180,
    tempMaxC: 204,
    timeSeconds: 180,
    timeMinSeconds: 140,
    timeMaxSeconds: 240,
    pressure: "firm",
    pressureNote: "The mug should be held firmly by the element, with no rock.",
    peel: "warm",
    peelWaitSeconds: 20,
    prepressSeconds: 0,
    coverSheet: "none",
    blowoutSheet: false,
    mirrorPrint: true,
    heatTape: true,
    shrinkSleeve: false,
    pressingPillow: false,
    coolDown: "rack",
    washWaitHours: null,
    careNote: "Hand wash is kinder while you are still testing a new blank brand.",
    warnings: "The mug must be sold as sublimation-coated. A plain ceramic mug will not hold the ink. Use the cup press, not the flat shirt press.",
    sourceNote: SOURCES.mug,
    notes: "330 ml and 440 ml share this starting point. A very thick mug may need another 20 seconds, not more heat.",
    steps: [
      step("note", "Tape the wrap", null, "Clean and dry the mug. Tape the mirrored paper tightly with heat tape so there are no wrinkles."),
      step("press", "Press", 180, "190°C in the cup press, firm contact, 180 seconds."),
      step("peel", "Peel warm", null, "Wait about 20 seconds. If the ink smears, it was too hot to peel. Wait longer next time."),
      step("cool", "Cool on a rack", null, "Do not stack hot mugs. Let each one cool on its own."),
    ],
  }),
  recipe({
    name: "Tumbler · coated stainless · sublimation",
    blank: "Tumbler",
    materials: ["Polymer-coated stainless steel"],
    method: "sublimation",
    tempC: 182,
    tempF: 360,
    tempMinC: 177,
    tempMaxC: 193,
    timeSeconds: 70,
    timeMinSeconds: 45,
    timeMaxSeconds: 90,
    pressure: "firm",
    pressureNote: "",
    peel: "warm",
    peelWaitSeconds: 15,
    prepressSeconds: 0,
    coverSheet: "none",
    blowoutSheet: false,
    mirrorPrint: true,
    heatTape: true,
    shrinkSleeve: false,
    pressingPillow: false,
    coolDown: "rack",
    washWaitHours: null,
    careNote: "Cool fully before a wash test.",
    warnings: "Needs a sublimation coating and a cup or tumbler press. If the element does not reach around, press the second side.",
    sourceNote: SOURCES.tumbler,
    notes: "A shrink sleeve is useful if you have one. It is not required for this starter.",
    steps: [
      step("note", "Wrap and tape", null, "Clean, dry, and tape the mirrored wrap tightly. A shrink sleeve can hold it if you have one."),
      step("press", "Press the first side", 70, "182°C, firm pressure, 70 seconds."),
      step("rotate", "Turn to the unpressed side", null, "If the heating element did not cover the whole wrap, rotate the tumbler."),
      step("press", "Press the second side", 70, "Another 70 seconds at the same heat."),
      step("peel", "Peel warm", null, "Wait about 15 seconds, then peel. Cool on a rack."),
    ],
  }),
  recipe({
    name: "Tumbler · coated glass · sublimation",
    blank: "Tumbler",
    materials: ["Polymer-coated glass"],
    method: "sublimation",
    tempC: 188,
    tempF: 370,
    tempMinC: 182,
    tempMaxC: 193,
    timeSeconds: 90,
    timeMinSeconds: 80,
    timeMaxSeconds: 120,
    pressure: "firm",
    pressureNote: "Firm, but the glass must not be forced into a bent element.",
    peel: "warm",
    peelWaitSeconds: 20,
    prepressSeconds: 0,
    coverSheet: "none",
    blowoutSheet: false,
    mirrorPrint: true,
    heatTape: true,
    shrinkSleeve: false,
    pressingPillow: false,
    coolDown: "air",
    washWaitHours: null,
    careNote: "Cool slowly on a rack. A sudden cold surface can crack the glass.",
    warnings: "Confirm the glass is coated for sublimation. Do not drop it into cold water.",
    sourceNote: SOURCES.glass,
    notes: "",
    steps: [
      step("note", "Wrap and tape", null, "Tape the mirrored wrap. Warm the glass in the press for a few seconds before the full press if the room is cold."),
      step("press", "Press the first side", 90, "188°C for 90 seconds."),
      step("rotate", "Turn", null, "Rotate if the element does not cover the wrap."),
      step("press", "Press the second side", 90, "Another 90 seconds."),
      step("cool", "Cool slowly", null, "Peel when the paper is only warm, then cool in the air. No water bath."),
    ],
  }),
  recipe({
    name: "Square coaster · MDF · sublimation",
    blank: "Square coaster",
    materials: ["Coated MDF"],
    method: "sublimation",
    tempC: 204,
    tempF: 400,
    tempMinC: 196,
    tempMaxC: 204,
    timeSeconds: 50,
    timeMinSeconds: 45,
    timeMaxSeconds: 60,
    pressure: "medium",
    pressureNote: "",
    peel: "hot",
    peelWaitSeconds: 0,
    prepressSeconds: 0,
    coverSheet: "teflon",
    blowoutSheet: false,
    mirrorPrint: true,
    heatTape: true,
    shrinkSleeve: false,
    pressingPillow: false,
    coolDown: "rack",
    washWaitHours: null,
    careNote: "Cool each coaster separately. Stacking them hot can mark the face.",
    warnings: "The board needs a sublimation coating. Bare MDF will not hold a durable print.",
    sourceNote: SOURCES.mdf,
    notes: "9 cm and 10 cm use the same heat. Tape the paper so the corners cannot curl.",
    steps: [
      step("note", "Tape the paper", null, "Lint-roll the face. Tape the mirrored paper flat with heat tape."),
      step("press", "Press", 50, "204°C, medium pressure, 50 seconds. Teflon or butcher paper protects the platen."),
      step("peel", "Peel hot", null, "Peel straight away, then cool the coaster flat and alone."),
    ],
  }),
  recipe({
    name: "Round coaster · MDF · sublimation",
    blank: "Round coaster",
    materials: ["Coated MDF"],
    method: "sublimation",
    tempC: 204,
    tempF: 400,
    tempMinC: 196,
    tempMaxC: 204,
    timeSeconds: 50,
    timeMinSeconds: 45,
    timeMaxSeconds: 60,
    pressure: "medium",
    pressureNote: "",
    peel: "hot",
    peelWaitSeconds: 0,
    prepressSeconds: 0,
    coverSheet: "teflon",
    blowoutSheet: false,
    mirrorPrint: true,
    heatTape: true,
    shrinkSleeve: false,
    pressingPillow: false,
    coolDown: "rack",
    washWaitHours: null,
    careNote: "Cool separately.",
    warnings: "Needs a coated blank.",
    sourceNote: SOURCES.mdf,
    notes: "",
    steps: [
      step("note", "Tape the paper", null, "Tape the mirrored paper to the face."),
      step("press", "Press", 50, "204°C, medium pressure, 50 seconds."),
      step("peel", "Peel hot", null, "Peel hot and cool flat."),
    ],
  }),
  recipe({
    name: "Square coaster · ceramic · sublimation",
    blank: "Square coaster",
    materials: ["Polymer-coated ceramic"],
    method: "sublimation",
    tempC: 199,
    tempF: 390,
    tempMinC: 193,
    tempMaxC: 204,
    timeSeconds: 90,
    timeMinSeconds: 60,
    timeMaxSeconds: 90,
    pressure: "medium",
    pressureNote: "Medium. Too heavy and the ceramic can crack.",
    peel: "warm",
    peelWaitSeconds: 10,
    prepressSeconds: 0,
    coverSheet: "teflon",
    blowoutSheet: false,
    mirrorPrint: true,
    heatTape: true,
    shrinkSleeve: false,
    pressingPillow: false,
    coolDown: "rack",
    washWaitHours: null,
    careNote: "Cool flat, not stacked.",
    warnings: "Light pressure is safer than forcing the platen. If a corner is pale, the second press after turning is doing the work. Do not jump the heat.",
    sourceNote: SOURCES.ceramicCoaster,
    notes: "",
    steps: [
      step("note", "Tape the paper", null, "Lint-roll the ceramic and tape the mirrored paper over the face."),
      step("press", "First press", 90, "199°C, medium pressure, 90 seconds."),
      step("rotate", "Turn 180 degrees", null, "Lift the coaster and turn it so the far edge swaps places. Keep the paper taped on."),
      step("press", "Second press", 90, "Another 90 seconds at the same heat."),
      step("cool", "Cool alone", null, "Peel when the paper is warm, not smoking hot, and cool it flat."),
    ],
  }),
  recipe({
    name: "Round coaster · ceramic · sublimation",
    blank: "Round coaster",
    materials: ["Polymer-coated ceramic"],
    method: "sublimation",
    tempC: 199,
    tempF: 390,
    tempMinC: 193,
    tempMaxC: 204,
    timeSeconds: 90,
    timeMinSeconds: 60,
    timeMaxSeconds: 90,
    pressure: "medium",
    pressureNote: "Medium, so the ceramic is not crushed.",
    peel: "warm",
    peelWaitSeconds: 10,
    prepressSeconds: 0,
    coverSheet: "teflon",
    blowoutSheet: false,
    mirrorPrint: true,
    heatTape: true,
    shrinkSleeve: false,
    pressingPillow: false,
    coolDown: "rack",
    washWaitHours: null,
    careNote: "Cool separately.",
    warnings: "If the rim is pale, the turn-and-press step was uneven, or the tape let the paper shift.",
    sourceNote: SOURCES.ceramicCoaster,
    notes: "9 cm and 10 cm round coasters share this heat.",
    steps: [
      step("note", "Tape the paper", null, "Tape the mirrored paper onto the face."),
      step("press", "First press", 90, "199°C, medium pressure, 90 seconds."),
      step("rotate", "Turn 180 degrees", null, "Turn the coaster halfway so both sides of the circle see the same heat."),
      step("press", "Second press", 90, "Another 90 seconds."),
      step("cool", "Cool alone", null, "Peel warm and cool flat, not in a stack."),
    ],
  }),
  recipe({
    name: "Mouse mat · neoprene · sublimation",
    blank: "Mouse mat",
    materials: ["Neoprene"],
    method: "sublimation",
    tempC: 199,
    tempF: 390,
    tempMinC: 193,
    tempMaxC: 204,
    timeSeconds: 50,
    timeMinSeconds: 40,
    timeMaxSeconds: 60,
    pressure: "medium",
    pressureNote: "Stop as soon as contact is even. Extra force dents the foam.",
    peel: "hot",
    peelWaitSeconds: 0,
    prepressSeconds: 0,
    coverSheet: "teflon",
    blowoutSheet: false,
    mirrorPrint: true,
    heatTape: true,
    shrinkSleeve: false,
    pressingPillow: false,
    coolDown: "rack",
    washWaitHours: null,
    careNote: "Let it lie flat while it cools so the foam can recover.",
    warnings: "A shiny dent means the pressure was too high. Next time, lighter pressure and 5 extra seconds. Do not pre-press hard.",
    sourceNote: SOURCES.mouse,
    notes: "23 × 19 cm and 25 × 21 cm use the same heat. The cloth face is polyester, which is why sublimation works.",
    steps: [
      step("note", "Lint-roll", null, "Roll the cloth face. Tape the mirrored paper at the edges so it cannot shift. Do not pre-press hard."),
      step("press", "Press", 50, "199°C, medium pressure, 50 seconds. Teflon on top."),
      step("peel", "Peel hot", null, "Peel straight away and leave the mat flat to cool."),
    ],
  }),
];

export const starter = {
  methods: [
    {
      slug: "sublimation",
      name: "Sublimation",
      summary: "Dye turns to gas and bonds with polyester or a polymer coating. Light colours only.",
    },
    {
      slug: "htv",
      name: "Vinyl (HTV)",
      summary: "Cut heat-transfer vinyl, pressed onto fabric. The film brand changes the temperature.",
    },
    {
      slug: "dtf",
      name: "DTF",
      summary: "A printed film pressed onto fabric. Cotton runs hotter than polyester.",
    },
  ],
  materials: [
    { name: "100% cotton", groupName: "Natural", polyesterPercent: 0, sublimation: "no", heatNote: "Forgiving for vinyl and DTF. It scorches if a sublimation temperature is used by mistake." },
    { name: "Organic cotton", groupName: "Natural", polyesterPercent: 0, sublimation: "no", heatNote: "Press like standard cotton unless the brand says the cloth is lighter." },
    { name: "Linen", groupName: "Natural", polyesterPercent: 0, sublimation: "no", heatNote: "Natural fibre. It scorches sooner than cotton, so do not borrow a polyester sublimation setting." },
    { name: "Canvas", groupName: "Natural", polyesterPercent: 0, sublimation: "no", heatNote: "Thick natural cloth. It likes firm contact and a few extra seconds, not extra heat." },
    { name: "100% polyester", groupName: "Synthetic", polyesterPercent: 100, sublimation: "yes", heatNote: "Best sublimation fabric. Dark colours can bleed dye into vinyl and DTF." },
    { name: "Performance polyester", groupName: "Synthetic", polyesterPercent: 100, sublimation: "yes", heatNote: "Sublimates well on light colours. Shows shiny press marks, and dark dye migrates very easily." },
    { name: "Nylon", groupName: "Synthetic", polyesterPercent: 0, sublimation: "no", heatNote: "Heat sensitive. DTF only, at a low temperature. Ordinary vinyl is a poor match." },
    { name: "50/50 cotton-polyester", groupName: "Blend", polyesterPercent: 50, sublimation: "poor", heatNote: "Sublimation looks faded. Vinyl and DTF are the cleaner choice on dark blends." },
    { name: "65% cotton / 35% polyester", groupName: "Blend", polyesterPercent: 35, sublimation: "no", heatNote: "Cotton-rich. Treat it like cotton for vinyl and DTF. Not enough polyester for sublimation." },
    { name: "65% polyester / 35% cotton", groupName: "Blend", polyesterPercent: 65, sublimation: "poor", heatNote: "Polyester-rich. Sublimation is usable but quieter than a 100% polyester shirt." },
    { name: "Tri-blend", groupName: "Blend", polyesterPercent: 25, sublimation: "no", heatNote: "Usually cotton with polyester and rayon. Thin, and easy to polish with too much pressure." },
    { name: "Polymer-coated ceramic", groupName: "Coated blank", polyesterPercent: null, sublimation: "yes", heatNote: "Mugs and ceramic coasters need the coating. Uncoated ceramic will not hold sublimation." },
    { name: "Polymer-coated stainless steel", groupName: "Coated blank", polyesterPercent: null, sublimation: "yes", heatNote: "Tumblers and bottles must be sold as sublimation blanks." },
    { name: "Coated MDF", groupName: "Coated blank", polyesterPercent: null, sublimation: "yes", heatNote: "Hardboard coasters and panels. The coating is what the dye bonds to." },
    { name: "Neoprene", groupName: "Synthetic", polyesterPercent: null, sublimation: "yes", heatNote: "Mouse mats. The cloth face takes sublimation. Heavy pressure crushes the foam." },
    { name: "Polymer-coated glass", groupName: "Coated blank", polyesterPercent: null, sublimation: "yes", heatNote: "Can crack from a shock of heat or a cold bench. Cool it slowly." },
  ] satisfies StarterMaterial[],
  blanks: [
    {
      name: "T-shirt",
      category: "Shirts",
      shape: "none",
      requiredPress: "flat",
      notes: "Read the fabric on the label. Letter sizes are the usual UK adult sizes. Chest measurements change by brand, so keep the brand in the stock note.",
      methods: ["sublimation", "htv", "dtf"],
      materials: [
        "100% cotton",
        "Organic cotton",
        "Linen",
        "Canvas",
        "100% polyester",
        "Performance polyester",
        "Nylon",
        "50/50 cotton-polyester",
        "65% cotton / 35% polyester",
        "65% polyester / 35% cotton",
        "Tri-blend",
      ],
      sites: ["Left chest", "Centre chest", "Full front", "Full back", "Left sleeve", "Right sleeve"],
      sizes: ["XS", "S", "M", "L", "XL", "2XL", "3XL"].map((label) => ({ label })),
    },
    {
      name: "Hoodie",
      category: "Shirts",
      shape: "none",
      requiredPress: "flat",
      notes: "Use a pressing pillow over seams, pockets, and zips.",
      methods: ["sublimation", "htv", "dtf"],
      materials: [
        "100% cotton",
        "Organic cotton",
        "100% polyester",
        "50/50 cotton-polyester",
        "65% cotton / 35% polyester",
      ],
      sites: ["Centre chest", "Full front", "Full back", "Left chest", "Sleeve"],
      sizes: ["S", "M", "L", "XL", "2XL", "3XL"].map((label) => ({ label })),
    },
    {
      name: "Mug",
      category: "Drinkware",
      shape: "none",
      requiredPress: "cup",
      notes: "Cup press. 330 ml and 440 ml share a starting heat.",
      methods: ["sublimation"],
      materials: ["Polymer-coated ceramic"],
      sites: ["Wrap", "Front panel"],
      sizes: [
        { label: "330 ml (11 oz)", volumeMl: 330 },
        { label: "440 ml (15 oz)", volumeMl: 440 },
      ],
    },
    {
      name: "Tumbler",
      category: "Drinkware",
      shape: "none",
      requiredPress: "cup",
      notes: "Cup or tumbler element. Press the second side if the element does not cover the wrap.",
      methods: ["sublimation"],
      materials: ["Polymer-coated stainless steel", "Polymer-coated glass"],
      sites: ["Full wrap"],
      sizes: [{ label: "590 ml (20 oz)", volumeMl: 590 }],
    },
    {
      name: "Square coaster",
      category: "Coasters",
      shape: "square",
      requiredPress: "flat",
      notes: "Tape the paper so the corners cannot curl.",
      methods: ["sublimation"],
      materials: ["Coated MDF", "Polymer-coated ceramic"],
      sites: ["Full face"],
      sizes: [
        { label: "9 cm", widthMm: 90, heightMm: 90 },
        { label: "10 cm", widthMm: 100, heightMm: 100 },
      ],
    },
    {
      name: "Round coaster",
      category: "Coasters",
      shape: "round",
      requiredPress: "flat",
      notes: "Ceramic rounds usually need a second press after a half turn.",
      methods: ["sublimation"],
      materials: ["Coated MDF", "Polymer-coated ceramic"],
      sites: ["Full face"],
      sizes: [
        { label: "9 cm", diameterMm: 90 },
        { label: "10 cm", diameterMm: 100 },
      ],
    },
    {
      name: "Mouse mat",
      category: "Mouse mats",
      shape: "none",
      requiredPress: "flat",
      notes: "Medium pressure. Heavy pressure leaves a dent in the foam.",
      methods: ["sublimation"],
      materials: ["Neoprene"],
      sites: ["Full face"],
      sizes: [
        { label: "23 × 19 cm", widthMm: 230, heightMm: 190 },
        { label: "25 × 21 cm", widthMm: 250, heightMm: 210 },
      ],
    },
  ] satisfies StarterBlank[],
  recipes: [...teeRecipes, ...hoodieRecipes, ...hardRecipes],
  endProducts: [
    {
      name: "Polyester sublimation T-shirt",
      blank: "T-shirt",
      material: "100% polyester",
      method: "sublimation",
      recipe: "T-shirt · 100% polyester · sublimation",
      sizeLabel: null,
      notes: "Light or white polyester.",
    },
    {
      name: "Cotton T-shirt with vinyl",
      blank: "T-shirt",
      material: "100% cotton",
      method: "htv",
      recipe: "T-shirt · cotton · vinyl",
      sizeLabel: null,
      notes: "Ordinary polyurethane film.",
    },
    {
      name: "Cotton T-shirt with DTF",
      blank: "T-shirt",
      material: "100% cotton",
      method: "dtf",
      recipe: "T-shirt · cotton · DTF",
      sizeLabel: null,
      notes: "",
    },
    {
      name: "Square MDF coaster",
      blank: "Square coaster",
      material: "Coated MDF",
      method: "sublimation",
      recipe: "Square coaster · MDF · sublimation",
      sizeLabel: "9 cm",
      notes: "",
    },
    {
      name: "Round ceramic coaster",
      blank: "Round coaster",
      material: "Polymer-coated ceramic",
      method: "sublimation",
      recipe: "Round coaster · ceramic · sublimation",
      sizeLabel: "10 cm",
      notes: "Two presses, with a half turn between them.",
    },
    {
      name: "Mouse mat",
      blank: "Mouse mat",
      material: "Neoprene",
      method: "sublimation",
      recipe: "Mouse mat · neoprene · sublimation",
      sizeLabel: "23 × 19 cm",
      notes: "",
    },
    {
      name: "Printed mug",
      blank: "Mug",
      material: "Polymer-coated ceramic",
      method: "sublimation",
      recipe: "Mug · coated ceramic · sublimation",
      sizeLabel: "330 ml (11 oz)",
      notes: "Cup press.",
    },
  ] satisfies StarterEndProduct[],
};

export function starterIssues(): string[] {
  const issues: string[] = [];
  const materialNames = new Set(starter.materials.map((material) => material.name));
  const methodSlugs = new Set(starter.methods.map((method) => method.slug));
  const blanks = new Map(starter.blanks.map((blank) => [blank.name, blank]));
  const seenPairs = new Set<string>();

  if (new Set(starter.recipes.map((item) => item.name)).size !== starter.recipes.length) {
    issues.push("Duplicate recipe name");
  }

  for (const item of starter.recipes) {
    const blank = blanks.get(item.blank);
    if (!blank) issues.push(`Missing blank ${item.blank}`);
    if (!methodSlugs.has(item.method)) issues.push(`Missing method ${item.method}`);
    if (item.tempC < 120 || item.tempC > 210) issues.push(`Temperature out of range on ${item.name}`);
    if (!item.steps.some((entry) => entry.kind === "press" && entry.seconds && entry.seconds > 0)) {
      issues.push(`No press step on ${item.name}`);
    }
    for (const materialName of item.materials) {
      if (!materialNames.has(materialName)) issues.push(`Missing material ${materialName} on ${item.name}`);
      const material = starter.materials.find((entry) => entry.name === materialName);
      if (item.method === "sublimation" && material?.sublimation === "no") {
        issues.push(`Sublimation on ${materialName}`);
      }
      if (blank && !blank.materials.includes(materialName)) {
        issues.push(`${item.blank} does not list ${materialName}`);
      }
      const key = `${item.blank}|${materialName}|${item.method}`;
      if (seenPairs.has(key)) issues.push(`Duplicate setting for ${key}`);
      seenPairs.add(key);
    }
    if (blank && !blank.methods.includes(item.method)) issues.push(`${item.blank} does not allow ${item.method}`);
  }

  for (const product of starter.endProducts) {
    if (!starter.recipes.some((item) => item.name === product.recipe)) issues.push(`End product recipe missing: ${product.recipe}`);
    const blank = blanks.get(product.blank);
    if (!blank) issues.push(`End product blank missing: ${product.blank}`);
    if (product.sizeLabel && blank && !blank.sizes.some((size) => size.label === product.sizeLabel)) {
      issues.push(`End product size missing: ${product.name}`);
    }
  }

  return issues;
}
