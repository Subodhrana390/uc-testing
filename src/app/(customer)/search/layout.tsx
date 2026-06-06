import type { Metadata } from "next";
import type { ReactNode } from "react";
import { noindexMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  ...noindexMetadata,
  title: "Search Products",
};

export default function SearchLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
