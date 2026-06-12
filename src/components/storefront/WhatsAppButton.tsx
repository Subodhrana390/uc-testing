"use client";

import { SiteSettings } from "@/app/actions/settings";

interface WhatsAppButtonProps {
  settings: SiteSettings | null;
}

export default function WhatsAppButton({ settings }: WhatsAppButtonProps) {
  if (!settings || !settings.whatsapp_enabled || !settings.whatsapp_number) {
    return null;
  }

  const encodedMessage = encodeURIComponent(settings.whatsapp_message || "");
  const whatsappUrl = `https://wa.me/${settings.whatsapp_number}?text=${encodedMessage}`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-20 right-6 z-[89] p-3 rounded-full bg-[#25D366] text-white shadow-lg hover:bg-[#20ba5a] hover:scale-110 active:scale-95 transition-all duration-300 flex items-center justify-center group"
      aria-label="Chat on WhatsApp"
    >
      <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
        <path d="M17.472 14.382c-.3-.149-1.777-.878-2.047-.978-.27-.099-.467-.149-.662.15-.195.3-.755.952-.926 1.15-.17.198-.34.223-.64.075-.3-.15-1.265-.467-2.41-1.487-.893-.797-1.496-1.78-1.672-2.08-.176-.3-.019-.462.13-.61.135-.133.3-.35.45-.524.15-.174.2-.298.3-.497.1-.198.05-.371-.025-.52-.075-.149-.662-1.597-.91-2.194-.243-.584-.488-.505-.662-.514-.17-.008-.364-.01-.559-.01-.195 0-.513.073-.78.365-.268.291-1.023 1.002-1.023 2.443 0 1.44 1.05 2.836 1.196 3.035.146.198 2.067 3.159 5.006 4.43 2.442 1.059 3.008 1.001 3.556.907.697-.12 2.048-.836 2.336-1.645.287-.81.287-1.503.202-1.649-.088-.146-.3-.235-.6-.385zM12.008.01C5.397.01.06 5.348.06 11.953c.002 2.097.549 4.14 1.587 5.946L.057 24l6.157-1.613c1.751.955 3.719 1.456 5.724 1.457 6.613 0 11.95-5.337 11.953-11.996.002-3.204-1.24-6.216-3.506-8.484C18.22 1.256 15.21.01 12.008.01z" />
      </svg>
      <span className="absolute right-14 bg-zinc-900 text-white text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap border border-zinc-800 shadow-xl">
        WhatsApp Support
      </span>
    </a>
  );
}
