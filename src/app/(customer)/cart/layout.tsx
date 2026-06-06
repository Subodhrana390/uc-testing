import type { Metadata } from "next";
import type { ReactNode } from "react";
import { noindexMetadata } from "@/lib/seo";

export const metadata: Metadata = { ...noindexMetadata, title: "Cart" };

export default function CartLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
