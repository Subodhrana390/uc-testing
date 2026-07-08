import Header from "@/components/storefront/Header";
import BackToTop from "@/components/storefront/BackToTop";
import CookieConsent from "@/components/storefront/CookieConsent";
import WhatsAppButton from "@/components/storefront/WhatsAppButton";
import { createClient } from "@/utils/supabase/server";
import { getSiteSettings, getNavigationLinks } from "@/app/actions/settings";
import dynamic from "next/dynamic";

const Footer = dynamic(() => import("@/components/storefront/Footer"));

export default async function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const [
    { data: categories },
    { data: authData },
    settings,
    navLinks
  ] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name, slug, parent_id")
      .eq("status", true)
      .order("name", { ascending: true }),
    (supabase.auth as any).getUser(),
    getSiteSettings(),
    getNavigationLinks()
  ]);

  const user = authData.user;
  const activeNavLinks = (navLinks || []).filter(link => link.is_active);

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Header 
        categories={categories || []} 
        user={user} 
        settings={settings} 
        navLinks={activeNavLinks} 
      />

      <main className="flex-1">{children}</main>

      <Footer settings={settings} />
      <BackToTop />
      <WhatsAppButton settings={settings} />
      <CookieConsent />
    </div>
  );
}
