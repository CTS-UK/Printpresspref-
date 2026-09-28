import assert from "node:assert/strict";
import test from "node:test";
import "./silence-sqlite";
import { DatabaseSync } from "node:sqlite";
import { ensureMachineColumns, ensureWorkshopPress, loadCatalog, openDatabase, seedIfEmpty } from "./db";
import { addStock, copyAsTested, logPress, receiveOrAdjust, saveRecipe } from "./mutate";

function fresh() {
  const db = openDatabase(":memory:");
  seedIfEmpty(db);
  return db;
}

test("seed loads Celsius targets and keeps cotton off sublimation", () => {
  const db = fresh();
  const catalog = loadCatalog(db);
  const poly = catalog.materials.find((material) => material.name === "100% polyester");
  const cotton = catalog.materials.find((material) => material.name === "100% cotton");
  const sublimation = catalog.methods.find((method) => method.slug === "sublimation");
  const shirt = catalog.blanks.find((blank) => blank.name === "T-shirt");
  assert.ok(poly && cotton && sublimation && shirt);
  const polyRecipe = catalog.recipes.find(
    (recipe) => recipe.blankId === shirt.id && recipe.methodId === sublimation.id && recipe.materialIds.includes(poly.id),
  );
  assert.equal(polyRecipe?.tempC, 200);
  assert.equal(polyRecipe?.tempF, 392);
  const cottonRecipe = catalog.recipes.find(
    (recipe) => recipe.methodId === sublimation.id && recipe.materialIds.includes(cotton.id),
  );
  assert.equal(cottonRecipe, undefined);
  const mug = catalog.blanks.find((blank) => blank.name === "Mug");
  assert.equal(mug?.requiredPress, "cup");
  const mugSize = catalog.sizes.find((size) => size.blankId === mug?.id && size.volumeMl === 330);
  assert.equal(mugSize?.label, "330 ml (11 oz)");

  const press = catalog.machines.find((machine) => machine.name === "HTVRONT Auto Heat Press");
  assert.equal(press?.kind, "flat");
  assert.match(press?.platenNote ?? "", /38/);
  assert.equal(press?.maxSeconds, 199);
  assert.equal(press?.pressureStyle, "auto");
  assert.match(press?.tips ?? "", /Celsius/);
  assert.match(press?.tips ?? "", /green/);
  assert.match(press?.tips ?? "", /drawer/);
});

test("an existing database gains the workshop press", () => {
  const db = fresh();
  db.prepare("DELETE FROM machines").run();
  ensureWorkshopPress(db);
  const press = loadCatalog(db).machines.find((machine) => machine.name === "HTVRONT Auto Heat Press");
  assert.equal(press?.kind, "flat");
  assert.equal(press?.maxSeconds, 199);
});

test("older machine tables gain tips and a time cap", () => {
  const db = new DatabaseSync(":memory:");
  db.exec(`CREATE TABLE machines (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    kind TEXT NOT NULL,
    platen_note TEXT NOT NULL DEFAULT '',
    offset_c REAL NOT NULL DEFAULT 0,
    pressure_style TEXT NOT NULL DEFAULT 'words',
    notes TEXT NOT NULL DEFAULT ''
  )`);
  ensureMachineColumns(db);
  const names = (db.prepare("PRAGMA table_info(machines)").all() as { name: string }[]).map((column) => column.name);
  assert.ok(names.includes("tips"));
  assert.ok(names.includes("max_seconds"));
});

test("stock cannot fall below zero and a press can take items off the shelf", () => {
  const db = fresh();
  const catalog = loadCatalog(db);
  const shirt = catalog.blanks.find((blank) => blank.name === "T-shirt")!;
  const cotton = catalog.materials.find((material) => material.name === "100% cotton")!;
  const size = catalog.sizes.find((item) => item.blankId === shirt.id && item.label === "M")!;
  const vinyl = catalog.methods.find((method) => method.slug === "htv")!;
  const recipe = catalog.recipes.find((item) => item.name === "T-shirt · cotton · vinyl")!;

  const added = addStock(db, {
    blankId: shirt.id,
    sizeId: size.id,
    materialId: cotton.id,
    quantity: 2,
    lowStockAt: 1,
    location: "Box A",
    note: "White",
  });
  assert.equal(added.ok, true);

  const tooMany = receiveOrAdjust(db, added.id!, 5, "used", "");
  assert.equal(tooMany.ok, false);

  const pressed = logPress(db, {
    recipeId: recipe.id,
    blankId: shirt.id,
    materialId: cotton.id,
    sizeId: size.id,
    quantity: 1,
    printSite: "Left chest",
    note: "",
    deduct: true,
    tempC: 150,
    setpointC: 150,
    seconds: 12,
    pressure: "medium",
  });
  assert.equal(pressed.ok, true);
  const stock = loadCatalog(db).stock.find((item) => item.sizeId === size.id && item.materialId === cotton.id);
  assert.equal(stock?.quantity, 1);
  const log = db.prepare("SELECT temp_c, print_site, deducted FROM press_log").get() as {
    temp_c: number;
    print_site: string;
    deducted: number;
  };
  assert.equal(log.temp_c, 150);
  assert.equal(log.print_site, "Left chest");
  assert.equal(log.deducted, 1);
  assert.equal(vinyl.slug, "htv");
});

test("a tested copy becomes the preferred setting", () => {
  const db = fresh();
  const catalog = loadCatalog(db);
  const recipe = catalog.recipes.find((item) => item.name === "Mouse mat · neoprene · sublimation")!;
  const materialId = recipe.materialIds[0];
  const copied = copyAsTested(db, recipe.id, materialId, "50 seconds was a bit light, still using this heat.");
  assert.equal(copied.ok, true);
  const next = loadCatalog(db);
  const tested = next.recipes.find((item) => item.id === copied.id);
  assert.equal(tested?.status, "tested");
  assert.equal(tested?.preferred, true);
  assert.equal(tested?.tempC, 199);
  const starterRow = next.recipes.find((item) => item.id === recipe.id);
  assert.equal(starterRow?.preferred, false);

  const saved = saveRecipe(db, {
    id: tested!.id,
    blankId: tested!.blankId,
    methodId: tested!.methodId,
    materialIds: tested!.materialIds,
    name: tested!.name,
    tempC: 193,
    tempF: 380,
    tempMinC: null,
    tempMaxC: null,
    timeSeconds: 55,
    timeMinSeconds: null,
    timeMaxSeconds: null,
    pressure: "light",
    pressureNote: "Foam was denting",
    pressurePsi: null,
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
    careNote: "",
    warnings: tested!.warnings,
    sourceNote: "Tested on our mats",
    status: "tested",
    notes: "193°C and lighter pressure",
    steps: [{ kind: "press", title: "Press", seconds: 55, detail: "193°C, light pressure." }],
    preferred: true,
  });
  assert.equal(saved.ok, true);
  const updated = loadCatalog(db).recipes.find((item) => item.id === tested!.id);
  assert.equal(updated?.tempC, 193);
  assert.equal(updated?.steps[0]?.seconds, 55);
});
