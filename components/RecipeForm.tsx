import { hideRecipe, storeOverride, storeRecipe } from "@/app/actions";
import { COVERS, PEELS, PRESSURES, coverLabel, peelLabel, pressureLabel, stepKindLabel, STEP_KINDS } from "@/lib/labels";
import type { Catalog, Recipe } from "@/lib/types";

export function RecipeForm({
  catalog,
  recipe,
  defaults,
}: {
  catalog: Catalog;
  recipe: Recipe | null;
  defaults: { blankId: number | null; materialId: number | null; methodId: number | null };
}) {
  const blankId = recipe?.blankId ?? defaults.blankId ?? catalog.blanks.find((blank) => blank.active)?.id;
  const methodId = recipe?.methodId ?? defaults.methodId ?? catalog.methods[0]?.id;
  const selectedMaterials = new Set(recipe?.materialIds ?? (defaults.materialId ? [defaults.materialId] : []));
  const steps = recipe?.steps ?? [];

  return (
    <div className="stack">
      <form action={storeRecipe} className="fields">
        {recipe ? <input type="hidden" name="id" value={recipe.id} /> : null}
        <fieldset>
          <legend>What it is for</legend>
          <label>
            Name
            <input name="name" required defaultValue={recipe?.name ?? ""} placeholder="Round coaster · ceramic · sublimation" />
          </label>
          <div className="fields two">
            <label>
              Blank
              <select name="blank_id" defaultValue={blankId}>
                {catalog.blanks.filter((blank) => blank.active).map((blank) => (
                  <option value={blank.id} key={blank.id}>{blank.name}</option>
                ))}
              </select>
            </label>
            <label>
              Print method
              <select name="method_id" defaultValue={methodId}>
                {catalog.methods.map((method) => (
                  <option value={method.id} key={method.id}>{method.name}</option>
                ))}
              </select>
            </label>
            <label>
              Status
              <select name="status" defaultValue={recipe?.status ?? "tested"}>
                <option value="tested">Tested in this workshop</option>
                <option value="starter">Starter chart</option>
              </select>
            </label>
          </div>
          <label className="check">
            <input type="checkbox" name="preferred" defaultChecked={recipe?.preferred ?? true} />
            Show this one first when several settings match
          </label>
          <div className="checks cols">
            {catalog.materials.map((material) => (
              <label className="check" key={material.id}>
                <input type="checkbox" name="material_id" value={material.id} defaultChecked={selectedMaterials.has(material.id)} />
                {material.name}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend>Heat and time</legend>
          <div className="fields two">
            <label>
              Temperature °C
              <input name="temp_c" type="number" required defaultValue={recipe?.tempC ?? 180} />
            </label>
            <label>
              Fahrenheit figure, if the chart prints one
              <input name="temp_f" type="number" defaultValue={recipe?.tempF ?? ""} placeholder="Leave blank to convert" />
            </label>
            <label>
              Lowest °C in the published window
              <input name="temp_min_c" type="number" defaultValue={recipe?.tempMinC ?? ""} />
            </label>
            <label>
              Highest °C in the published window
              <input name="temp_max_c" type="number" defaultValue={recipe?.tempMaxC ?? ""} />
            </label>
            <label>
              Main time, seconds
              <input name="time_seconds" type="number" min={1} required defaultValue={recipe?.timeSeconds ?? 30} />
            </label>
            <label>
              Shortest published time
              <input name="time_min_seconds" type="number" defaultValue={recipe?.timeMinSeconds ?? ""} />
            </label>
            <label>
              Longest published time
              <input name="time_max_seconds" type="number" defaultValue={recipe?.timeMaxSeconds ?? ""} />
            </label>
            <label>
              Pre-press, seconds
              <input name="prepress_seconds" type="number" min={0} defaultValue={recipe?.prepressSeconds ?? 0} />
            </label>
          </div>
        </fieldset>

        <fieldset>
          <legend>Pressure and peel</legend>
          <div className="fields two">
            <label>
              Pressure
              <select name="pressure" defaultValue={recipe?.pressure ?? "medium"}>
                {PRESSURES.map((pressure) => <option value={pressure} key={pressure}>{pressureLabel(pressure)}</option>)}
              </select>
            </label>
            <label>
              PSI, if you have a gauge
              <input name="pressure_psi" type="number" defaultValue={recipe?.pressurePsi ?? ""} />
            </label>
            <label>
              Peel
              <select name="peel" defaultValue={recipe?.peel ?? "hot"}>
                {PEELS.map((peel) => <option value={peel} key={peel}>{peelLabel(peel)}</option>)}
              </select>
            </label>
            <label>
              Wait before peel, seconds
              <input name="peel_wait_seconds" type="number" min={0} defaultValue={recipe?.peelWaitSeconds ?? 0} />
            </label>
          </div>
          <label>
            Pressure note
            <input name="pressure_note" defaultValue={recipe?.pressureNote ?? ""} />
          </label>
        </fieldset>

        <fieldset>
          <legend>Sheets, tape, and aftercare</legend>
          <div className="fields two">
            <label>
              Cover sheet
              <select name="cover_sheet" defaultValue={recipe?.coverSheet ?? "none"}>
                {COVERS.map((cover) => <option value={cover} key={cover}>{coverLabel(cover)}</option>)}
              </select>
            </label>
            <label>
              Cool down
              <select name="cool_down" defaultValue={recipe?.coolDown ?? "air"}>
                <option value="air">In the air</option>
                <option value="rack">On a rack, not stacked</option>
                <option value="warm water">Warm water, only if the blank maker says so</option>
              </select>
            </label>
            <label>
              Hours before the first wash
              <input name="wash_wait_hours" type="number" min={0} defaultValue={recipe?.washWaitHours ?? ""} />
            </label>
          </div>
          <div className="checks cols">
            <label className="check"><input type="checkbox" name="mirror_print" defaultChecked={recipe?.mirrorPrint ?? true} /> Mirror the print</label>
            <label className="check"><input type="checkbox" name="blowout_sheet" defaultChecked={recipe?.blowoutSheet ?? false} /> Butcher paper inside a shirt</label>
            <label className="check"><input type="checkbox" name="heat_tape" defaultChecked={recipe?.heatTape ?? false} /> Heat tape</label>
            <label className="check"><input type="checkbox" name="shrink_sleeve" defaultChecked={recipe?.shrinkSleeve ?? false} /> Shrink sleeve</label>
            <label className="check"><input type="checkbox" name="pressing_pillow" defaultChecked={recipe?.pressingPillow ?? false} /> Pressing pillow</label>
          </div>
          <label>
            Care note
            <input name="care_note" defaultValue={recipe?.careNote ?? ""} />
          </label>
          <label>
            Warning
            <textarea name="warnings" defaultValue={recipe?.warnings ?? ""} />
          </label>
          <label>
            Notes
            <textarea name="notes" defaultValue={recipe?.notes ?? ""} />
          </label>
          <label>
            Where the numbers come from
            <textarea name="source_note" defaultValue={recipe?.sourceNote ?? ""} />
          </label>
        </fieldset>

        <fieldset>
          <legend>Steps</legend>
          <p className="muted">Leave a title blank to skip that step. The press card times any step with seconds.</p>
          {Array.from({ length: 6 }, (_, index) => {
            const step = steps[index];
            return (
              <div className="fields" key={index}>
                <div className="fields two">
                  <label>
                    Step {index + 1}
                    <input name={`step_title_${index}`} defaultValue={step?.title ?? ""} />
                  </label>
                  <label>
                    Type
                    <select name={`step_kind_${index}`} defaultValue={step?.kind ?? "press"}>
                      {STEP_KINDS.map((kind) => <option value={kind} key={kind}>{stepKindLabel(kind)}</option>)}
                    </select>
                  </label>
                  <label>
                    Seconds
                    <input name={`step_seconds_${index}`} type="number" min={0} defaultValue={step?.seconds ?? ""} />
                  </label>
                </div>
                <label>
                  What to do
                  <input name={`step_detail_${index}`} defaultValue={step?.detail ?? ""} />
                </label>
              </div>
            );
          })}
        </fieldset>
        <button className="primary" type="submit">Save setting</button>
      </form>

      {recipe && catalog.machines.length > 0 ? (
        <form action={storeOverride} className="fields">
          <h2>This press only</h2>
          <p className="muted">Use this when one machine needs a different controller number, time, or knob. Leave heat or time blank to keep the recipe.</p>
          <input type="hidden" name="recipe_id" value={recipe.id} />
          <label>
            Press
            <select name="machine_id" defaultValue={catalog.machines[0]?.id}>
              {catalog.machines.map((machine) => <option value={machine.id} key={machine.id}>{machine.name}</option>)}
            </select>
          </label>
          <div className="fields two">
            <label>
              Platen target °C
              <input name="temp_c" type="number" />
            </label>
            <label>
              Time, seconds
              <input name="time_seconds" type="number" />
            </label>
            <label>
              Pressure word
              <input name="pressure" placeholder="medium" />
            </label>
            <label>
              Knob
              <input name="knob" placeholder="6" />
            </label>
          </div>
          <label>
            Note
            <input name="notes" />
          </label>
          <button className="secondary" type="submit">Save override</button>
          {catalog.overrides.filter((item) => item.recipeId === recipe.id).length > 0 ? (
            <ul className="list">
              {catalog.overrides.filter((item) => item.recipeId === recipe.id).map((item) => {
                const machine = catalog.machines.find((entry) => entry.id === item.machineId);
                return (
                  <li key={item.id}>
                    <span>{machine?.name}: {item.tempC ?? "same heat"}°C, {item.timeSeconds ?? "same time"}s {item.knob ? `· knob ${item.knob}` : ""}</span>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </form>
      ) : null}

      {recipe ? (
        <form action={hideRecipe}>
          <input type="hidden" name="id" value={recipe.id} />
          <button className="secondary" type="submit">Hide this setting</button>
        </form>
      ) : null}
    </div>
  );
}
