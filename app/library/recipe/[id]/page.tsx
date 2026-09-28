import { RecipeForm } from "@/components/RecipeForm";
import { isAdmin } from "@/lib/auth";
import { getDb, loadCatalog } from "@/lib/db";
import { byId, readId } from "@/lib/format";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function RecipePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!(await isAdmin())) redirect("/library");
  const { id } = await params;
  const query = await searchParams;
  const catalog = loadCatalog(getDb());
  const recipe = id === "new" ? null : byId(catalog.recipes, Number(id));
  if (id !== "new" && !recipe) notFound();
  const blankName = recipe ? byId(catalog.blanks, recipe.blankId)?.name : "New setting";
  return (
    <main>
      <p className="crumbs"><a href="/library">Library</a> <span>{recipe?.name ?? "New setting"}</span></p>
      <h1>{recipe ? recipe.name : "New setting"}</h1>
      <p className="lede">{blankName}. Temperatures are in Celsius. Leave the Fahrenheit box blank and the card will convert it.</p>
      <RecipeForm
        catalog={catalog}
        recipe={recipe ?? null}
        defaults={{
          blankId: readId(query.blank),
          materialId: readId(query.material),
          methodId: readId(query.method),
        }}
      />
    </main>
  );
}
