import { adjustStock, countStock, deleteStockRow, saveStockDetails } from "@/app/actions";
import { AddStockForm } from "@/components/AddStockForm";
import { Flash } from "@/components/Flash";
import { countPressesSince, getDb, loadCatalog, recentPressLog, recentStockLog } from "@/lib/db";
import { byId, readText } from "@/lib/format";
import { formatWhen } from "@/lib/format";
import { pressureLabel, stockReasonLabel } from "@/lib/labels";
import { londonMidnightUtc, sqliteUtc } from "@/lib/units";

export const dynamic = "force-dynamic";

export default function StockPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <StockScreen searchParams={searchParams} />;
}

async function StockScreen({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const db = getDb();
  const catalog = loadCatalog(db);
  const movements = recentStockLog(db);
  const presses = recentPressLog(db);
  const pressedToday = countPressesSince(db, sqliteUtc(londonMidnightUtc()));
  const lowOnly = readText(params.low) === "1";
  const rows = catalog.stock
    .map((item) => ({
      item,
      blank: byId(catalog.blanks, item.blankId),
      material: byId(catalog.materials, item.materialId),
      size: byId(catalog.sizes, item.sizeId),
    }))
    .filter((row) => row.blank && row.material && row.size)
    .filter((row) => !lowOnly || row.item.quantity <= row.item.lowStockAt)
    .sort((a, b) => `${a.blank?.category}${a.blank?.name}`.localeCompare(`${b.blank?.category}${b.blank?.name}`));

  return (
    <main>
      <Flash saved={readText(params.saved)} error={readText(params.error)} />
      <h1>Stock and log</h1>
      <p className="lede">What is on the shelf, what moved, and what you pressed. Pressed today: {pressedToday}.</p>
      <p>{lowOnly ? <a href="/stock">Show everything</a> : <a href="/stock?low=1">Show low stock only</a>}</p>

      <section className="section">
        <h2>On the shelf</h2>
        {rows.length === 0 ? <p className="muted">Nothing {lowOnly ? "is low" : "is listed yet"}. Add a blank you actually have.</p> : null}
        <div className="grid">
          {rows.map(({ item, blank, material, size }) => {
            const low = item.quantity <= item.lowStockAt;
            return (
              <article className="card" key={item.id}>
                <p className="muted">{blank?.category}</p>
                <h3>{blank?.name} · {size?.label}</h3>
                <p>{material?.name}</p>
                <p className={low ? "qty low" : "qty"}>{item.quantity}</p>
                {low ? <p className="banner">Low — warn at {item.lowStockAt}</p> : null}
                {item.location ? <p>{item.location}</p> : null}
                {item.note ? <p className="muted">{item.note}</p> : null}
                <form action={adjustStock.bind(null, "received")} className="inline" style={{ marginTop: "0.8rem" }}>
                  <input type="hidden" name="id" value={item.id} />
                  <label>
                    Quantity
                    <input name="qty" type="number" min={1} step={1} defaultValue={1} />
                  </label>
                  <button className="primary" type="submit" formAction={adjustStock.bind(null, "received")}>Received</button>
                  <button className="secondary" type="submit" formAction={adjustStock.bind(null, "used")}>Used</button>
                  <button className="secondary" type="submit" formAction={adjustStock.bind(null, "damaged")}>Damaged</button>
                </form>
                <form action={countStock} className="inline">
                  <input type="hidden" name="id" value={item.id} />
                  <label>
                    Set the count to
                    <input name="quantity" type="number" min={0} step={1} defaultValue={item.quantity} />
                  </label>
                  <button className="secondary" type="submit">Save count</button>
                </form>
                <form action={saveStockDetails} className="fields" style={{ marginTop: "0.6rem" }}>
                  <input type="hidden" name="id" value={item.id} />
                  <div className="fields two">
                    <label>
                      Warn at or below
                      <input name="low_stock_at" type="number" min={0} step={1} defaultValue={item.lowStockAt} />
                    </label>
                    <label>
                      Where it lives
                      <input name="location" defaultValue={item.location} />
                    </label>
                  </div>
                  <label>
                    Note
                    <input name="note" defaultValue={item.note} />
                  </label>
                  <button className="secondary" type="submit">Save details</button>
                </form>
                {item.quantity === 0 ? (
                  <form action={deleteStockRow}>
                    <input type="hidden" name="id" value={item.id} />
                    <button className="secondary" type="submit">Remove from the list</button>
                  </form>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>

      <section className="section card">
        <h2>Add something you have</h2>
        <AddStockForm blanks={catalog.blanks} materials={catalog.materials} sizes={catalog.sizes} />
      </section>

      <section className="section">
        <h2>Stock log</h2>
        {movements.length === 0 ? <p className="muted">Receiving, using, and pressing will show up here.</p> : null}
        <ul className="list">
          {movements.map((entry) => (
            <li key={entry.id}>
              <span>
                <strong>{entry.delta > 0 ? `+${entry.delta}` : entry.delta}</strong> {entry.itemLabel}
                <span className="muted"> · {stockReasonLabel(entry.reason)} · {entry.quantityAfter} left{entry.note ? ` · ${entry.note}` : ""}</span>
              </span>
              <span className="muted">{formatWhen(entry.createdAt)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="section">
        <h2>Press log</h2>
        {presses.length === 0 ? <p className="muted">Logging a press from the card writes it here.</p> : null}
        <ul className="list">
          {presses.map((entry) => (
            <li key={entry.id}>
              <span>
                <strong>{entry.quantity}× {entry.itemLabel}</strong>
                <span className="muted">
                  {" "}· {entry.tempC}°C{entry.setpointC !== entry.tempC ? ` (controller ${entry.setpointC}°C)` : ""} · {entry.seconds}s · {pressureLabel(entry.pressure)}
                  {entry.printSite ? ` · ${entry.printSite}` : ""}
                  {entry.deducted ? " · taken from stock" : ""}
                  {entry.note ? ` · ${entry.note}` : ""}
                </span>
              </span>
              <span className="muted">{formatWhen(entry.createdAt)}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
