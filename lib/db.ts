import fs from "fs";
import path from "path";
import "./silence-sqlite";
import { DatabaseSync } from "node:sqlite";
import { starter, starterIssues, type StarterSize } from "./starter";
import type {
  Blank,
  Catalog,
  CoverSheet,
  EndProduct,
  Machine,
  Material,
  Method,
  Override,
  Peel,
  PressLogEntry,
  Pressure,
  PrintSite,
  Recipe,
  RecipeStatus,
  Size,
  Step,
  StockItem,
  StockLogEntry,
  SublimationFit,
} from "./types";

export type PressDb = DatabaseSync;

const globalForDb = globalThis as unknown as { pressDb?: PressDb };

const SCHEMA = `
CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS materials (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  group_name TEXT NOT NULL,
  polyester_percent INTEGER,
  sublimation TEXT NOT NULL,
  heat_note TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS methods (
  id INTEGER PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  enabled INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS machines (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  kind TEXT NOT NULL,
  platen_note TEXT NOT NULL DEFAULT '',
  offset_c REAL NOT NULL DEFAULT 0,
  pressure_style TEXT NOT NULL DEFAULT 'words',
  notes TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS blanks (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  shape TEXT NOT NULL DEFAULT 'none',
  required_press TEXT NOT NULL DEFAULT 'flat',
  notes TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS blank_sizes (
  id INTEGER PRIMARY KEY,
  blank_id INTEGER NOT NULL REFERENCES blanks(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  width_mm INTEGER,
  height_mm INTEGER,
  diameter_mm INTEGER,
  volume_ml INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS blank_materials (
  blank_id INTEGER NOT NULL REFERENCES blanks(id) ON DELETE CASCADE,
  material_id INTEGER NOT NULL REFERENCES materials(id),
  PRIMARY KEY (blank_id, material_id)
);
CREATE TABLE IF NOT EXISTS blank_methods (
  blank_id INTEGER NOT NULL REFERENCES blanks(id) ON DELETE CASCADE,
  method_id INTEGER NOT NULL REFERENCES methods(id),
  PRIMARY KEY (blank_id, method_id)
);
CREATE TABLE IF NOT EXISTS print_sites (
  id INTEGER PRIMARY KEY,
  blank_id INTEGER NOT NULL REFERENCES blanks(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS recipes (
  id INTEGER PRIMARY KEY,
  blank_id INTEGER NOT NULL REFERENCES blanks(id),
  method_id INTEGER NOT NULL REFERENCES methods(id),
  name TEXT NOT NULL,
  temp_c INTEGER NOT NULL,
  temp_f INTEGER,
  temp_min_c INTEGER,
  temp_max_c INTEGER,
  time_seconds INTEGER NOT NULL,
  time_min_seconds INTEGER,
  time_max_seconds INTEGER,
  pressure TEXT NOT NULL,
  pressure_note TEXT NOT NULL DEFAULT '',
  pressure_psi INTEGER,
  peel TEXT NOT NULL,
  peel_wait_seconds INTEGER NOT NULL DEFAULT 0,
  prepress_seconds INTEGER NOT NULL DEFAULT 0,
  cover_sheet TEXT NOT NULL DEFAULT 'none',
  blowout_sheet INTEGER NOT NULL DEFAULT 0,
  mirror_print INTEGER NOT NULL DEFAULT 0,
  heat_tape INTEGER NOT NULL DEFAULT 0,
  shrink_sleeve INTEGER NOT NULL DEFAULT 0,
  pressing_pillow INTEGER NOT NULL DEFAULT 0,
  cool_down TEXT NOT NULL DEFAULT 'air',
  wash_wait_hours INTEGER,
  care_note TEXT NOT NULL DEFAULT '',
  warnings TEXT NOT NULL DEFAULT '',
  source_note TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'starter',
  notes TEXT NOT NULL DEFAULT '',
  steps_json TEXT NOT NULL DEFAULT '[]',
  preferred INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS recipe_materials (
  recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  material_id INTEGER NOT NULL REFERENCES materials(id),
  PRIMARY KEY (recipe_id, material_id)
);
CREATE TABLE IF NOT EXISTS recipe_overrides (
  id INTEGER PRIMARY KEY,
  recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  machine_id INTEGER NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  temp_c INTEGER,
  time_seconds INTEGER,
  pressure TEXT NOT NULL DEFAULT '',
  knob TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  UNIQUE (recipe_id, machine_id)
);
CREATE TABLE IF NOT EXISTS end_products (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  blank_id INTEGER NOT NULL REFERENCES blanks(id),
  material_id INTEGER NOT NULL REFERENCES materials(id),
  method_id INTEGER NOT NULL REFERENCES methods(id),
  recipe_id INTEGER REFERENCES recipes(id),
  size_id INTEGER REFERENCES blank_sizes(id),
  notes TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS stock_items (
  id INTEGER PRIMARY KEY,
  blank_id INTEGER NOT NULL REFERENCES blanks(id),
  size_id INTEGER NOT NULL REFERENCES blank_sizes(id),
  material_id INTEGER NOT NULL REFERENCES materials(id),
  quantity INTEGER NOT NULL DEFAULT 0,
  low_stock_at INTEGER NOT NULL DEFAULT 2,
  location TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  UNIQUE (blank_id, size_id, material_id)
);
CREATE TABLE IF NOT EXISTS stock_log (
  id INTEGER PRIMARY KEY,
  stock_item_id INTEGER,
  item_label TEXT NOT NULL,
  delta INTEGER NOT NULL,
  quantity_after INTEGER NOT NULL,
  reason TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS press_log (
  id INTEGER PRIMARY KEY,
  recipe_id INTEGER,
  stock_item_id INTEGER,
  item_label TEXT NOT NULL,
  recipe_label TEXT NOT NULL,
  temp_c INTEGER NOT NULL,
  setpoint_c INTEGER NOT NULL,
  seconds INTEGER NOT NULL,
  pressure TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  print_site TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  deducted INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

function asNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function asBool(value: unknown): boolean {
  return value === 1 || value === true;
}

function parseSteps(raw: unknown): Step[] {
  if (typeof raw !== "string") return [];
  try {
    const parsed = JSON.parse(raw) as Step[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((step) => step && typeof step.title === "string" && typeof step.kind === "string");
  } catch {
    return [];
  }
}

export function openDatabase(filename: string): PressDb {
  const db = new DatabaseSync(filename);
  db.exec("PRAGMA foreign_keys = ON");
  db.exec(SCHEMA);
  return db;
}

export function seedIfEmpty(db: PressDb): void {
  const existing = db.prepare("SELECT value FROM meta WHERE key = 'seeded'").get() as { value: string } | undefined;
  if (existing) return;
  const issues = starterIssues();
  if (issues.length > 0) {
    throw new Error(`Starter library is inconsistent:\n${issues.join("\n")}`);
  }

  const insertMaterial = db.prepare(
    `INSERT INTO materials (name, group_name, polyester_percent, sublimation, heat_note, sort_order)
     VALUES (?, ?, ?, ?, ?, ?)`,
  );
  const materialIds = new Map<string, number>();
  starter.materials.forEach((material, index) => {
    const result = insertMaterial.run(material.name, material.groupName, material.polyesterPercent, material.sublimation, material.heatNote, index);
    materialIds.set(material.name, Number(result.lastInsertRowid));
  });

  const insertMethod = db.prepare(`INSERT INTO methods (slug, name, summary, sort_order) VALUES (?, ?, ?, ?)`);
  const methodIds = new Map<string, number>();
  starter.methods.forEach((method, index) => {
    const result = insertMethod.run(method.slug, method.name, method.summary, index);
    methodIds.set(method.slug, Number(result.lastInsertRowid));
  });

  const insertBlank = db.prepare(
    `INSERT INTO blanks (name, category, shape, required_press, notes, sort_order) VALUES (?, ?, ?, ?, ?, ?)`,
  );
  const insertSize = db.prepare(
    `INSERT INTO blank_sizes (blank_id, label, width_mm, height_mm, diameter_mm, volume_ml, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );
  const insertSite = db.prepare(`INSERT INTO print_sites (blank_id, name, sort_order) VALUES (?, ?, ?)`);
  const linkMaterial = db.prepare(`INSERT INTO blank_materials (blank_id, material_id) VALUES (?, ?)`);
  const linkMethod = db.prepare(`INSERT INTO blank_methods (blank_id, method_id) VALUES (?, ?)`);
  const blankIds = new Map<string, number>();
  const sizeIds = new Map<string, number>();

  const must = (map: Map<string, number>, key: string) => {
    const id = map.get(key);
    if (id == null) throw new Error(`Missing starter record: ${key}`);
    return id;
  };

  starter.blanks.forEach((blank, index) => {
    const result = insertBlank.run(blank.name, blank.category, blank.shape, blank.requiredPress, blank.notes, index);
    const blankId = Number(result.lastInsertRowid);
    blankIds.set(blank.name, blankId);
    blank.sizes.forEach((size, sizeIndex) => {
      const measured = size as StarterSize;
      const sizeResult = insertSize.run(
        blankId,
        measured.label,
        measured.widthMm ?? null,
        measured.heightMm ?? null,
        measured.diameterMm ?? null,
        measured.volumeMl ?? null,
        sizeIndex,
      );
      sizeIds.set(`${blank.name}|${measured.label}`, Number(sizeResult.lastInsertRowid));
    });
    blank.sites.forEach((site, siteIndex) => insertSite.run(blankId, site, siteIndex));
    for (const materialName of blank.materials) linkMaterial.run(blankId, must(materialIds, materialName));
    for (const methodSlug of blank.methods) linkMethod.run(blankId, must(methodIds, methodSlug));
  });

  const insertRecipe = db.prepare(
    `INSERT INTO recipes (
      blank_id, method_id, name, temp_c, temp_f, temp_min_c, temp_max_c, time_seconds, time_min_seconds, time_max_seconds,
      pressure, pressure_note, peel, peel_wait_seconds, prepress_seconds, cover_sheet, blowout_sheet, mirror_print,
      heat_tape, shrink_sleeve, pressing_pillow, cool_down, wash_wait_hours, care_note, warnings, source_note, status,
      notes, steps_json, preferred, active
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'starter', ?, ?, 1, 1)`,
  );
  const linkRecipeMaterial = db.prepare(`INSERT INTO recipe_materials (recipe_id, material_id) VALUES (?, ?)`);
  const recipeIds = new Map<string, number>();

  for (const item of starter.recipes) {
    const result = insertRecipe.run(
      must(blankIds, item.blank),
      must(methodIds, item.method),
      item.name,
      item.tempC,
      item.tempF,
      item.tempMinC,
      item.tempMaxC,
      item.timeSeconds,
      item.timeMinSeconds,
      item.timeMaxSeconds,
      item.pressure,
      item.pressureNote,
      item.peel,
      item.peelWaitSeconds,
      item.prepressSeconds,
      item.coverSheet,
      item.blowoutSheet ? 1 : 0,
      item.mirrorPrint ? 1 : 0,
      item.heatTape ? 1 : 0,
      item.shrinkSleeve ? 1 : 0,
      item.pressingPillow ? 1 : 0,
      item.coolDown,
      item.washWaitHours,
      item.careNote,
      item.warnings,
      item.sourceNote,
      item.notes,
      JSON.stringify(item.steps),
    );
    const recipeId = Number(result.lastInsertRowid);
    recipeIds.set(item.name, recipeId);
    for (const materialName of item.materials) linkRecipeMaterial.run(recipeId, must(materialIds, materialName));
  }

  const insertEnd = db.prepare(
    `INSERT INTO end_products (name, blank_id, material_id, method_id, recipe_id, size_id, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );
  for (const product of starter.endProducts) {
    const sizeId = product.sizeLabel ? sizeIds.get(`${product.blank}|${product.sizeLabel}`) ?? null : null;
    insertEnd.run(
      product.name,
      must(blankIds, product.blank),
      must(materialIds, product.material),
      must(methodIds, product.method),
      product.recipe ? must(recipeIds, product.recipe) : null,
      sizeId,
      product.notes,
    );
  }

  db.prepare("INSERT INTO meta (key, value) VALUES ('seeded', '1')").run();
}

export function getDb(): PressDb {
  if (!globalForDb.pressDb) {
    const directory = path.join(process.cwd(), "data");
    fs.mkdirSync(directory, { recursive: true });
    const db = openDatabase(path.join(directory, "press.db"));
    seedIfEmpty(db);
    globalForDb.pressDb = db;
  }
  return globalForDb.pressDb;
}

type MaterialRow = {
  id: number;
  name: string;
  group_name: string;
  polyester_percent: number | null;
  sublimation: SublimationFit;
  heat_note: string;
  sort_order: number;
};

type MethodRow = {
  id: number;
  name: string;
  slug: string;
  summary: string;
  enabled: number;
  sort_order: number;
};

export function loadCatalog(db: PressDb = getDb()): Catalog {
  const materials = (db.prepare("SELECT * FROM materials ORDER BY sort_order, name").all() as MaterialRow[]).map(
    (row): Material => ({
      id: row.id,
      name: row.name,
      groupName: row.group_name,
      polyesterPercent: asNumber(row.polyester_percent),
      sublimation: row.sublimation,
      heatNote: row.heat_note,
      sortOrder: row.sort_order,
    }),
  );

  const methods = (db.prepare("SELECT * FROM methods ORDER BY sort_order, name").all() as MethodRow[]).map(
    (row): Method => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      summary: row.summary,
      enabled: asBool(row.enabled),
      sortOrder: row.sort_order,
    }),
  );

  const blanks = (db.prepare("SELECT * FROM blanks ORDER BY sort_order, name").all() as Record<string, unknown>[]).map(
    (row): Blank => ({
      id: Number(row.id),
      name: String(row.name),
      category: String(row.category),
      shape: String(row.shape),
      requiredPress: row.required_press as Blank["requiredPress"],
      notes: String(row.notes ?? ""),
      active: asBool(row.active),
      sortOrder: Number(row.sort_order),
      materialIds: [],
      methodIds: [],
    }),
  );
  const blankMap = new Map(blanks.map((blank) => [blank.id, blank]));

  for (const row of db.prepare("SELECT * FROM blank_materials").all() as { blank_id: number; material_id: number }[]) {
    blankMap.get(row.blank_id)?.materialIds.push(row.material_id);
  }
  for (const row of db.prepare("SELECT * FROM blank_methods").all() as { blank_id: number; method_id: number }[]) {
    blankMap.get(row.blank_id)?.methodIds.push(row.method_id);
  }

  const sizes = (db.prepare("SELECT * FROM blank_sizes ORDER BY sort_order, id").all() as Record<string, unknown>[]).map(
    (row): Size => ({
      id: Number(row.id),
      blankId: Number(row.blank_id),
      label: String(row.label),
      widthMm: asNumber(row.width_mm),
      heightMm: asNumber(row.height_mm),
      diameterMm: asNumber(row.diameter_mm),
      volumeMl: asNumber(row.volume_ml),
      sortOrder: Number(row.sort_order),
    }),
  );

  const sites = (db.prepare("SELECT * FROM print_sites ORDER BY sort_order, id").all() as Record<string, unknown>[]).map(
    (row): PrintSite => ({
      id: Number(row.id),
      blankId: Number(row.blank_id),
      name: String(row.name),
      sortOrder: Number(row.sort_order),
    }),
  );

  const machines = (db.prepare("SELECT * FROM machines ORDER BY name").all() as Record<string, unknown>[]).map(
    (row): Machine => ({
      id: Number(row.id),
      name: String(row.name),
      kind: row.kind === "cup" ? "cup" : "flat",
      platenNote: String(row.platen_note ?? ""),
      offsetC: Number(row.offset_c ?? 0),
      pressureStyle: String(row.pressure_style ?? "words"),
      notes: String(row.notes ?? ""),
    }),
  );

  const recipeMaterials = new Map<number, number[]>();
  for (const row of db.prepare("SELECT * FROM recipe_materials").all() as { recipe_id: number; material_id: number }[]) {
    const list = recipeMaterials.get(row.recipe_id) ?? [];
    list.push(row.material_id);
    recipeMaterials.set(row.recipe_id, list);
  }

  const recipes = (db.prepare("SELECT * FROM recipes ORDER BY name").all() as Record<string, unknown>[]).map(
    (row): Recipe => ({
      id: Number(row.id),
      blankId: Number(row.blank_id),
      materialIds: recipeMaterials.get(Number(row.id)) ?? [],
      methodId: Number(row.method_id),
      name: String(row.name),
      tempC: Number(row.temp_c),
      tempF: asNumber(row.temp_f),
      tempMinC: asNumber(row.temp_min_c),
      tempMaxC: asNumber(row.temp_max_c),
      timeSeconds: Number(row.time_seconds),
      timeMinSeconds: asNumber(row.time_min_seconds),
      timeMaxSeconds: asNumber(row.time_max_seconds),
      pressure: String(row.pressure) as Pressure,
      pressureNote: String(row.pressure_note ?? ""),
      pressurePsi: asNumber(row.pressure_psi),
      peel: String(row.peel) as Peel,
      peelWaitSeconds: Number(row.peel_wait_seconds ?? 0),
      prepressSeconds: Number(row.prepress_seconds ?? 0),
      coverSheet: String(row.cover_sheet ?? "none") as CoverSheet,
      blowoutSheet: asBool(row.blowout_sheet),
      mirrorPrint: asBool(row.mirror_print),
      heatTape: asBool(row.heat_tape),
      shrinkSleeve: asBool(row.shrink_sleeve),
      pressingPillow: asBool(row.pressing_pillow),
      coolDown: String(row.cool_down ?? "air"),
      washWaitHours: asNumber(row.wash_wait_hours),
      careNote: String(row.care_note ?? ""),
      warnings: String(row.warnings ?? ""),
      sourceNote: String(row.source_note ?? ""),
      status: (row.status === "tested" ? "tested" : "starter") as RecipeStatus,
      notes: String(row.notes ?? ""),
      steps: parseSteps(row.steps_json),
      preferred: asBool(row.preferred),
      active: asBool(row.active),
    }),
  );

  const overrides = (db.prepare("SELECT * FROM recipe_overrides").all() as Record<string, unknown>[]).map(
    (row): Override => ({
      id: Number(row.id),
      recipeId: Number(row.recipe_id),
      machineId: Number(row.machine_id),
      tempC: asNumber(row.temp_c),
      timeSeconds: asNumber(row.time_seconds),
      pressure: String(row.pressure ?? ""),
      knob: String(row.knob ?? ""),
      notes: String(row.notes ?? ""),
    }),
  );

  const endProducts = (db.prepare("SELECT * FROM end_products ORDER BY name").all() as Record<string, unknown>[]).map(
    (row): EndProduct => ({
      id: Number(row.id),
      name: String(row.name),
      blankId: Number(row.blank_id),
      materialId: Number(row.material_id),
      methodId: Number(row.method_id),
      recipeId: asNumber(row.recipe_id),
      sizeId: asNumber(row.size_id),
      notes: String(row.notes ?? ""),
      active: asBool(row.active),
    }),
  );

  const stock = (db.prepare("SELECT * FROM stock_items ORDER BY id").all() as Record<string, unknown>[]).map(
    (row): StockItem => ({
      id: Number(row.id),
      blankId: Number(row.blank_id),
      sizeId: Number(row.size_id),
      materialId: Number(row.material_id),
      quantity: Number(row.quantity),
      lowStockAt: Number(row.low_stock_at),
      location: String(row.location ?? ""),
      note: String(row.note ?? ""),
    }),
  );

  return { materials, methods, blanks, sizes, sites, machines, recipes, overrides, endProducts, stock };
}

export function recentStockLog(db: PressDb, limit = 40): StockLogEntry[] {
  return (db.prepare("SELECT * FROM stock_log ORDER BY id DESC LIMIT ?").all(limit) as Record<string, unknown>[]).map(
    (row) => ({
      id: Number(row.id),
      itemLabel: String(row.item_label),
      delta: Number(row.delta),
      quantityAfter: Number(row.quantity_after),
      reason: String(row.reason),
      note: String(row.note ?? ""),
      createdAt: String(row.created_at),
    }),
  );
}

export function recentPressLog(db: PressDb, limit = 40): PressLogEntry[] {
  return (db.prepare("SELECT * FROM press_log ORDER BY id DESC LIMIT ?").all(limit) as Record<string, unknown>[]).map(
    (row) => ({
      id: Number(row.id),
      itemLabel: String(row.item_label),
      recipeLabel: String(row.recipe_label),
      tempC: Number(row.temp_c),
      setpointC: Number(row.setpoint_c),
      seconds: Number(row.seconds),
      pressure: String(row.pressure),
      quantity: Number(row.quantity),
      printSite: String(row.print_site ?? ""),
      note: String(row.note ?? ""),
      deducted: asBool(row.deducted),
      createdAt: String(row.created_at),
    }),
  );
}

export function countPressesSince(db: PressDb, sqliteTimestamp: string): number {
  const row = db.prepare("SELECT COUNT(*) AS count FROM press_log WHERE created_at >= ?").get(sqliteTimestamp) as {
    count: number;
  };
  return Number(row.count);
}

export function countLowStock(db: PressDb): number {
  const row = db.prepare("SELECT COUNT(*) AS count FROM stock_items WHERE quantity <= low_stock_at").get() as {
    count: number;
  };
  return Number(row.count);
}
