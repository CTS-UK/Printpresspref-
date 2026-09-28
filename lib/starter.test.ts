import assert from "node:assert/strict";
import test from "node:test";
import { starter, starterIssues } from "./starter";
import { fahrenheitFromCelsius, fahrenheitToShow, londonMidnightUtc, mmToCm } from "./units";
import { timeHeadline } from "./labels";
import { chooseRecipe, methodAccess, recipesFor } from "./match";
import type { Material, Method, Recipe } from "./types";

test("starter library agrees with itself", () => {
  assert.deepEqual(starterIssues(), []);
  assert.ok(starter.recipes.length >= 30);
});

test("sublimation is never attached to cotton", () => {
  for (const recipe of starter.recipes) {
    if (recipe.method !== "sublimation") continue;
    for (const name of recipe.materials) {
      assert.equal(name.includes("cotton") && name.startsWith("100%"), false);
      assert.notEqual(name, "Organic cotton");
      assert.notEqual(name, "65% cotton / 35% polyester");
    }
  }
});

test("published Fahrenheit figures are kept when they do not round cleanly", () => {
  assert.equal(fahrenheitFromCelsius(150), 302);
  assert.equal(fahrenheitToShow(150, 305), 305);
  assert.equal(fahrenheitToShow(200, 392), 392);
  assert.equal(mmToCm(95), "9.5");
  assert.equal(mmToCm(230), "23");
});

test("a two-press coaster reads as two times", () => {
  const ceramic = starter.recipes.find((recipe) => recipe.name === "Round coaster · ceramic · sublimation");
  assert.ok(ceramic);
  assert.equal(timeHeadline(ceramic.steps, ceramic.timeSeconds), "90 seconds, then 90 seconds");
  assert.equal(ceramic.tempC, 199);
});

test("cotton blocks sublimation and polyester allows it", () => {
  const cotton: Material = {
    id: 1,
    name: "100% cotton",
    groupName: "Natural",
    polyesterPercent: 0,
    sublimation: "no",
    heatNote: "",
    sortOrder: 0,
  };
  const poly: Material = { ...cotton, id: 2, name: "100% polyester", groupName: "Synthetic", polyesterPercent: 100, sublimation: "yes" };
  const sublimation: Method = { id: 1, name: "Sublimation", slug: "sublimation", summary: "", enabled: true, sortOrder: 0 };
  assert.equal(methodAccess(cotton, sublimation).state, "block");
  assert.equal(methodAccess(poly, sublimation).state, "ok");
});

test("a tested copy wins over the starter", () => {
  const starterRecipe = { id: 1, status: "starter", preferred: true, active: true, blankId: 1, methodId: 1, materialIds: [1] } as Recipe;
  const tested = { ...starterRecipe, id: 2, status: "tested" } as Recipe;
  const list = recipesFor([starterRecipe, tested], 1, 1, 1);
  assert.equal(chooseRecipe(list, "tested")?.id, 2);
  assert.equal(chooseRecipe(list, "starter")?.id, 1);
});

test("London midnight is midnight in London", () => {
  const midnight = londonMidnightUtc(new Date("2026-07-01T12:00:00Z"));
  const clock = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(midnight);
  assert.equal(clock, "00:00");
});
