import type { PressDb } from "./db";
import { loadCatalog } from "./db";
import type { CoverSheet, Peel, Pressure, Step, StepKind } from "./types";
import { STEP_KINDS } from "./labels";

export type MutationResult = { ok: true; id?: number } | { ok: false; error: string };

function fail(error: string): MutationResult {
  return { ok: false, error };
}

function withTransaction(db: PressDb, fn: () => MutationResult): MutationResult {
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = fn();
    if (!result.ok) {
      db.exec("ROLLBACK");
      return result;
    }
    db.exec("COMMIT");
    return result;
  } catch (error) {
    try {
      db.exec("ROLLBACK");
    } catch {
      // The body may already have rolled back.
    }
    throw error;
  }
}

function itemLabel(db: PressDb, blankId: number, sizeId: number, materialId: number): string {
  const blank = db.prepare("SELECT name FROM blanks WHERE id = ?").get(blankId) as { name: string } | undefined;
  const size = db.prepare("SELECT label FROM blank_sizes WHERE id = ?").get(sizeId) as { label: string } | undefined;
  const material = db.prepare("SELECT name FROM materials WHERE id = ?").get(materialId) as { name: string } | undefined;
  return [blank?.name, size?.label, material?.name].filter(Boolean).join(" · ");
}

function writeStockLog(db: PressDb, stockId: number | null, label: string, delta: number, after: number, reason: string, note: string) {
  db.prepare(
    `INSERT INTO stock_log (stock_item_id, item_label, delta, quantity_after, reason, note)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(stockId, label, delta, after, reason, note);
}

export function receiveOrAdjust(
  db: PressDb,
  stockId: number,
  quantity: number,
  reason: "received" | "used" | "damaged",
  note: string,
): MutationResult {
  if (!Number.isInteger(quantity) || quantity <= 0) return fail("Enter a quantity of at least 1.");
  const delta = reason === "received" ? quantity : -quantity;
  return withTransaction(db, () => {
    const row = db.prepare("SELECT * FROM stock_items WHERE id = ?").get(stockId) as
      | { id: number; blank_id: number; size_id: number; material_id: number; quantity: number }
      | undefined;
    if (!row) return fail("That stock row is gone.");
    const next = Number(row.quantity) + delta;
    if (next < 0) return fail(`Only ${row.quantity} in stock.`);
    db.prepare("UPDATE stock_items SET quantity = ? WHERE id = ?").run(next, stockId);
    writeStockLog(db, stockId, itemLabel(db, row.blank_id, row.size_id, row.material_id), delta, next, reason, note);
    return { ok: true as const, id: stockId };
  });
}

export function setStockQuantity(db: PressDb, stockId: number, quantity: number, note: string): MutationResult {
  if (!Number.isInteger(quantity) || quantity < 0) return fail("The count cannot be negative.");
  return withTransaction(db, () => {
    const row = db.prepare("SELECT * FROM stock_items WHERE id = ?").get(stockId) as
      | { id: number; blank_id: number; size_id: number; material_id: number; quantity: number }
      | undefined;
    if (!row) return fail("That stock row is gone.");
    const delta = quantity - Number(row.quantity);
    db.prepare("UPDATE stock_items SET quantity = ? WHERE id = ?").run(quantity, stockId);
    if (delta !== 0) {
      writeStockLog(db, stockId, itemLabel(db, row.blank_id, row.size_id, row.material_id), delta, quantity, "count", note);
    }
    return { ok: true as const, id: stockId };
  });
}

export function updateStockDetails(
  db: PressDb,
  stockId: number,
  lowStockAt: number,
  location: string,
  note: string,
): MutationResult {
  if (!Number.isInteger(lowStockAt) || lowStockAt < 0) return fail("Low-stock level needs a whole number.");
  const result = db.prepare("UPDATE stock_items SET low_stock_at = ?, location = ?, note = ? WHERE id = ?").run(
    lowStockAt,
    location,
    note,
    stockId,
  );
  if (result.changes === 0) return fail("That stock row is gone.");
  return { ok: true, id: stockId };
}

export function removeStockRow(db: PressDb, stockId: number): MutationResult {
  const row = db.prepare("SELECT quantity FROM stock_items WHERE id = ?").get(stockId) as { quantity: number } | undefined;
  if (!row) return fail("That stock row is gone.");
  if (Number(row.quantity) !== 0) return fail("Count it down to zero before removing it from the list.");
  db.prepare("DELETE FROM stock_items WHERE id = ?").run(stockId);
  return { ok: true };
}

export function addStock(db: PressDb, input: {
  blankId: number;
  sizeId: number;
  materialId: number;
  quantity: number;
  lowStockAt: number;
  location: string;
  note: string;
}): MutationResult {
  if (!Number.isInteger(input.quantity) || input.quantity < 0) return fail("Quantity needs a whole number.");
  if (!Number.isInteger(input.lowStockAt) || input.lowStockAt < 0) return fail("Low-stock level needs a whole number.");
  const size = db.prepare("SELECT blank_id FROM blank_sizes WHERE id = ?").get(input.sizeId) as { blank_id: number } | undefined;
  if (!size || Number(size.blank_id) !== input.blankId) return fail("Pick a size that belongs to that blank.");
  const allowed = db.prepare("SELECT 1 AS ok FROM blank_materials WHERE blank_id = ? AND material_id = ?").get(
    input.blankId,
    input.materialId,
  ) as { ok: number } | undefined;
  if (!allowed) return fail("That material is not linked to this blank. Add it in the library first.");

  return withTransaction(db, () => {
    const existing = db
      .prepare("SELECT id, quantity FROM stock_items WHERE blank_id = ? AND size_id = ? AND material_id = ?")
      .get(input.blankId, input.sizeId, input.materialId) as { id: number; quantity: number } | undefined;
    if (existing) {
      const next = Number(existing.quantity) + input.quantity;
      db.prepare("UPDATE stock_items SET quantity = ?, low_stock_at = ?, location = ?, note = ? WHERE id = ?").run(
        next,
        input.lowStockAt,
        input.location,
        input.note,
        existing.id,
      );
      if (input.quantity > 0) {
        writeStockLog(db, existing.id, itemLabel(db, input.blankId, input.sizeId, input.materialId), input.quantity, next, "received", input.note);
      }
      return { ok: true as const, id: existing.id };
    }
    const inserted = db
      .prepare(
        `INSERT INTO stock_items (blank_id, size_id, material_id, quantity, low_stock_at, location, note)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(input.blankId, input.sizeId, input.materialId, input.quantity, input.lowStockAt, input.location, input.note);
    const id = Number(inserted.lastInsertRowid);
    if (input.quantity > 0) {
      writeStockLog(db, id, itemLabel(db, input.blankId, input.sizeId, input.materialId), input.quantity, input.quantity, "received", input.note);
    }
    return { ok: true as const, id };
  });
}

export function logPress(db: PressDb, input: {
  recipeId: number;
  blankId: number;
  materialId: number;
  sizeId: number | null;
  quantity: number;
  printSite: string;
  note: string;
  deduct: boolean;
  tempC: number;
  setpointC: number;
  seconds: number;
  pressure: string;
}): MutationResult {
  if (!Number.isInteger(input.quantity) || input.quantity <= 0) return fail("Enter how many you pressed.");
  const recipe = db.prepare("SELECT name, status FROM recipes WHERE id = ?").get(input.recipeId) as
    | { name: string; status: string }
    | undefined;
  if (!recipe) return fail("That setting no longer exists.");
  const sizes = db.prepare("SELECT id FROM blank_sizes WHERE blank_id = ?").all(input.blankId) as { id: number }[];
  if (sizes.length > 0 && (input.sizeId == null || !sizes.some((size) => size.id === input.sizeId))) {
    return fail("Pick the size.");
  }

  return withTransaction(db, () => {
    let stockId: number | null = null;
    let deducted = 0;
    if (input.deduct) {
      if (input.sizeId == null) return fail("Pick a size before taking stock off the shelf.");
      const stock = db
        .prepare("SELECT id, quantity, blank_id, size_id, material_id FROM stock_items WHERE blank_id = ? AND size_id = ? AND material_id = ?")
        .get(input.blankId, input.sizeId, input.materialId) as
        | { id: number; quantity: number; blank_id: number; size_id: number; material_id: number }
        | undefined;
      if (!stock) return fail("Nothing on the shelf matches that size and material. Add it under Stock, or untick taking it from stock.");
      if (Number(stock.quantity) < input.quantity) return fail(`Only ${stock.quantity} in stock.`);
      const next = Number(stock.quantity) - input.quantity;
      db.prepare("UPDATE stock_items SET quantity = ? WHERE id = ?").run(next, stock.id);
      writeStockLog(
        db,
        stock.id,
        itemLabel(db, stock.blank_id, stock.size_id, stock.material_id),
        -input.quantity,
        next,
        "press",
        input.note,
      );
      stockId = stock.id;
      deducted = 1;
    }

    const label = input.sizeId
      ? itemLabel(db, input.blankId, input.sizeId, input.materialId)
      : itemLabel(db, input.blankId, sizes[0]?.id ?? 0, input.materialId);
    const recipeLabel = `${recipe.name} (${recipe.status === "tested" ? "tested" : "starter"})`;
    db.prepare(
      `INSERT INTO press_log (
        recipe_id, stock_item_id, item_label, recipe_label, temp_c, setpoint_c, seconds, pressure, quantity, print_site, note, deducted
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      input.recipeId,
      stockId,
      label,
      recipeLabel,
      input.tempC,
      input.setpointC,
      input.seconds,
      input.pressure,
      input.quantity,
      input.printSite,
      input.note,
      deducted,
    );
    return { ok: true as const };
  });
}

function clearPreferred(db: PressDb, blankId: number, methodId: number, materialIds: number[], exceptId: number) {
  for (const materialId of materialIds) {
    db.prepare(
      `UPDATE recipes SET preferred = 0
       WHERE blank_id = ? AND method_id = ? AND id != ?
         AND id IN (SELECT recipe_id FROM recipe_materials WHERE material_id = ?)`,
    ).run(blankId, methodId, exceptId, materialId);
  }
}

type RecipeRow = {
  blank_id: number;
  method_id: number;
  name: string;
  temp_c: number;
  temp_f: number | null;
  temp_min_c: number | null;
  temp_max_c: number | null;
  time_seconds: number;
  time_min_seconds: number | null;
  time_max_seconds: number | null;
  pressure: string;
  pressure_note: string;
  pressure_psi: number | null;
  peel: string;
  peel_wait_seconds: number;
  prepress_seconds: number;
  cover_sheet: string;
  blowout_sheet: number;
  mirror_print: number;
  heat_tape: number;
  shrink_sleeve: number;
  pressing_pillow: number;
  cool_down: string;
  wash_wait_hours: number | null;
  care_note: string;
  warnings: string;
  notes: string;
  steps_json: string;
};

export function copyAsTested(db: PressDb, recipeId: number, materialId: number, note: string): MutationResult {
  const row = db.prepare("SELECT * FROM recipes WHERE id = ?").get(recipeId) as RecipeRow | undefined;
  if (!row) return fail("That setting no longer exists.");
  const materials = db.prepare("SELECT material_id FROM recipe_materials WHERE recipe_id = ?").all(recipeId) as {
    material_id: number;
  }[];
  const materialIds = materials.map((item) => item.material_id);
  if (!materialIds.includes(materialId)) materialIds.push(materialId);
  const baseName = String(row.name).replace(/\s+\(tested\)$/, "");
  const name = `${baseName} (tested)`;

  return withTransaction(db, () => {
    const inserted = db.prepare(
      `INSERT INTO recipes (
        blank_id, method_id, name, temp_c, temp_f, temp_min_c, temp_max_c, time_seconds, time_min_seconds, time_max_seconds,
        pressure, pressure_note, pressure_psi, peel, peel_wait_seconds, prepress_seconds, cover_sheet, blowout_sheet, mirror_print,
        heat_tape, shrink_sleeve, pressing_pillow, cool_down, wash_wait_hours, care_note, warnings, source_note, status,
        notes, steps_json, preferred, active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'tested', ?, ?, 1, 1)`,
    ).run(
      row.blank_id,
      row.method_id,
      name,
      row.temp_c,
      row.temp_f,
      row.temp_min_c,
      row.temp_max_c,
      row.time_seconds,
      row.time_min_seconds,
      row.time_max_seconds,
      row.pressure,
      row.pressure_note,
      row.pressure_psi,
      row.peel,
      row.peel_wait_seconds,
      row.prepress_seconds,
      row.cover_sheet,
      row.blowout_sheet,
      row.mirror_print,
      row.heat_tape,
      row.shrink_sleeve,
      row.pressing_pillow,
      row.cool_down,
      row.wash_wait_hours,
      row.care_note,
      row.warnings,
      "Copied from a starter and marked as the setting used in this workshop.",
      note || String(row.notes ?? ""),
      row.steps_json,
    );
    const id = Number(inserted.lastInsertRowid);
    const link = db.prepare("INSERT INTO recipe_materials (recipe_id, material_id) VALUES (?, ?)");
    for (const idValue of materialIds) link.run(id, idValue);
    clearPreferred(db, Number(row.blank_id), Number(row.method_id), materialIds, id);
    return { ok: true as const, id };
  });
}

export type RecipeInput = {
  id: number | null;
  blankId: number;
  methodId: number;
  materialIds: number[];
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
  status: "starter" | "tested";
  notes: string;
  steps: Step[];
  preferred: boolean;
};

const pressures = new Set(["light", "medium", "medium-firm", "firm", "heavy"]);
const peels = new Set(["hot", "warm", "cold", "either"]);
const covers = new Set(["none", "teflon", "parchment", "butcher"]);

export function saveRecipe(db: PressDb, input: RecipeInput): MutationResult {
  if (!input.name) return fail("Give the setting a name.");
  if (!Number.isInteger(input.tempC) || input.tempC < 80 || input.tempC > 230) return fail("Temperature needs to be a whole number in °C.");
  if (!Number.isInteger(input.timeSeconds) || input.timeSeconds <= 0) return fail("Time needs to be at least 1 second.");
  if (input.materialIds.length === 0) return fail("Pick at least one material.");
  if (!pressures.has(input.pressure)) return fail("Pick a pressure.");
  if (!peels.has(input.peel)) return fail("Pick a peel.");
  if (!covers.has(input.coverSheet)) return fail("Pick a cover sheet.");
  const blank = db.prepare("SELECT id FROM blanks WHERE id = ?").get(input.blankId);
  const method = db.prepare("SELECT id FROM methods WHERE id = ?").get(input.methodId);
  if (!blank || !method) return fail("Pick a blank and a print method.");

  const steps = input.steps.filter((step) => step.title.trim());
  if (!steps.some((step) => step.kind === "press" && step.seconds && step.seconds > 0)) {
    steps.unshift({
      kind: "press",
      title: "Press",
      seconds: input.timeSeconds,
      detail: `${input.tempC}°C.`,
    });
  }
  for (const step of steps) {
    if (!STEP_KINDS.includes(step.kind as StepKind)) return fail("A step has an unknown type.");
  }

  return withTransaction(db, () => {
    const values = [
      input.blankId,
      input.methodId,
      input.name,
      input.tempC,
      input.tempF,
      input.tempMinC,
      input.tempMaxC,
      input.timeSeconds,
      input.timeMinSeconds,
      input.timeMaxSeconds,
      input.pressure,
      input.pressureNote,
      input.pressurePsi,
      input.peel,
      input.peelWaitSeconds,
      input.prepressSeconds,
      input.coverSheet,
      input.blowoutSheet ? 1 : 0,
      input.mirrorPrint ? 1 : 0,
      input.heatTape ? 1 : 0,
      input.shrinkSleeve ? 1 : 0,
      input.pressingPillow ? 1 : 0,
      input.coolDown || "air",
      input.washWaitHours,
      input.careNote,
      input.warnings,
      input.sourceNote,
      input.status,
      input.notes,
      JSON.stringify(steps),
      input.preferred ? 1 : 0,
    ];
    let id = input.id;
    if (id) {
      const updated = db.prepare(
        `UPDATE recipes SET
          blank_id = ?, method_id = ?, name = ?, temp_c = ?, temp_f = ?, temp_min_c = ?, temp_max_c = ?,
          time_seconds = ?, time_min_seconds = ?, time_max_seconds = ?, pressure = ?, pressure_note = ?, pressure_psi = ?,
          peel = ?, peel_wait_seconds = ?, prepress_seconds = ?, cover_sheet = ?, blowout_sheet = ?, mirror_print = ?,
          heat_tape = ?, shrink_sleeve = ?, pressing_pillow = ?, cool_down = ?, wash_wait_hours = ?, care_note = ?,
          warnings = ?, source_note = ?, status = ?, notes = ?, steps_json = ?, preferred = ?
         WHERE id = ?`,
      ).run(...values, id);
      if (updated.changes === 0) return fail("That setting no longer exists.");
      db.prepare("DELETE FROM recipe_materials WHERE recipe_id = ?").run(id);
    } else {
      const inserted = db.prepare(
        `INSERT INTO recipes (
          blank_id, method_id, name, temp_c, temp_f, temp_min_c, temp_max_c, time_seconds, time_min_seconds, time_max_seconds,
          pressure, pressure_note, pressure_psi, peel, peel_wait_seconds, prepress_seconds, cover_sheet, blowout_sheet, mirror_print,
          heat_tape, shrink_sleeve, pressing_pillow, cool_down, wash_wait_hours, care_note, warnings, source_note, status,
          notes, steps_json, preferred, active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      ).run(...values);
      id = Number(inserted.lastInsertRowid);
    }
    const link = db.prepare("INSERT INTO recipe_materials (recipe_id, material_id) VALUES (?, ?)");
    for (const materialId of input.materialIds) link.run(id, materialId);
    if (input.preferred && id) clearPreferred(db, input.blankId, input.methodId, input.materialIds, id);
    return { ok: true as const, id: id ?? undefined };
  });
}

export function retireRecipe(db: PressDb, recipeId: number): MutationResult {
  const result = db.prepare("UPDATE recipes SET active = 0, preferred = 0 WHERE id = ?").run(recipeId);
  if (result.changes === 0) return fail("That setting no longer exists.");
  return { ok: true };
}

export type BlankInput = {
  id: number | null;
  name: string;
  category: string;
  shape: string;
  requiredPress: "flat" | "cup" | "any";
  notes: string;
  materialIds: number[];
  methodIds: number[];
  sites: string[];
  sizes: { id: number | null; label: string; widthMm: number | null; heightMm: number | null; diameterMm: number | null; volumeMl: number | null }[];
};

export function saveBlank(db: PressDb, input: BlankInput): MutationResult {
  if (!input.name) return fail("Name the blank.");
  if (!input.category) return fail("Pick a group, such as Shirts or Coasters.");
  if (input.materialIds.length === 0) return fail("Tick at least one material.");
  if (input.methodIds.length === 0) return fail("Tick at least one print method.");
  const sizes = input.sizes.filter((size) => size.label);
  if (sizes.length === 0) return fail("Add at least one size. Use One size if it has no sizes.");
  const press = input.requiredPress === "cup" || input.requiredPress === "any" ? input.requiredPress : "flat";
  const shape = ["square", "round", "none"].includes(input.shape) ? input.shape : "none";

  return withTransaction(db, () => {
    let id = input.id;
    if (id) {
      const updated = db.prepare(
        `UPDATE blanks SET name = ?, category = ?, shape = ?, required_press = ?, notes = ? WHERE id = ?`,
      ).run(input.name, input.category, shape, press, input.notes, id);
      if (updated.changes === 0) return fail("That blank no longer exists.");
      db.prepare("DELETE FROM blank_materials WHERE blank_id = ?").run(id);
      db.prepare("DELETE FROM blank_methods WHERE blank_id = ?").run(id);
      db.prepare("DELETE FROM print_sites WHERE blank_id = ?").run(id);
    } else {
      const inserted = db.prepare(
        `INSERT INTO blanks (name, category, shape, required_press, notes, sort_order)
         VALUES (?, ?, ?, ?, ?, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM blanks))`,
      ).run(input.name, input.category, shape, press, input.notes);
      id = Number(inserted.lastInsertRowid);
    }
    const linkMaterial = db.prepare("INSERT INTO blank_materials (blank_id, material_id) VALUES (?, ?)");
    for (const materialId of input.materialIds) linkMaterial.run(id, materialId);
    const linkMethod = db.prepare("INSERT INTO blank_methods (blank_id, method_id) VALUES (?, ?)");
    for (const methodId of input.methodIds) linkMethod.run(id, methodId);
    const insertSite = db.prepare("INSERT INTO print_sites (blank_id, name, sort_order) VALUES (?, ?, ?)");
    input.sites.filter(Boolean).forEach((site, index) => insertSite.run(id, site, index));

    const updateSize = db.prepare(
      `UPDATE blank_sizes SET label = ?, width_mm = ?, height_mm = ?, diameter_mm = ?, volume_ml = ?, sort_order = ? WHERE id = ? AND blank_id = ?`,
    );
    const insertSize = db.prepare(
      `INSERT INTO blank_sizes (blank_id, label, width_mm, height_mm, diameter_mm, volume_ml, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    );
    sizes.forEach((size, index) => {
      if (size.id) {
        updateSize.run(size.label, size.widthMm, size.heightMm, size.diameterMm, size.volumeMl, index, size.id, id);
      } else {
        insertSize.run(id, size.label, size.widthMm, size.heightMm, size.diameterMm, size.volumeMl, index);
      }
    });
    return { ok: true as const, id: id ?? undefined };
  });
}

export function retireBlank(db: PressDb, blankId: number): MutationResult {
  const result = db.prepare("UPDATE blanks SET active = 0 WHERE id = ?").run(blankId);
  if (result.changes === 0) return fail("That blank no longer exists.");
  return { ok: true };
}

export function saveMaterial(db: PressDb, input: {
  id: number | null;
  name: string;
  groupName: string;
  polyesterPercent: number | null;
  sublimation: "yes" | "poor" | "no";
  heatNote: string;
}): MutationResult {
  if (!input.name) return fail("Name the material.");
  if (!["yes", "poor", "no"].includes(input.sublimation)) return fail("Say whether sublimation works.");
  if (input.id) {
    const result = db.prepare(
      `UPDATE materials SET name = ?, group_name = ?, polyester_percent = ?, sublimation = ?, heat_note = ? WHERE id = ?`,
    ).run(input.name, input.groupName || "Other", input.polyesterPercent, input.sublimation, input.heatNote, input.id);
    if (result.changes === 0) return fail("That material no longer exists.");
    return { ok: true, id: input.id };
  }
  const inserted = db.prepare(
    `INSERT INTO materials (name, group_name, polyester_percent, sublimation, heat_note, sort_order)
     VALUES (?, ?, ?, ?, ?, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM materials))`,
  ).run(input.name, input.groupName || "Other", input.polyesterPercent, input.sublimation, input.heatNote);
  return { ok: true, id: Number(inserted.lastInsertRowid) };
}

export function saveMachine(db: PressDb, input: {
  id: number | null;
  name: string;
  kind: "flat" | "cup";
  platenNote: string;
  offsetC: number;
  pressureStyle: string;
  notes: string;
}): MutationResult {
  if (!input.name) return fail("Name the press.");
  const kind = input.kind === "cup" ? "cup" : "flat";
  if (!Number.isFinite(input.offsetC)) return fail("The temperature offset needs a number. Use 0 if you have not measured it.");
  if (input.id) {
    const result = db.prepare(
      `UPDATE machines SET name = ?, kind = ?, platen_note = ?, offset_c = ?, pressure_style = ?, notes = ? WHERE id = ?`,
    ).run(input.name, kind, input.platenNote, input.offsetC, input.pressureStyle || "words", input.notes, input.id);
    if (result.changes === 0) return fail("That press no longer exists.");
    return { ok: true, id: input.id };
  }
  const inserted = db.prepare(
    `INSERT INTO machines (name, kind, platen_note, offset_c, pressure_style, notes) VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(input.name, kind, input.platenNote, input.offsetC, input.pressureStyle || "words", input.notes);
  return { ok: true, id: Number(inserted.lastInsertRowid) };
}

export function saveOverride(db: PressDb, input: {
  recipeId: number;
  machineId: number;
  tempC: number | null;
  timeSeconds: number | null;
  pressure: string;
  knob: string;
  notes: string;
}): MutationResult {
  db.prepare(
    `INSERT INTO recipe_overrides (recipe_id, machine_id, temp_c, time_seconds, pressure, knob, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (recipe_id, machine_id) DO UPDATE SET
       temp_c = excluded.temp_c,
       time_seconds = excluded.time_seconds,
       pressure = excluded.pressure,
       knob = excluded.knob,
       notes = excluded.notes`,
  ).run(input.recipeId, input.machineId, input.tempC, input.timeSeconds, input.pressure, input.knob, input.notes);
  return { ok: true };
}

export function saveEndProduct(db: PressDb, input: {
  id: number | null;
  name: string;
  blankId: number;
  materialId: number;
  methodId: number;
  recipeId: number | null;
  sizeId: number | null;
  notes: string;
}): MutationResult {
  if (!input.name) return fail("Name the thing you sell.");
  if (input.id) {
    const result = db.prepare(
      `UPDATE end_products SET name = ?, blank_id = ?, material_id = ?, method_id = ?, recipe_id = ?, size_id = ?, notes = ? WHERE id = ?`,
    ).run(input.name, input.blankId, input.materialId, input.methodId, input.recipeId, input.sizeId, input.notes, input.id);
    if (result.changes === 0) return fail("That product no longer exists.");
    return { ok: true, id: input.id };
  }
  const inserted = db.prepare(
    `INSERT INTO end_products (name, blank_id, material_id, method_id, recipe_id, size_id, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(input.name, input.blankId, input.materialId, input.methodId, input.recipeId, input.sizeId, input.notes);
  return { ok: true, id: Number(inserted.lastInsertRowid) };
}

export function retireEndProduct(db: PressDb, id: number): MutationResult {
  const result = db.prepare("UPDATE end_products SET active = 0 WHERE id = ?").run(id);
  if (result.changes === 0) return fail("That product no longer exists.");
  return { ok: true };
}

export function catalogOrEmpty(db: PressDb) {
  return loadCatalog(db);
}
