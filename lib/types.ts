export type SublimationFit = "yes" | "poor" | "no";
export type PressKind = "flat" | "cup" | "any";
export type Pressure = "light" | "medium" | "medium-firm" | "firm" | "heavy";
export type Peel = "hot" | "warm" | "cold" | "either";
export type CoverSheet = "none" | "teflon" | "parchment" | "butcher";
export type StepKind = "prepress" | "press" | "peel" | "rotate" | "finish" | "cool" | "note";
export type RecipeStatus = "starter" | "tested";

export type Step = {
  kind: StepKind;
  title: string;
  seconds: number | null;
  detail: string;
};

export type Material = {
  id: number;
  name: string;
  groupName: string;
  polyesterPercent: number | null;
  sublimation: SublimationFit;
  heatNote: string;
  sortOrder: number;
};

export type Method = {
  id: number;
  name: string;
  slug: string;
  summary: string;
  enabled: boolean;
  sortOrder: number;
};

export type Size = {
  id: number;
  blankId: number;
  label: string;
  widthMm: number | null;
  heightMm: number | null;
  diameterMm: number | null;
  volumeMl: number | null;
  sortOrder: number;
};

export type PrintSite = {
  id: number;
  blankId: number;
  name: string;
  sortOrder: number;
};

export type Blank = {
  id: number;
  name: string;
  category: string;
  shape: string;
  requiredPress: PressKind;
  notes: string;
  active: boolean;
  sortOrder: number;
  materialIds: number[];
  methodIds: number[];
};

export type Machine = {
  id: number;
  name: string;
  kind: "flat" | "cup";
  platenNote: string;
  offsetC: number;
  pressureStyle: string;
  notes: string;
};

export type Recipe = {
  id: number;
  blankId: number;
  materialIds: number[];
  methodId: number;
  name: string;
  tempC: number;
  tempF: number | null;
  tempMinC: number | null;
  tempMaxC: number | null;
  timeSeconds: number;
  timeMinSeconds: number | null;
  timeMaxSeconds: number | null;
  pressure: Pressure;
  pressureNote: string;
  pressurePsi: number | null;
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
  status: RecipeStatus;
  notes: string;
  steps: Step[];
  preferred: boolean;
  active: boolean;
};

export type Override = {
  id: number;
  recipeId: number;
  machineId: number;
  tempC: number | null;
  timeSeconds: number | null;
  pressure: string;
  knob: string;
  notes: string;
};

export type EndProduct = {
  id: number;
  name: string;
  blankId: number;
  materialId: number;
  methodId: number;
  recipeId: number | null;
  sizeId: number | null;
  notes: string;
  active: boolean;
};

export type StockItem = {
  id: number;
  blankId: number;
  sizeId: number;
  materialId: number;
  quantity: number;
  lowStockAt: number;
  location: string;
  note: string;
};

export type StockLogEntry = {
  id: number;
  itemLabel: string;
  delta: number;
  quantityAfter: number;
  reason: string;
  note: string;
  createdAt: string;
};

export type PressLogEntry = {
  id: number;
  itemLabel: string;
  recipeLabel: string;
  tempC: number;
  setpointC: number;
  seconds: number;
  pressure: string;
  quantity: number;
  printSite: string;
  note: string;
  deducted: boolean;
  createdAt: string;
};

export type Catalog = {
  materials: Material[];
  methods: Method[];
  blanks: Blank[];
  sizes: Size[];
  sites: PrintSite[];
  machines: Machine[];
  recipes: Recipe[];
  overrides: Override[];
  endProducts: EndProduct[];
  stock: StockItem[];
};
