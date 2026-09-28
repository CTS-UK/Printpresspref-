"use client";

import { useState } from "react";
import { createStock } from "@/app/actions";
import type { Blank, Material, Size } from "@/lib/types";

export function AddStockForm({
  blanks,
  materials,
  sizes,
}: {
  blanks: Blank[];
  materials: Material[];
  sizes: Size[];
}) {
  const active = blanks.filter((blank) => blank.active);
  const [blankId, setBlankId] = useState(active[0]?.id ?? 0);
  const blank = active.find((item) => item.id === blankId) ?? active[0];
  const blankSizes = sizes.filter((size) => size.blankId === blank?.id);
  const blankMaterials = materials.filter((material) => blank?.materialIds.includes(material.id));
  const [sizeId, setSizeId] = useState(blankSizes[0]?.id ?? 0);
  const [materialId, setMaterialId] = useState(blankMaterials[0]?.id ?? 0);

  function chooseBlank(nextId: number) {
    const next = active.find((item) => item.id === nextId);
    setBlankId(nextId);
    setSizeId(sizes.find((size) => size.blankId === nextId)?.id ?? 0);
    setMaterialId(materials.find((material) => next?.materialIds.includes(material.id))?.id ?? 0);
  }

  if (!blank) return <p>Add a blank in the library before tracking stock.</p>;

  return (
    <form action={createStock} className="fields">
      <div className="fields two">
        <label>
          Blank
          <select name="blank_id" value={blank.id} onChange={(event) => chooseBlank(Number(event.target.value))}>
            {active.map((item) => (
              <option value={item.id} key={item.id}>{item.category} · {item.name}</option>
            ))}
          </select>
        </label>
        <label>
          Size
          <select name="size_id" value={sizeId} onChange={(event) => setSizeId(Number(event.target.value))}>
            {blankSizes.map((size) => (
              <option value={size.id} key={size.id}>{size.label}</option>
            ))}
          </select>
        </label>
        <label>
          Material
          <select name="material_id" value={materialId} onChange={(event) => setMaterialId(Number(event.target.value))}>
            {blankMaterials.map((material) => (
              <option value={material.id} key={material.id}>{material.name}</option>
            ))}
          </select>
        </label>
        <label>
          Quantity to add
          <input name="quantity" type="number" min={0} step={1} defaultValue={1} required />
        </label>
        <label>
          Warn when at or below
          <input name="low_stock_at" type="number" min={0} step={1} defaultValue={2} required />
        </label>
        <label>
          Where it lives
          <input name="location" placeholder="Shelf, box, brand" />
        </label>
      </div>
      <label>
        Note
        <input name="note" placeholder="White, Gildan, coated batch…" />
      </label>
      <button className="primary" type="submit">Add to the shelf</button>
    </form>
  );
}
