import assert from "node:assert/strict";
import test from "node:test";
import { machineWarnings, splitLongPresses } from "./machine";
import type { Step } from "./types";

function press(seconds: number, title = "Press"): Step {
  return { kind: "press", title, seconds, detail: "Hold it." };
}

test("a step longer than the timer splits, and a shorter one stays whole", () => {
  const long = splitLongPresses([press(240)], 199);
  assert.equal(long.length, 2);
  assert.equal(long[0].seconds, 199);
  assert.match(long[0].detail, /199/);
  assert.equal(long[1].title, "Press the rest");
  assert.equal(long[1].seconds, 41);

  const mug = splitLongPresses([press(180, "Mug")], 199);
  assert.equal(mug.length, 1);
  assert.equal(mug[0].seconds, 180);
  assert.equal(mug[0].title, "Mug");
});

test("mouse mats and hoodies get automatic-pressure warnings", () => {
  assert.match(machineWarnings("Mouse mat", "auto")[0] ?? "", /foam/);
  assert.match(machineWarnings("Hoodie", "auto")[0] ?? "", /drawer/);
  assert.deepEqual(machineWarnings("Mug", "auto"), []);
  assert.deepEqual(machineWarnings("Mouse mat", "words"), []);
});
