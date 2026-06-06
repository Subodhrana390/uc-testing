import type { Metadata } from "next";
import type { ReactNode } from "react";
import { noindexMetadata } from "@/lib/seo";

export const metadata: Metadata = { ...noindexMetadata, title: "Checkout" };

export default function CheckoutLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
