"use client";

import { usePathname } from "next/navigation";
import { lockAdmin } from "@/app/actions";

export function Nav({ lowStock, admin }: { lowStock: number; admin: boolean }) {
  const pathname = usePathname();
  const current = pathname.startsWith("/stock") ? "stock" : pathname.startsWith("/library") ? "library" : "press";
  return (
    <header className="top">
      <a className="brand" href="/">
        <strong>Press bench</strong>
        <span>Shirts, coasters, mats, and mugs</span>
      </a>
      <nav className="nav">
        <a href="/" aria-current={current === "press" ? "page" : undefined}>Press</a>
        <a href="/stock" aria-current={current === "stock" ? "page" : undefined}>
          Stock
          {lowStock > 0 ? <span className="badge">{lowStock}</span> : null}
        </a>
        <a href="/library" aria-current={current === "library" ? "page" : undefined}>Library</a>
        {admin ? (
          <form action={lockAdmin}>
            <button className="secondary" type="submit">Lock</button>
          </form>
        ) : null}
      </nav>
    </header>
  );
}
