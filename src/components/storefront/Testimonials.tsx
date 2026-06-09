"use client";

import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    content: "I've been ordering my laboratory chemicals here for over 3 years. The quality is unmatched and deliveries are always on schedule.",
    author: "Dr. Arvind Mehta",
    role: "Verified Customer",
    rating: 5,
  },
  {
    content: "The wide selection and dedicated support team make them the best choice for industrial safety equipment. Highly recommend their seamless shopping experience.",
    author: "Rajesh Kumar",
    role: "Verified Customer",
    rating: 5,
  },
  {
    content: "Exceptional quality glassware and immediate response times. They truly understand the urgency of scientific research requirements.",
    author: "Sneha Patel",
    role: "Verified Customer",
    rating: 5,
  },
];

export default function Testimonials() {
  return (
    <div data-nosnippet className="py-8 overflow-hidden relative">
      <style>{`
        @keyframes testimonialMarquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .animate-testimonial-marquee {
          display: flex;
          width: max-content;
          gap: 24px;
          animation: testimonialMarquee 25s linear infinite;
        }
        .animate-testimonial-marquee:hover {
          animation-play-state: paused;
        }
      `}</style>
      
      <div className="mb-10 flex items-end justify-between border-b border-zinc-100 pb-5">
        <div className="relative pl-4 border-l-4 border-primary">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Testimonials</p>
          <h2 className="mt-1 text-2xl md:text-3xl font-extrabold text-zinc-950 tracking-tight">Loved by Our Customers</h2>
        </div>
      </div>

      <div className="relative w-full overflow-hidden">
        {/* Left and Right gradient overlays for smooth fade edges */}
        <div className="absolute left-0 top-0 bottom-0 w-12 sm:w-24 bg-gradient-to-r from-white via-white/80 to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-12 sm:w-24 bg-gradient-to-l from-white via-white/80 to-transparent z-10 pointer-events-none" />

        <div className="animate-testimonial-marquee py-2">
          {[...testimonials, ...testimonials, ...testimonials, ...testimonials].map((item, index) => (
            <div
              key={index}
              className="bg-white p-6 sm:p-8 rounded-3xl border border-zinc-200/80 shadow-sm relative group hover:shadow-md transition-shadow duration-300 w-[280px] sm:w-[360px] shrink-0"
            >
              <Quote className="absolute top-6 right-6 w-8 h-8 text-zinc-100 group-hover:text-orange-50 transition-colors duration-300" />
              
              <div className="flex gap-1 mb-4 sm:mb-6">
                {Array.from({ length: item.rating }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              
              <p className="text-xs sm:text-sm font-medium text-zinc-600 leading-relaxed mb-6 sm:mb-8 min-h-[72px]">
                "{item.content}"
              </p>
              
              <div className="flex items-center gap-4">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-zinc-100 flex items-center justify-center font-bold text-zinc-600 text-xs sm:text-sm">
                  {item.author.charAt(0)}
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-zinc-900">{item.author}</h4>
                  <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-zinc-500 mt-0.5">{item.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
