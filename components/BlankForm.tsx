import { hideBlank, storeBlank } from "@/app/actions";
import type { Blank, Catalog, PrintSite, Size } from "@/lib/types";

export function BlankForm({
  catalog,
  blank,
  sizes,
  sites,
}: {
  catalog: Catalog;
  blank: Blank | null;
  sizes: Size[];
  sites: PrintSite[];
}) {
  const slots = Array.from({ length: 8 }, (_, index) => sizes[index] ?? null);
  return (
    <form action={storeBlank} className="fields">
      {blank ? <input type="hidden" name="id" value={blank.id} /> : null}
      <div className="fields two">
        <label>
          Name
          <input name="name" required defaultValue={blank?.name ?? ""} placeholder="Square coaster" />
        </label>
        <label>
          Group
          <input name="category" required defaultValue={blank?.category ?? "Shirts"} list="blank-groups" />
          <datalist id="blank-groups">
            <option value="Shirts" />
            <option value="Drinkware" />
            <option value="Coasters" />
            <option value="Mouse mats" />
          </datalist>
        </label>
        <label>
          Shape
          <select name="shape" defaultValue={blank?.shape ?? "none"}>
            <option value="none">No special shape</option>
            <option value="square">Square</option>
            <option value="round">Round</option>
          </select>
        </label>
        <label>
          Press
          <select name="required_press" defaultValue={blank?.requiredPress ?? "flat"}>
            <option value="flat">Flat press</option>
            <option value="cup">Cup press</option>
            <option value="any">Either</option>
          </select>
        </label>
      </div>
      <label>
        Notes
        <textarea name="notes" defaultValue={blank?.notes ?? ""} />
      </label>
      <fieldset>
        <legend>Sizes</legend>
        <p className="muted">Letter sizes can leave the measurements blank. Coasters and mats use millimetres. Mugs and tumblers use millilitres. The label is what you see, for example 9 cm or 330 ml (11 oz).</p>
        {slots.map((size, index) => (
          <div className="fields two" key={size?.id ?? `new-${index}`}>
            {size ? <input type="hidden" name={`size_id_${index}`} value={size.id} /> : null}
            <label>
              Label
              <input name={`size_label_${index}`} defaultValue={size?.label ?? ""} placeholder={index === 0 && !size ? "M or 10 cm" : ""} />
            </label>
            <label>
              Width mm
              <input name={`size_width_${index}`} type="number" defaultValue={size?.widthMm ?? ""} />
            </label>
            <label>
              Height mm
              <input name={`size_height_${index}`} type="number" defaultValue={size?.heightMm ?? ""} />
            </label>
            <label>
              Diameter mm
              <input name={`size_diameter_${index}`} type="number" defaultValue={size?.diameterMm ?? ""} />
            </label>
            <label>
              Volume ml
              <input name={`size_volume_${index}`} type="number" defaultValue={size?.volumeMl ?? ""} />
            </label>
          </div>
        ))}
      </fieldset>
      <fieldset>
        <legend>Materials</legend>
        <div className="checks cols">
          {catalog.materials.map((material) => (
            <label className="check" key={material.id}>
              <input type="checkbox" name="material_id" value={material.id} defaultChecked={blank?.materialIds.includes(material.id) ?? false} />
              {material.name}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend>Print methods</legend>
        <div className="checks">
          {catalog.methods.map((method) => (
            <label className="check" key={method.id}>
              <input type="checkbox" name="method_id" value={method.id} defaultChecked={blank?.methodIds.includes(method.id) ?? false} />
              {method.name}
            </label>
          ))}
        </div>
      </fieldset>
      <label>
        Print positions, one per line
        <textarea name="sites" defaultValue={sites.map((site) => site.name).join("\n")} placeholder={"Left chest\nFull front"} />
      </label>
      <button className="primary" type="submit">Save blank</button>
      {blank ? (
        <button className="secondary" type="submit" formAction={hideBlank} formNoValidate>Hide blank</button>
      ) : null}
    </form>
  );
}
