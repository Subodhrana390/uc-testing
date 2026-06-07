import type { Metadata } from "next";
import { staticPageMetadata } from "@/lib/seo";
import FAQClient from "./FAQClient";

export const metadata: Metadata = staticPageMetadata.faq;

export default function FAQPage() {
  return <FAQClient />;
}
