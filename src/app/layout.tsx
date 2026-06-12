import "./globals.css";
import type { Metadata } from "next";
import { Roboto, Roboto_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast";
import TrackingInitializer from "@/components/TrackingInitializer";
import AnalyticsScripts from "@/components/AnalyticsScripts";
import JsonLd from "@/components/seo/JsonLd";
import { organizationSchema, websiteSchema, localBusinessSchema } from "@/lib/jsonld";
import { baseMetadata } from "@/lib/seo";
import { getSiteSettings } from "@/app/actions/settings";

const roboto = Roboto({
  weight: ["300", "400", "500", "700", "900"],
  subsets: ["latin"],
  variable: "--font-roboto",
  display: "swap",
});

const robotoMono = Roboto_Mono({
  subsets: ["latin"],
  variable: "--font-roboto-mono",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  if (!settings) {
    return baseMetadata();
  }

  const keywords = settings.seo_keywords_default || [];

  return baseMetadata({
    applicationName: settings.site_name,
    appleWebApp: {
      title: settings.site_name,
      statusBarStyle: "default",
    },
    title: {
      default: settings.seo_title_default || settings.site_name,
      template: `%s | ${settings.site_name}`,
    },
    description: settings.seo_description_default || undefined,
    keywords: keywords.length > 0 ? keywords : undefined,
    icons: {
      icon: settings.favicon_url || "/favicon.ico",
      apple: settings.logo_url || "/logo.png",
    },
    openGraph: {
      type: "website",
      locale: "en_IN",
      url: "https://uc-enterprises.vercel.app",
      siteName: settings.site_name,
      title: settings.seo_title_default || settings.site_name,
      description: settings.seo_description_default || undefined,
      images: settings.logo_url ? [{ url: settings.logo_url, width: 800, height: 800, alt: settings.site_name }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: settings.seo_title_default || settings.site_name,
      description: settings.seo_description_default || undefined,
      images: settings.logo_url ? [settings.logo_url] : undefined,
    }
  });
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en-IN"
      className={`${roboto.variable} ${robotoMono.variable} h-full antialiased`}
    >
      <body className="h-full flex flex-col">
        {/* Global structured data — injected on every page */}
        <JsonLd data={[organizationSchema(), websiteSchema(), localBusinessSchema()]} />
        <AnalyticsScripts />
        <TrackingInitializer />
        {children}
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
