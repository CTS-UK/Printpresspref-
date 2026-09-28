import { BlankForm } from "@/components/BlankForm";
import { isAdmin } from "@/lib/auth";
import { getDb, loadCatalog } from "@/lib/db";
import { byId } from "@/lib/format";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function BlankPage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) redirect("/library");
  const { id } = await params;
  const catalog = loadCatalog(getDb());
  const blank = id === "new" ? null : (byId(catalog.blanks, Number(id)) ?? null);
  if (id !== "new" && !blank) notFound();
  const sizes = blank ? catalog.sizes.filter((size) => size.blankId === blank.id) : [];
  const sites = blank ? catalog.sites.filter((site) => site.blankId === blank.id) : [];
  return (
    <main>
      <p className="crumbs"><a href="/library">Library</a> <span>{blank?.name ?? "New blank"}</span></p>
      <h1>{blank ? blank.name : "New blank"}</h1>
      <p className="lede">Sizes in millimetres or millilitres. Letter sizes such as M can stay without a measurement.</p>
      <BlankForm catalog={catalog} blank={blank} sizes={sizes} sites={sites} />
    </main>
  );
}
