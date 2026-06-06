"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

interface FAQAccordionProps {
  items: FAQItem[];
  className?: string;
}

export default function FAQAccordion({ items, className }: FAQAccordionProps) {
  const [openId, setOpenId] = useState<string | null>(null);

  const toggle = (id: string) => {
    setOpenId(openId === id ? null : id);
  };

  return (
    <div className={cn("space-y-3.5", className)}>
      {items.map((item) => {
        const isOpen = openId === item.id;
        return (
          <div
            key={item.id}
            className={cn(
              "border rounded-2xl bg-white transition-all duration-300 overflow-hidden",
              isOpen
                ? "border-zinc-300 shadow-[0_8px_30px_rgba(0,0,0,0.02)]"
                : "border-zinc-200/80 hover:border-zinc-300 hover:shadow-[0_4px_20px_rgba(0,0,0,0.01)]"
            )}
          >
            <button
              onClick={() => toggle(item.id)}
              className="w-full flex items-center justify-between text-left p-5 sm:p-6 focus:outline-none"
              aria-expanded={isOpen}
            >
              <span className="text-sm sm:text-base font-bold text-zinc-900 tracking-tight select-none">
                {item.question}
              </span>
              <span className={cn(
                "w-8 h-8 rounded-xl bg-zinc-50 border border-zinc-250 flex items-center justify-center text-zinc-500 transition-all duration-300 flex-shrink-0 ml-4",
                isOpen && "bg-zinc-950 border-zinc-950 text-white rotate-180"
              )}>
                <ChevronDown className="w-4 h-4" />
              </span>
            </button>

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                >
                  <div className="px-5 pb-5 sm:px-6 sm:pb-6 pt-0 border-t border-zinc-100/80">
                    <p className="text-xs sm:text-sm text-zinc-500 font-medium leading-relaxed pt-4 whitespace-pre-line">
                      {item.answer}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
