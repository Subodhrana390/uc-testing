import type { Metadata } from "next";
import type { ReactNode } from "react";
import { noindexMetadata } from "@/lib/seo";

export const metadata: Metadata = { ...noindexMetadata, title: "Track Order" };

export default function TrackOrderLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
