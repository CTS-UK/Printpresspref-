import { Flash } from "@/components/Flash";
import { ProductPicker, type PickItem } from "@/components/ProductPicker";
import { RecipeCard } from "@/components/RecipeCard";
import { getDb, loadCatalog } from "@/lib/db";
import { byId, pressHref, readId, readText } from "@/lib/format";
import { mainPressSeconds } from "@/lib/labels";
import { splitLongPresses } from "@/lib/machine";
import { applyTimeOverride, chooseRecipe, methodAccess, recipesFor } from "@/lib/match";
import { controllerSetpoint } from "@/lib/units";
import type { Material } from "@/lib/types";

export const dynamic = "force-dynamic";

const groups = ["Natural", "Blend", "Synthetic", "Coated blank"];

function shelfCount(stock: { blankId: number; materialId: number; sizeId: number; quantity: number }[], blankId: number, materialId?: number, sizeId?: number | null) {
  const rows = stock.filter((item) => item.blankId === blankId && (materialId == null || item.materialId === materialId) && (sizeId == null || item.sizeId === sizeId));
  if (rows.length === 0) return null;
  return rows.reduce((sum, item) => sum + item.quantity, 0);
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const catalog = loadCatalog(getDb());
  const saved = readText(params.saved);
  const error = readText(params.error);
  const product = byId(catalog.endProducts, readId(params.product));
  const blank = byId(catalog.blanks, readId(params.blank) ?? product?.blankId ?? null);
  const material = byId(catalog.materials, readId(params.material) ?? (blank && product?.blankId === blank.id ? product.materialId : null));
  const method = byId(catalog.methods, readId(params.method) ?? (blank && material && product?.blankId === blank.id && product.materialId === material.id ? product.methodId : null));
  const sizeId = readId(params.size) ?? (product && blank && product.blankId === blank.id ? product.sizeId : null);
  const prefer = readText(params.prefer) === "starter" ? "starter" : "tested";

  if (!blank || !blank.active) {
    const sellable: PickItem[] = catalog.endProducts.filter((item) => item.active).map((item) => {
      const itemBlank = byId(catalog.blanks, item.blankId);
      const itemMaterial = byId(catalog.materials, item.materialId);
      const itemMethod = byId(catalog.methods, item.methodId);
      const recipe = byId(catalog.recipes, item.recipeId);
      const onShelf = shelfCount(catalog.stock, item.blankId, item.materialId, item.sizeId);
      return {
        href: pressHref({
          product: item.id,
          blank: item.blankId,
          material: item.materialId,
          method: item.methodId,
          size: item.sizeId,
          recipe: item.recipeId,
        }),
        title: item.name,
        detail: [itemBlank?.name, itemMaterial?.name, itemMethod?.name].filter(Boolean).join(" · "),
        meta: [recipe ? `${recipe.tempC}°C` : null, onShelf == null ? null : `${onShelf} on the shelf`].filter(Boolean).join(" · "),
      };
    });
    const byCategory = new Map<string, PickItem[]>();
    for (const item of catalog.blanks.filter((item) => item.active)) {
      const list = byCategory.get(item.category) ?? [];
      const onShelf = shelfCount(catalog.stock, item.id);
      list.push({
        href: pressHref({ blank: item.id }),
        title: item.name,
        detail: item.notes || item.category,
        meta: onShelf == null ? undefined : `${onShelf} on the shelf`,
      });
      byCategory.set(item.category, list);
    }
    return (
      <main>
        <Flash saved={saved} error={error} />
        <h1>What are you pressing?</h1>
        <p className="lede">Pick something you sell, or start from the blank. The card shows the heat in Celsius, the time, and the pressure.</p>
        <ProductPicker
          groups={[
            { title: "What you sell", hint: "These jump straight to a setting.", items: sellable },
            ...Array.from(byCategory.entries()).map(([title, items]) => ({ title, items })),
          ]}
        />
      </main>
    );
  }

  const query = {
    blank: blank.id,
    material: material?.id,
    method: method?.id,
    size: sizeId,
    machine: readId(params.machine),
    product: product && product.blankId === blank.id ? product.id : null,
    recipe: readId(params.recipe),
    prefer: prefer === "starter" ? "starter" : null,
  };

  if (!material || !blank.materialIds.includes(material.id)) {
    const linked = catalog.materials.filter((item) => blank.materialIds.includes(item.id));
    return (
      <main>
        <Flash saved={saved} error={error} />
        <p className="crumbs"><a href="/">All</a> <span>{blank.name}</span></p>
        <h1>{blank.name}</h1>
        <p className="lede">Which material is it? Read the label, not the colour.</p>
        {groups.map((group) => {
          const items = linked.filter((item) => item.groupName === group);
          if (items.length === 0) return null;
          return (
            <section className="section" key={group}>
              <h2>{group}</h2>
              <div className="choices">
                {items.map((item) => (
                  <MaterialChoice key={item.id} material={item} href={pressHref({ ...query, material: item.id, method: null, recipe: null })} stock={shelfCount(catalog.stock, blank.id, item.id)} />
                ))}
              </div>
            </section>
          );
        })}
        {blank.notes ? <p className="muted">{blank.notes}</p> : null}
      </main>
    );
  }

  if (!method || !blank.methodIds.includes(method.id)) {
    const choices = catalog.methods.filter((item) => blank.methodIds.includes(item.id) && item.enabled);
    const open = choices.filter((item) => methodAccess(material, item).state !== "block");
    const blocked = choices.filter((item) => methodAccess(material, item).state === "block");
    return (
      <main>
        <Flash saved={saved} error={error} />
        <p className="crumbs">
          <a href="/">All</a>
          <a href={pressHref({ blank: blank.id })}>{blank.name}</a>
          <span>{material.name}</span>
        </p>
        <h1>{material.name}</h1>
        <p className="lede">{material.heatNote}</p>
        <div className="choices">
          {open.map((item) => {
            const access = methodAccess(material, item);
            const hasRecipe = recipesFor(catalog.recipes, blank.id, material.id, item.id).length > 0;
            return (
              <a className="choice" key={item.id} href={pressHref({ ...query, method: item.id, recipe: null, prefer: null })}>
                <strong>{item.name}</strong>
                <small>{item.summary}</small>
                {access.reason ? <small style={{ display: "block", marginTop: "0.35rem" }}>{access.reason}</small> : null}
                {!hasRecipe ? <small style={{ display: "block", marginTop: "0.35rem" }}>No saved setting yet. You can add one in the library.</small> : null}
              </a>
            );
          })}
        </div>
        {blocked.length > 0 ? (
          <details>
            <summary>Why some prints are missing</summary>
            <ul className="list">
              {blocked.map((item) => (
                <li key={item.id}><span><strong>{item.name}.</strong> {methodAccess(material, item).reason}</span></li>
              ))}
            </ul>
          </details>
        ) : null}
      </main>
    );
  }

  const access = methodAccess(material, method);
  const matches = recipesFor(catalog.recipes, blank.id, material.id, method.id);
  const recipe = access.state === "block" ? null : chooseRecipe(matches, prefer, readId(params.recipe));
  const returnTo = pressHref({ ...query, prefer: prefer === "starter" ? "starter" : null, recipe: recipe?.id });

  if (!recipe) {
    return (
      <main>
        <Flash saved={saved} error={error} />
        <p className="crumbs">
          <a href="/">All</a>
          <a href={pressHref({ blank: blank.id })}>{blank.name}</a>
          <a href={pressHref({ blank: blank.id, material: material.id })}>{material.name}</a>
        </p>
        <h1>No setting saved</h1>
        <p>{access.state === "block" ? access.reason : `${method.name} on ${material.name} does not have a saved setting yet.`}</p>
        <p><a className="button primary" href={`/library/recipe/new?blank=${blank.id}&material=${material.id}&method=${method.id}`}>Add a setting</a></p>
      </main>
    );
  }

  const machineId = readId(params.machine) ?? (catalog.machines.length === 1 ? catalog.machines[0].id : null);
  const machine = byId(catalog.machines, machineId) ?? null;
  const override = machine ? catalog.overrides.find((item) => item.recipeId === recipe.id && item.machineId === machine.id) : undefined;
  const shownTempC = override?.tempC ?? recipe.tempC;
  const shownPressure = override?.pressure || recipe.pressure;
  const baseSeconds = mainPressSeconds(recipe.steps, recipe.timeSeconds);
  const timed = applyTimeOverride(recipe.steps, baseSeconds, override?.timeSeconds ?? null);
  const steps = splitLongPresses(timed.steps, machine?.maxSeconds ?? null);
  const timeNote = override?.timeSeconds != null && !timed.applied
    ? "This press has its own time saved, but the recipe presses more than once, so the steps were left as written."
    : null;
  const tested = matches.find((item) => item.status === "tested");
  const starter = matches.find((item) => item.status === "starter");
  const sizes = catalog.sizes.filter((size) => size.blankId === blank.id);
  const sites = catalog.sites.filter((site) => site.blankId === blank.id);

  return (
    <main>
      <Flash saved={saved} error={error} />
      <p className="crumbs">
        <a href="/">All</a>
        <a href={pressHref({ blank: blank.id })}>{blank.name}</a>
        <a href={pressHref({ blank: blank.id, material: material.id })}>{material.name}</a>
        <span>{method.name}</span>
      </p>
      {catalog.machines.length > 0 ? (
        <div className="chips no-print">
          {catalog.machines.map((item) => (
            <a className={item.id === machine?.id ? "chip on" : "chip"} key={item.id} href={pressHref({ ...query, machine: item.id, recipe: recipe.id })}>
              {item.name}
            </a>
          ))}
        </div>
      ) : null}
      <RecipeCard
        recipe={recipe}
        blank={blank}
        material={material}
        method={method}
        machine={machine}
        setpointC={machine ? controllerSetpoint(shownTempC, machine.offsetC) : shownTempC}
        shownTempC={shownTempC}
        shownTempF={shownTempC === recipe.tempC ? recipe.tempF : null}
        shownPressure={shownPressure}
        knob={override?.knob ?? ""}
        steps={steps}
        timeNote={timeNote}
        sizes={sizes}
        sites={sites}
        sizeId={sizeId}
        returnTo={returnTo}
        stock={catalog.stock}
        warning={access.reason}
        starterHref={recipe.status === "tested" && starter ? pressHref({ ...query, prefer: "starter", recipe: starter.id }) : null}
        testedHref={recipe.status === "starter" && tested ? pressHref({ ...query, prefer: null, recipe: tested.id }) : null}
      />
    </main>
  );
}

function MaterialChoice({ material, href, stock }: { material: Material; href: string; stock: number | null }) {
  const fit = material.sublimation === "yes" ? "Sublimation works" : material.sublimation === "poor" ? "Sublimation is pale" : "No sublimation";
  const percent = material.polyesterPercent == null ? null : `${material.polyesterPercent}% polyester`;
  return (
    <a className="choice" href={href}>
      <strong>{material.name}</strong>
      <small>{[percent, fit].filter(Boolean).join(" · ")}</small>
      {stock == null ? null : <small style={{ display: "block", marginTop: "0.35rem" }}>{stock} on the shelf</small>}
    </a>
  );
}
