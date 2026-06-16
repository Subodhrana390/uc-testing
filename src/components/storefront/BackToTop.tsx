"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

export default function BackToTop() {
  const [isVisible, setIsVisible] = useState(false);
  const pathname = usePathname();
  const isCheckout = pathname?.startsWith("/checkout");

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.scrollY > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener("scroll", toggleVisibility);
    return () => window.removeEventListener("scroll", toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <button
      onClick={scrollToTop}
      className={cn(
        "fixed right-6 z-[90] p-3 rounded-full bg-primary text-white shadow-lg hover:bg-primary/90 hover:scale-110 active:scale-95 transition-all duration-300",
        isCheckout ? "bottom-20 lg:bottom-6" : "bottom-6",
        isVisible ? "translate-y-0 opacity-100 visible" : "translate-y-10 opacity-0 invisible"
      )}
      aria-label="Back to top"
    >
      <ArrowUp className="w-5 h-5" />
    </button>
  );
}
