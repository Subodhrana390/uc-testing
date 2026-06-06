import Header from "@/components/storefront/Header";
import Footer from "@/components/storefront/Footer";
import BackToTop from "@/components/storefront/BackToTop";
import { createClient } from "@/utils/supabase/server";

export default async function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const [{ data: categories }, { data: authData }] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name, slug, parent_id")
      .eq("status", "Active")
      .order("name", { ascending: true }),
    (supabase.auth as any).getUser(),
  ]);

  const user = authData.user;

  return (
    <div className="flex h-full flex-col bg-white">
      <Header categories={categories || []} user={user} />

      <main className="flex-1">{children}</main>

      <Footer />
      <BackToTop />
    </div>
  );
}
