"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { clearAdmin, grantAdmin, isAdmin, pinMatches } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { flagField, intField, textField } from "@/lib/format";
import {
  addStock,
  copyAsTested,
  logPress,
  receiveOrAdjust,
  removeStockRow,
  retireBlank,
  retireEndProduct,
  retireRecipe,
  saveBlank,
  saveEndProduct,
  saveMachine,
  saveMaterial,
  saveOverride,
  saveRecipe,
  setStockQuantity,
  updateStockDetails,
} from "@/lib/mutate";
import type { CoverSheet, Peel, Pressure, Step, StepKind } from "@/lib/types";
import { COVERS, PEELS, PRESSURES, STEP_KINDS } from "@/lib/labels";

function safePath(value: string, fallback: string): string {
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\n")) return fallback;
  return value;
}

function bounce(path: string, error: string): never {
  const join = path.includes("?") ? "&" : "?";
  redirect(`${path}${join}error=${encodeURIComponent(error)}`);
}

function done(path: string, message: string): never {
  revalidatePath("/", "layout");
  const join = path.includes("?") ? "&" : "?";
  redirect(`${path}${join}saved=${encodeURIComponent(message)}`);
}

async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) bounce("/library", "Unlock the library with the PIN first.");
}

export async function unlockAdmin(formData: FormData) {
  const pin = textField(formData, "pin");
  if (!pinMatches(pin)) bounce("/library", "That PIN is not right.");
  await grantAdmin();
  done("/library", "Library unlocked.");
}

export async function lockAdmin() {
  await clearAdmin();
  done("/", "Library locked.");
}

export async function adjustStock(reason: string, formData: FormData) {
  const id = intField(formData, "id");
  const quantity = intField(formData, "qty");
  if (!id || quantity == null) bounce("/stock", "Enter a quantity.");
  if (reason !== "received" && reason !== "used" && reason !== "damaged") bounce("/stock", "Pick what happened.");
  const result = receiveOrAdjust(getDb(), id, quantity, reason, textField(formData, "note"));
  if (!result.ok) bounce("/stock", result.error);
  const verb = reason === "received" ? "Added" : reason === "damaged" ? "Marked damaged" : "Used";
  done("/stock", `${verb} ${quantity}.`);
}

export async function countStock(formData: FormData) {
  const id = intField(formData, "id");
  const quantity = intField(formData, "quantity");
  if (!id || quantity == null) bounce("/stock", "Enter the count.");
  const result = setStockQuantity(getDb(), id, quantity, textField(formData, "note"));
  if (!result.ok) bounce("/stock", result.error);
  done("/stock", "Count saved.");
}

export async function saveStockDetails(formData: FormData) {
  const id = intField(formData, "id");
  const low = intField(formData, "low_stock_at");
  if (!id || low == null) bounce("/stock", "Enter a low-stock number. Use 0 to warn only when the shelf is empty.");
  const result = updateStockDetails(getDb(), id, low, textField(formData, "location"), textField(formData, "note"));
  if (!result.ok) bounce("/stock", result.error);
  done("/stock", "Stock details saved.");
}

export async function deleteStockRow(formData: FormData) {
  const id = intField(formData, "id");
  if (!id) bounce("/stock", "Missing stock row.");
  const result = removeStockRow(getDb(), id);
  if (!result.ok) bounce("/stock", result.error);
  done("/stock", "Removed from the list.");
}

export async function createStock(formData: FormData) {
  const blankId = intField(formData, "blank_id");
  const sizeId = intField(formData, "size_id");
  const materialId = intField(formData, "material_id");
  const quantity = intField(formData, "quantity");
  const low = intField(formData, "low_stock_at");
  if (!blankId || !sizeId || !materialId || quantity == null || low == null) {
    bounce("/stock", "Pick a blank, size, material, and quantity.");
  }
  const result = addStock(getDb(), {
    blankId,
    sizeId,
    materialId,
    quantity,
    lowStockAt: low,
    location: textField(formData, "location"),
    note: textField(formData, "note"),
  });
  if (!result.ok) bounce("/stock", result.error);
  done("/stock", quantity === 0 ? "Added to the shelf list." : `Added ${quantity} to the shelf.`);
}

export async function recordPress(formData: FormData) {
  const returnTo = safePath(textField(formData, "return_to"), "/");
  const recipeId = intField(formData, "recipe_id");
  const blankId = intField(formData, "blank_id");
  const materialId = intField(formData, "material_id");
  const quantity = intField(formData, "quantity");
  const tempC = intField(formData, "temp_c");
  const setpointC = intField(formData, "setpoint_c");
  const seconds = intField(formData, "seconds");
  if (!recipeId || !blankId || !materialId || quantity == null || tempC == null || setpointC == null || seconds == null) {
    bounce(returnTo, "The press card was missing a detail. Pick the item again.");
  }
  const result = logPress(getDb(), {
    recipeId,
    blankId,
    materialId,
    sizeId: intField(formData, "size_id"),
    quantity,
    printSite: textField(formData, "print_site"),
    note: textField(formData, "note"),
    deduct: flagField(formData, "deduct"),
    tempC,
    setpointC,
    seconds,
    pressure: textField(formData, "pressure") || "medium",
  });
  if (!result.ok) bounce(returnTo, result.error);
  done(returnTo, quantity === 1 ? "Press logged." : `${quantity} presses logged.`);
}

export async function saveTestedCopy(formData: FormData) {
  const recipeId = intField(formData, "recipe_id");
  const materialId = intField(formData, "material_id");
  const blankId = intField(formData, "blank_id");
  const methodId = intField(formData, "method_id");
  if (!recipeId || !materialId || !blankId || !methodId) bounce("/", "Could not copy that setting.");
  const result = copyAsTested(getDb(), recipeId, materialId, textField(formData, "note"));
  if (!result.ok || !result.id) bounce("/", result.ok ? "Could not copy that setting." : result.error);
  revalidatePath("/", "layout");
  redirect(`/?blank=${blankId}&material=${materialId}&method=${methodId}&recipe=${result.id}&saved=${encodeURIComponent("Saved as your tested setting.")}`);
}

export async function storeRecipe(formData: FormData) {
  await requireAdmin();
  const steps: Step[] = [];
  for (let index = 0; index < 6; index += 1) {
    const title = textField(formData, `step_title_${index}`);
    if (!title) continue;
    const kind = textField(formData, `step_kind_${index}`);
    const seconds = intField(formData, `step_seconds_${index}`);
    steps.push({
      kind: (STEP_KINDS.includes(kind as StepKind) ? kind : "note") as StepKind,
      title,
      seconds,
      detail: textField(formData, `step_detail_${index}`),
    });
  }
  const pressure = textField(formData, "pressure");
  const peel = textField(formData, "peel");
  const cover = textField(formData, "cover_sheet");
  const status = textField(formData, "status") === "tested" ? "tested" : "starter";
  const materialIds = formData.getAll("material_id").map((value) => Number(value)).filter((value) => Number.isInteger(value) && value > 0);
  const result = saveRecipe(getDb(), {
    id: intField(formData, "id"),
    blankId: intField(formData, "blank_id") ?? 0,
    methodId: intField(formData, "method_id") ?? 0,
    materialIds,
    name: textField(formData, "name"),
    tempC: intField(formData, "temp_c") ?? 0,
    tempF: intField(formData, "temp_f"),
    tempMinC: intField(formData, "temp_min_c"),
    tempMaxC: intField(formData, "temp_max_c"),
    timeSeconds: intField(formData, "time_seconds") ?? 0,
    timeMinSeconds: intField(formData, "time_min_seconds"),
    timeMaxSeconds: intField(formData, "time_max_seconds"),
    pressure: (PRESSURES.includes(pressure as Pressure) ? pressure : "") as Pressure,
    pressureNote: textField(formData, "pressure_note"),
    pressurePsi: intField(formData, "pressure_psi"),
    peel: (PEELS.includes(peel as Peel) ? peel : "") as Peel,
    peelWaitSeconds: intField(formData, "peel_wait_seconds") ?? 0,
    prepressSeconds: intField(formData, "prepress_seconds") ?? 0,
    coverSheet: (COVERS.includes(cover as CoverSheet) ? cover : "none") as CoverSheet,
    blowoutSheet: flagField(formData, "blowout_sheet"),
    mirrorPrint: flagField(formData, "mirror_print"),
    heatTape: flagField(formData, "heat_tape"),
    shrinkSleeve: flagField(formData, "shrink_sleeve"),
    pressingPillow: flagField(formData, "pressing_pillow"),
    coolDown: textField(formData, "cool_down") || "air",
    washWaitHours: intField(formData, "wash_wait_hours"),
    careNote: textField(formData, "care_note"),
    warnings: textField(formData, "warnings"),
    sourceNote: textField(formData, "source_note"),
    status,
    notes: textField(formData, "notes"),
    steps,
    preferred: flagField(formData, "preferred"),
  });
  if (!result.ok || !result.id) bounce("/library", result.ok ? "Could not save the setting." : result.error);
  done(`/library/recipe/${result.id}`, "Setting saved.");
}

export async function hideRecipe(formData: FormData) {
  await requireAdmin();
  const id = intField(formData, "id");
  if (!id) bounce("/library", "Missing setting.");
  const result = retireRecipe(getDb(), id);
  if (!result.ok) bounce("/library", result.error);
  done("/library", "Setting hidden from the press card.");
}

export async function storeBlank(formData: FormData) {
  await requireAdmin();
  const sizes = [];
  for (let index = 0; index < 8; index += 1) {
    const label = textField(formData, `size_label_${index}`);
    if (!label) continue;
    sizes.push({
      id: intField(formData, `size_id_${index}`),
      label,
      widthMm: intField(formData, `size_width_${index}`),
      heightMm: intField(formData, `size_height_${index}`),
      diameterMm: intField(formData, `size_diameter_${index}`),
      volumeMl: intField(formData, `size_volume_${index}`),
    });
  }
  const materialIds = formData.getAll("material_id").map(Number).filter((value) => Number.isInteger(value) && value > 0);
  const methodIds = formData.getAll("method_id").map(Number).filter((value) => Number.isInteger(value) && value > 0);
  const sites = textField(formData, "sites").split(/[\n,]/).map((site) => site.trim()).filter(Boolean);
  const press = textField(formData, "required_press");
  const result = saveBlank(getDb(), {
    id: intField(formData, "id"),
    name: textField(formData, "name"),
    category: textField(formData, "category"),
    shape: textField(formData, "shape"),
    requiredPress: press === "cup" || press === "any" ? press : "flat",
    notes: textField(formData, "notes"),
    materialIds,
    methodIds,
    sites,
    sizes,
  });
  if (!result.ok || !result.id) bounce("/library/blank/new", result.ok ? "Could not save the blank." : result.error);
  done(`/library/blank/${result.id}`, "Blank saved.");
}

export async function hideBlank(formData: FormData) {
  await requireAdmin();
  const id = intField(formData, "id");
  if (!id) bounce("/library", "Missing blank.");
  const result = retireBlank(getDb(), id);
  if (!result.ok) bounce("/library", result.error);
  done("/library", "Blank hidden.");
}

export async function storeMaterial(formData: FormData) {
  await requireAdmin();
  const sublimation = textField(formData, "sublimation");
  const result = saveMaterial(getDb(), {
    id: intField(formData, "id"),
    name: textField(formData, "name"),
    groupName: textField(formData, "group_name"),
    polyesterPercent: intField(formData, "polyester_percent"),
    sublimation: sublimation === "yes" || sublimation === "poor" ? sublimation : "no",
    heatNote: textField(formData, "heat_note"),
  });
  if (!result.ok) bounce("/library", result.error);
  done("/library", "Material saved.");
}

export async function storeMachine(formData: FormData) {
  await requireAdmin();
  const offsetRaw = textField(formData, "offset_c");
  const offset = offsetRaw === "" ? 0 : Number(offsetRaw);
  if (!Number.isFinite(offset)) bounce("/library", "Temperature offset needs a number. Use 0 if you have not measured the platen.");
  const maxRaw = textField(formData, "max_seconds");
  let maxSeconds: number | null = null;
  if (maxRaw !== "") {
    const parsed = Number(maxRaw);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      bounce("/library", "Maximum seconds needs a whole number above zero, or leave it blank.");
    }
    maxSeconds = parsed;
  }
  const result = saveMachine(getDb(), {
    id: intField(formData, "id"),
    name: textField(formData, "name"),
    kind: textField(formData, "kind") === "cup" ? "cup" : "flat",
    platenNote: textField(formData, "platen_note"),
    offsetC: offset,
    pressureStyle: textField(formData, "pressure_style"),
    notes: textField(formData, "notes"),
    tips: textField(formData, "tips"),
    maxSeconds,
  });
  if (!result.ok) bounce("/library", result.error);
  done("/library", "Press saved.");
}

export async function storeOverride(formData: FormData) {
  await requireAdmin();
  const recipeId = intField(formData, "recipe_id");
  const machineId = intField(formData, "machine_id");
  if (!recipeId || !machineId) bounce("/library", "Pick the press this override is for.");
  const result = saveOverride(getDb(), {
    recipeId,
    machineId,
    tempC: intField(formData, "temp_c"),
    timeSeconds: intField(formData, "time_seconds"),
    pressure: textField(formData, "pressure"),
    knob: textField(formData, "knob"),
    notes: textField(formData, "notes"),
  });
  if (!result.ok) bounce(`/library/recipe/${recipeId}`, result.error);
  done(`/library/recipe/${recipeId}`, "Press override saved.");
}

export async function storeEndProduct(formData: FormData) {
  await requireAdmin();
  const result = saveEndProduct(getDb(), {
    id: intField(formData, "id"),
    name: textField(formData, "name"),
    blankId: intField(formData, "blank_id") ?? 0,
    materialId: intField(formData, "material_id") ?? 0,
    methodId: intField(formData, "method_id") ?? 0,
    recipeId: intField(formData, "recipe_id"),
    sizeId: intField(formData, "size_id"),
    notes: textField(formData, "notes"),
  });
  if (!result.ok) bounce("/library", result.error);
  done("/library", "End product saved.");
}

export async function hideEndProduct(formData: FormData) {
  await requireAdmin();
  const id = intField(formData, "id");
  if (!id) bounce("/library", "Missing product.");
  const result = retireEndProduct(getDb(), id);
  if (!result.ok) bounce("/library", result.error);
  done("/library", "End product hidden.");
}
