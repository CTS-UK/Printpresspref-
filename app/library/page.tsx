import { hideEndProduct, storeEndProduct, storeMachine, storeMaterial, unlockAdmin } from "@/app/actions";
import { Flash } from "@/components/Flash";
import { expectedPin, isAdmin } from "@/lib/auth";
import { getDb, loadCatalog } from "@/lib/db";
import { byId, readText } from "@/lib/format";
import { pressKindLabel } from "@/lib/labels";

export const dynamic = "force-dynamic";

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const admin = await isAdmin();
  const catalog = loadCatalog(getDb());

  if (!admin) {
    return (
      <main>
        <Flash saved={readText(params.saved)} error={readText(params.error)} />
        <h1>Library</h1>
        <p className="lede">
          The press card and the stock list stay open. The PIN only guards adding and editing blanks, materials, and settings.
          {expectedPin() === "2468" ? " Until you set PRESS_PIN, the PIN is 2468." : " Use the PIN from PRESS_PIN."}
        </p>
        <form action={unlockAdmin} className="card fields" style={{ maxWidth: "24rem" }}>
          <label>
            PIN
            <input name="pin" type="password" inputMode="numeric" autoComplete="current-password" required />
          </label>
          <button className="primary" type="submit">Unlock</button>
        </form>
      </main>
    );
  }

  return (
    <main>
      <Flash saved={readText(params.saved)} error={readText(params.error)} />
      <h1>Library</h1>
      <p className="lede">Organise materials, the blanks you press, the settings, and the end products you sell. Heat is stored in Celsius.</p>
      <p className="nav">
        <a className="button" href="/library/blank/new">Add a blank</a>
        <a className="button primary" href="/library/recipe/new">Add a setting</a>
      </p>

      <section className="section" id="products">
        <h2>What you sell</h2>
        <ul className="list">
          {catalog.endProducts.filter((item) => item.active).map((item) => {
            const blank = byId(catalog.blanks, item.blankId);
            const material = byId(catalog.materials, item.materialId);
            const method = byId(catalog.methods, item.methodId);
            return (
              <li key={item.id}>
                <span>
                  <strong>{item.name}</strong>
                  <span className="muted"> · {blank?.name} · {material?.name} · {method?.name}</span>
                </span>
                <form action={hideEndProduct}>
                  <input type="hidden" name="id" value={item.id} />
                  <button className="secondary" type="submit">Hide</button>
                </form>
              </li>
            );
          })}
        </ul>
        <form action={storeEndProduct} className="card fields">
          <h3>Add an end product</h3>
          <label>
            Name
            <input name="name" required placeholder="Personalised round coaster" />
          </label>
          <div className="fields two">
            <label>
              Blank
              <select name="blank_id">{catalog.blanks.filter((blank) => blank.active).map((blank) => <option value={blank.id} key={blank.id}>{blank.name}</option>)}</select>
            </label>
            <label>
              Material
              <select name="material_id">{catalog.materials.map((material) => <option value={material.id} key={material.id}>{material.name}</option>)}</select>
            </label>
            <label>
              Method
              <select name="method_id">{catalog.methods.map((method) => <option value={method.id} key={method.id}>{method.name}</option>)}</select>
            </label>
            <label>
              Preferred setting
              <select name="recipe_id">
                <option value="">None yet</option>
                {catalog.recipes.filter((recipe) => recipe.active).map((recipe) => <option value={recipe.id} key={recipe.id}>{recipe.name}</option>)}
              </select>
            </label>
            <label>
              Default size
              <select name="size_id">
                <option value="">Any size</option>
                {catalog.sizes.map((size) => {
                  const blank = byId(catalog.blanks, size.blankId);
                  return <option value={size.id} key={size.id}>{blank?.name} · {size.label}</option>;
                })}
              </select>
            </label>
          </div>
          <label>
            Notes
            <input name="notes" />
          </label>
          <button className="primary" type="submit">Save end product</button>
        </form>
      </section>

      <section className="section" id="blanks">
        <h2>Blanks</h2>
        <ul className="list">
          {catalog.blanks.filter((blank) => blank.active).map((blank) => (
            <li key={blank.id}>
              <span><strong>{blank.name}</strong> <span className="muted">{blank.category} · {pressKindLabel(blank.requiredPress)}</span></span>
              <a href={`/library/blank/${blank.id}`}>Edit</a>
            </li>
          ))}
        </ul>
      </section>

      <section className="section" id="settings">
        <h2>Settings</h2>
        <ul className="list">
          {catalog.recipes.filter((recipe) => recipe.active).map((recipe) => {
            const blank = byId(catalog.blanks, recipe.blankId);
            return (
              <li key={recipe.id}>
                <span>
                  <strong>{recipe.tempC}°C</strong> · {recipe.name}
                  <span className="muted"> · {blank?.name} · {recipe.status === "tested" ? "tested" : "starter"}</span>
                </span>
                <a href={`/library/recipe/${recipe.id}`}>Edit</a>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="section" id="materials">
        <h2>Materials</h2>
        {catalog.materials.map((material) => (
          <form action={storeMaterial} className="card fields" key={material.id} style={{ marginBottom: "0.7rem" }}>
            <input type="hidden" name="id" value={material.id} />
            <div className="fields two">
              <label>
                Name
                <input name="name" defaultValue={material.name} />
              </label>
              <label>
                Group
                <input name="group_name" defaultValue={material.groupName} />
              </label>
              <label>
                Polyester %
                <input name="polyester_percent" type="number" defaultValue={material.polyesterPercent ?? ""} />
              </label>
              <label>
                Sublimation
                <select name="sublimation" defaultValue={material.sublimation}>
                  <option value="yes">Works</option>
                  <option value="poor">Pale</option>
                  <option value="no">Does not work</option>
                </select>
              </label>
            </div>
            <label>
              Heat note
              <input name="heat_note" defaultValue={material.heatNote} />
            </label>
            <button className="secondary" type="submit">Save material</button>
          </form>
        ))}
        <form action={storeMaterial} className="card fields">
          <h3>Add a material</h3>
          <div className="fields two">
            <label>Name<input name="name" required /></label>
            <label>Group<input name="group_name" placeholder="Natural" /></label>
            <label>Polyester %<input name="polyester_percent" type="number" /></label>
            <label>
              Sublimation
              <select name="sublimation" defaultValue="no">
                <option value="yes">Works</option>
                <option value="poor">Pale</option>
                <option value="no">Does not work</option>
              </select>
            </label>
          </div>
          <label>Heat note<input name="heat_note" /></label>
          <button className="primary" type="submit">Add material</button>
        </form>
      </section>

      <section className="section" id="presses">
        <h2>Presses</h2>
        <p className="muted">Add these when you have the brand and model. If the controller reads hotter than the platen, put how many degrees too high in the offset. Use a negative number if it reads low. Sizes in centimetres.</p>
        {catalog.machines.map((machine) => (
          <form action={storeMachine} className="card fields" key={machine.id} style={{ marginBottom: "0.7rem" }}>
            <input type="hidden" name="id" value={machine.id} />
            <div className="fields two">
              <label>Name<input name="name" defaultValue={machine.name} /></label>
              <label>
                Type
                <select name="kind" defaultValue={machine.kind}>
                  <option value="flat">Flat press</option>
                  <option value="cup">Cup press</option>
                </select>
              </label>
              <label>Platen or element<input name="platen_note" defaultValue={machine.platenNote} placeholder="38 × 38 cm" /></label>
              <label>Controller reads this many °C too high<input name="offset_c" type="number" step="0.5" defaultValue={machine.offsetC} /></label>
              <label>
                Pressure control
                <select name="pressure_style" defaultValue={machine.pressureStyle}>
                  <option value="words">Light, medium, firm</option>
                  <option value="knob">Numbered knob</option>
                  <option value="psi">PSI gauge</option>
                </select>
              </label>
            </div>
            <label>Notes<input name="notes" defaultValue={machine.notes} /></label>
            <button className="secondary" type="submit">Save press</button>
          </form>
        ))}
        <form action={storeMachine} className="card fields">
          <h3>Add a press</h3>
          <div className="fields two">
            <label>Name<input name="name" required placeholder="Cup press" /></label>
            <label>
              Type
              <select name="kind" defaultValue="flat">
                <option value="flat">Flat press</option>
                <option value="cup">Cup press</option>
              </select>
            </label>
            <label>Platen or element<input name="platen_note" placeholder="38 × 38 cm" /></label>
            <label>Controller reads this many °C too high<input name="offset_c" type="number" step="0.5" defaultValue={0} /></label>
          </div>
          <input type="hidden" name="pressure_style" value="words" />
          <label>Notes<input name="notes" /></label>
          <button className="primary" type="submit">Add press</button>
        </form>
      </section>
    </main>
  );
}
