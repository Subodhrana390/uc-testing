import "./globals.css";
import type { Metadata } from "next";
import { Roboto, Roboto_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast";
import TrackingInitializer from "@/components/TrackingInitializer";
import JsonLd from "@/components/seo/JsonLd";
import { organizationSchema, websiteSchema, localBusinessSchema } from "@/lib/jsonld";
import { baseMetadata } from "@/lib/seo";

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

export const metadata: Metadata = baseMetadata();

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
        <TrackingInitializer />
        {children}
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
