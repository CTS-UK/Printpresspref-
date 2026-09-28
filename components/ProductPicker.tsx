"use client";

import { useMemo, useState } from "react";

export type PickItem = {
  href: string;
  title: string;
  detail: string;
  meta?: string;
};

export function ProductPicker({
  groups,
}: {
  groups: { title: string; hint?: string; items: PickItem[] }[];
}) {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      groups
        .map((group) => ({
          ...group,
          items: group.items.filter((item) => `${item.title} ${item.detail} ${item.meta ?? ""}`.toLowerCase().includes(needle)),
        }))
        .filter((group) => group.items.length > 0),
    [groups, needle],
  );

  return (
    <div>
      <input
        className="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search shirts, coasters, mugs…"
        aria-label="Search products"
      />
      {filtered.length === 0 ? <p className="muted">Nothing matches that.</p> : null}
      {filtered.map((group) => (
        <section className="section" key={group.title}>
          <h2>{group.title}</h2>
          {group.hint ? <p className="lede">{group.hint}</p> : null}
          <div className="choices two">
            {group.items.map((item) => (
              <a className="choice" href={item.href} key={item.href + item.title}>
                <strong>{item.title}</strong>
                <small>{item.detail}</small>
                {item.meta ? <small style={{ display: "block", marginTop: "0.35rem" }}>{item.meta}</small> : null}
              </a>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
