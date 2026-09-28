import type { Blank, Material, Method, Recipe } from "./types";

export type MethodAccess = {
  state: "ok" | "warn" | "block";
  reason: string;
};

export function methodAccess(material: Material, method: Method): MethodAccess {
  if (method.slug === "sublimation") {
    if (material.sublimation === "no") {
      return {
        state: "block",
        reason: "Sublimation needs polyester, or a blank with a polymer coating. This material will not hold the dye.",
      };
    }
    if (material.sublimation === "poor") {
      return {
        state: "warn",
        reason: "Sublimation on this blend looks pale next to 100% polyester. It still will not work on a dark colour.",
      };
    }
  }

  if ((method.slug === "htv" || method.slug === "dtf") && material.groupName === "Coated blank") {
    return {
      state: "block",
      reason: "Vinyl and film transfers are for fabric. Coated mugs, coasters, and metal use sublimation.",
    };
  }

  if (method.slug === "htv" && material.name === "Nylon") {
    return {
      state: "block",
      reason: "Ordinary vinyl peels off nylon after washing. Add your own recipe only when the film pack lists nylon and a temperature.",
    };
  }

  if (material.name === "Performance polyester" && (method.slug === "htv" || method.slug === "dtf")) {
    return {
      state: "warn",
      reason: "Dark performance polyester readily bleeds dye into white ink or vinyl. Test, and drop the heat if the print discolours.",
    };
  }

  if (material.groupName === "Synthetic" && method.slug === "htv") {
    return {
      state: "warn",
      reason: "On dark polyester the shirt dye can tint the vinyl. If a test stains, lower the heat by about 10°C and add a few seconds.",
    };
  }

  return { state: "ok", reason: "" };
}

export function recipesFor(
  recipes: Recipe[],
  blankId: number,
  materialId: number,
  methodId: number,
): Recipe[] {
  return recipes.filter(
    (recipe) =>
      recipe.active &&
      recipe.blankId === blankId &&
      recipe.methodId === methodId &&
      recipe.materialIds.includes(materialId),
  );
}

export function chooseRecipe(
  list: Recipe[],
  prefer: "tested" | "starter",
  recipeId?: number | null,
): Recipe | null {
  if (recipeId) {
    const exact = list.find((recipe) => recipe.id === recipeId);
    if (exact) return exact;
  }
  if (prefer === "starter") {
    return list.find((recipe) => recipe.status === "starter" && recipe.preferred) ?? list.find((recipe) => recipe.status === "starter") ?? null;
  }
  return (
    list.find((recipe) => recipe.status === "tested" && recipe.preferred) ??
    list.find((recipe) => recipe.status === "tested") ??
    list.find((recipe) => recipe.preferred) ??
    list[0] ??
    null
  );
}

export function blankAllowsMethod(blank: Blank, methodId: number): boolean {
  return blank.methodIds.includes(methodId);
}

export function applyTimeOverride<T extends { kind: string; seconds: number | null }>(
  steps: T[],
  fromSeconds: number,
  toSeconds: number | null,
): { steps: T[]; applied: boolean } {
  if (toSeconds == null || toSeconds === fromSeconds) return { steps, applied: true };
  const indexes = steps
    .map((step, index) => (step.kind === "press" && step.seconds === fromSeconds ? index : -1))
    .filter((index) => index >= 0);
  if (indexes.length !== 1) return { steps, applied: false };
  const next = steps.slice();
  const index = indexes[0];
  next[index] = { ...next[index], seconds: toSeconds };
  return { steps: next, applied: true };
}
