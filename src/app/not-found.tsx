import NotFoundClient from "./not-found-client";
import Header from "@/components/storefront/Header";
import Footer from "@/components/storefront/Footer";
import { createClient } from "@/utils/supabase/server";

export default async function NotFound() {
  const supabase = await createClient();
  const [{ data: categories }, { data: authData }] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name, slug, parent_id")
      .eq("status", true)
      .order("name", { ascending: true }),
    (supabase.auth as any).getUser(),
  ]);

  const user = authData?.user || null;

  return (
    <div className="flex h-full flex-col bg-white">
      <Header categories={categories || []} user={user} />

      <main className="flex-1 flex flex-col">
        <NotFoundClient />
      </main>

      <Footer />
    </div>
  );
}
