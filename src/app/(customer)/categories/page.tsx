import Link from "next/link";
import Image from "next/image";
import { FolderTree, ArrowRight, Layers, LayoutGrid, ChevronRight, X } from "lucide-react";
import { createClient } from "@/utils/supabase/server";

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: { main?: string; sub?: string };
}) {
  const supabase = await createClient();
  const { main: mainFilter, sub: subFilter } = searchParams;

  // Fetch all categories
  const { data: allCategories } = await supabase
    .from("categories")
    .select("id, name, slug, status, image_url, description, parent_id")
    .eq("status", "Active")
    .order("name", { ascending: true });

  const safeCategories = allCategories || [];

  // Logical grouping
  const mainCategories = safeCategories.filter(c => !c.parent_id);
  const subCategories = safeCategories.filter(c => c.parent_id);

  let categoriesWithSubs = mainCategories.map(main => ({
    ...main,
    subs: subCategories.filter(sub => sub.parent_id === main.id)
  }));

  // Apply URL tracking / filtering
  if (mainFilter) {
    categoriesWithSubs = categoriesWithSubs.filter(c => c.slug === mainFilter);
  }

  if (subFilter) {
    categoriesWithSubs = categoriesWithSubs.map(c => ({
      ...c,
      subs: c.subs.filter(s => s.slug === subFilter)
    })).filter(c => c.subs.length > 0);
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fff8ef_0%,#ffffff_30%,#fffdf7_100%)]">
      <section className="container mx-auto px-4 py-16">
        <div className="mb-14 flex flex-col md:flex-row md:items-end justify-between gap-6">
          {/* Left Side: Title and Subtitle */}
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-primary">
              Shop by Department
            </p>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-zinc-900">
              Our Product <span className="text-primary">Segments</span>
            </h1>
          </div>

        </div>

        {/* Categories Grid */}
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {categoriesWithSubs.map((main) => (
            <div
              key={main.id}
              className="group relative flex flex-col bg-white border border-orange-100 p-8 transition-all hover:border-primary hover:shadow-2xl hover:shadow-primary/5"
            >
              {/* Large Background Ghost Icon */}
              <div className="absolute -bottom-6 -right-6 w-48 h-48 opacity-[0.04] pointer-events-none group-hover:opacity-[0.08] transition-opacity group-hover:rotate-12 duration-500">
                <FolderTree className="w-full h-full" />
              </div>

              <div className="relative z-10 flex flex-col h-full">
                <Link href={`/search?main=${main.slug}`} className="mb-6 flex h-16 w-16 items-center justify-center bg-orange-50 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                  <FolderTree className="h-8 w-8" />
                </Link>

                <div className="space-y-4 flex-1">
                  <Link href={`/search?main=${main.slug}`} className="block group/title">
                    <h2 className="text-2xl font-black text-zinc-950 uppercase tracking-tight group-hover/title:text-primary transition-colors">
                      {main.name}
                    </h2>
                  </Link>

                  {main.subs.length > 0 && (
                    <div className="flex flex-col gap-2 pt-2">
                      <p className="text-[9px] font-black uppercase tracking-widest text-zinc-300 mb-1">Sub Categories</p>
                      {main.subs.map((sub) => (
                        <Link
                          key={sub.id}
                          href={`/search?main=${main.slug}&sub=${sub.slug}`}
                          className={`flex items-center gap-2 text-[11px] font-bold transition-colors ${subFilter === sub.slug ? "text-primary" : "text-zinc-500 hover:text-primary"
                            }`}
                        >
                          <ChevronRight className={`w-3 h-3 ${subFilter === sub.slug ? "text-primary" : "text-primary/40"}`} />
                          {sub.name}
                        </Link>
                      ))}
                    </div>
                  )}

                  {!main.subs.length && (
                    <p className="text-xs leading-relaxed text-zinc-500 font-bold opacity-60 uppercase tracking-wider">
                      {main.description || `Specialized solutions for ${main.name.toLowerCase()}.`}
                    </p>
                  )}
                </div>

                <Link
                  href={`/search?main=${main.slug}`}
                  className="mt-8 pt-6 border-t border-orange-50 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 group-hover:text-primary transition-colors"
                >
                  <span>Explore Department</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-2" />
                </Link>
              </div>

              <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary scale-y-0 group-hover:scale-y-100 transition-transform origin-top duration-300" />
            </div>
          ))}
        </div>

        {!categoriesWithSubs.length && (
          <div className="flex flex-col items-center justify-center gap-4 py-32 border border-dashed border-orange-200 bg-white">
            <Layers className="h-12 w-12 text-zinc-200" />
            <div className="text-center">
              <h3 className="text-lg font-bold text-zinc-950 uppercase tracking-widest">No segments matched</h3>
              <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider mt-2">Try adjusting your filters or clearing the selection.</p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}