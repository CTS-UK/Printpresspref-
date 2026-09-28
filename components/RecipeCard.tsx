import { recordPress, saveTestedCopy } from "@/app/actions";
import { StepTimer } from "@/components/StepTimer";
import { glanceChips, peelHelpText, peelLabel, pressureHelpText, pressureLabel, pressKindLabel, rangeLine, timeHeadline } from "@/lib/labels";
import { fahrenheitNote, fahrenheitToShow } from "@/lib/units";
import type { Blank, Machine, Material, Method, PrintSite, Recipe, Size, Step, StockItem } from "@/lib/types";

export function RecipeCard({
  recipe,
  blank,
  material,
  method,
  machine,
  setpointC,
  shownTempC,
  shownTempF,
  shownPressure,
  knob,
  steps,
  timeNote,
  sizes,
  sites,
  sizeId,
  returnTo,
  stock,
  warning,
  starterHref,
  testedHref,
}: {
  recipe: Recipe;
  blank: Blank;
  material: Material;
  method: Method;
  machine: Machine | null;
  setpointC: number;
  shownTempC: number;
  shownTempF: number | null;
  shownPressure: string;
  knob: string;
  steps: Step[];
  timeNote: string | null;
  sizes: Size[];
  sites: PrintSite[];
  sizeId: number | null;
  returnTo: string;
  stock: StockItem[];
  warning: string;
  starterHref: string | null;
  testedHref: string | null;
}) {
  const fahrenheit = fahrenheitToShow(shownTempC, shownTempF);
  const chips = glanceChips(recipe);
  const range = rangeLine(recipe);
  const matchingStock = stock.filter((item) => item.blankId === blank.id && item.materialId === material.id);
  const sized = sizeId ? matchingStock.find((item) => item.sizeId === sizeId) : undefined;
  const onShelf = sized?.quantity ?? matchingStock.reduce((sum, item) => sum + item.quantity, 0);
  const tracked = matchingStock.length > 0;

  return (
    <article className="card">
      <p className={recipe.status === "tested" ? "banner good" : "banner"}>
        {recipe.status === "tested" ? "Your tested setting" : "Starter — press a scrap before a full run"}
      </p>
      <h1>{shownTempC}°C</h1>
      <p className="temp-f" style={{ marginTop: "-0.6rem" }}>{fahrenheit}°F</p>
      <p className="muted">{fahrenheitNote(shownTempC, shownTempF)}</p>
      <p className="time-line">{timeHeadline(steps, recipe.timeSeconds)}</p>
      <p>
        <strong>{pressureLabel(shownPressure)}</strong>
        {recipe.pressurePsi ? ` · about ${recipe.pressurePsi} psi` : ""} · {peelLabel(recipe.peel)}
        {recipe.peelWaitSeconds > 0 ? ` after ${recipe.peelWaitSeconds}s` : ""}
      </p>
      <p className="muted">{pressureHelpText(shownPressure)} {peelHelpText(recipe.peel)}{knob ? ` Knob ${knob}.` : ""}</p>
      {recipe.pressureNote ? <p>{recipe.pressureNote}</p> : null}
      {machine ? (
        <p className="note-box">
          {machine.name} · {pressKindLabel(machine.kind)}
          {machine.platenNote ? ` · ${machine.platenNote}` : ""}.{" "}
          {setpointC === shownTempC
            ? "No temperature offset is saved, so set the controller to the same number."
            : `Set the controller to ${setpointC}°C. It reads ${machine.offsetC}° too high, so the platen lands near ${shownTempC}°C.`}
        </p>
      ) : (
        <p className="muted">This uses a {pressKindLabel(blank.requiredPress).toLowerCase()}. Add the machine in the library when you have the model, including any temperature offset.</p>
      )}
      {blank.requiredPress !== "any" && machine && machine.kind !== blank.requiredPress ? (
        <p className="warn-box">This blank needs a {pressKindLabel(blank.requiredPress).toLowerCase()}. {machine.name} is a {pressKindLabel(machine.kind).toLowerCase()}.</p>
      ) : null}
      {warning ? <p className="warn-box">{warning}</p> : null}
      {recipe.warnings ? <p className="warn-box">{recipe.warnings}</p> : null}
      {timeNote ? <p className="warn-box">{timeNote}</p> : null}
      {chips.length > 0 ? (
        <div className="chips">
          {chips.map((chip) => <span className="chip" key={chip}>{chip}</span>)}
        </div>
      ) : null}
      {range ? <p className="muted">{range}</p> : null}
      <p className="muted">{blank.name} · {material.name} · {method.name}{tracked ? ` · ${onShelf} on the shelf` : ""}</p>
      {recipe.notes ? <p>{recipe.notes}</p> : null}
      {recipe.careNote ? <p>{recipe.careNote}</p> : null}
      <StepTimer steps={steps} />
      <div className="no-print stack">
        <form action={recordPress} className="fields">
          <h2>Log this press</h2>
          <input type="hidden" name="return_to" value={returnTo} />
          <input type="hidden" name="recipe_id" value={recipe.id} />
          <input type="hidden" name="blank_id" value={blank.id} />
          <input type="hidden" name="material_id" value={material.id} />
          <input type="hidden" name="temp_c" value={shownTempC} />
          <input type="hidden" name="setpoint_c" value={setpointC} />
          <input type="hidden" name="seconds" value={steps.find((step) => step.kind === "press" && step.seconds)?.seconds ?? recipe.timeSeconds} />
          <input type="hidden" name="pressure" value={shownPressure} />
          <div className="fields two">
            <label>
              How many
              <input name="quantity" type="number" min={1} step={1} defaultValue={1} required />
            </label>
            {sizes.length > 0 ? (
              <label>
                Size
                <select name="size_id" defaultValue={sizeId ?? sizes[0]?.id} required>
                  {sizes.map((size) => <option value={size.id} key={size.id}>{size.label}</option>)}
                </select>
              </label>
            ) : null}
            {sites.length > 0 ? (
              <label>
                Where on the item
                <select name="print_site" defaultValue="">
                  <option value="">Not set</option>
                  {sites.map((site) => <option value={site.name} key={site.id}>{site.name}</option>)}
                </select>
              </label>
            ) : null}
          </div>
          <label>
            Note
            <input name="note" placeholder="Order name, colour, anything you want to remember" />
          </label>
          <label className="check">
            <input type="checkbox" name="deduct" defaultChecked={tracked && onShelf > 0} />
            Take this many off the shelf
          </label>
          <button className="primary" type="submit">Log press</button>
        </form>
        {recipe.status === "starter" ? (
          <form action={saveTestedCopy} className="fields">
            <h2>Keep this as my setting</h2>
            <p className="muted">Copies the starter and marks it tested, so the press card shows yours first. Change the numbers in the library afterwards.</p>
            <input type="hidden" name="recipe_id" value={recipe.id} />
            <input type="hidden" name="material_id" value={material.id} />
            <input type="hidden" name="blank_id" value={blank.id} />
            <input type="hidden" name="method_id" value={method.id} />
            <label>
              What did you find?
              <input name="note" placeholder="Optional" />
            </label>
            <button className="secondary" type="submit">Save tested copy</button>
          </form>
        ) : null}
        <p>
          <a href={`/library/recipe/${recipe.id}`}>Adjust every setting</a>
          {starterHref ? <> · <a href={starterHref}>View the starter chart</a></> : null}
          {testedHref ? <> · <a href={testedHref}>Back to my tested setting</a></> : null}
        </p>
        <details>
          <summary>Where this number comes from</summary>
          <p>{recipe.sourceNote}</p>
        </details>
      </div>
    </article>
  );
}
