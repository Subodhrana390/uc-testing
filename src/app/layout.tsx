import "./globals.css";
import type { Metadata } from "next";
import { Roboto, Roboto_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast";
import TrackingInitializer from "@/components/TrackingInitializer";

const roboto = Roboto({
  weight: ["300", "400", "500", "700", "900"],
  subsets: ["latin"],
  variable: "--font-roboto",
});

const robotoMono = Roboto_Mono({
  subsets: ["latin"],
  variable: "--font-roboto-mono",
});

export const metadata: Metadata = {
  title: "UC Enterprises",
  description: "UC Enterprises supplies laboratory chemicals, glassware, tools, safety equipment, and industrial electrical goods across India.",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/logo.jpg" },
    ],
    apple: "/logo.jpg",
  },
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${roboto.variable} ${robotoMono.variable} h-full antialiased`}
    >
      <body className="h-full flex flex-col">
        <TrackingInitializer />
        {children}
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
