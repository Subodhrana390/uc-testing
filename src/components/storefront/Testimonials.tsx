"use client";

import { Star, Quote } from "lucide-react";
import { motion } from "framer-motion";

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
    <div data-nosnippet className="py-8">
      <div className="mb-10 flex items-end justify-between border-b border-zinc-100 pb-5">
        <div className="relative pl-4 border-l-4 border-primary">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Testimonials</p>
          <h2 className="mt-1 text-2xl md:text-3xl font-extrabold text-zinc-950 tracking-tight">Loved by Our Customers</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {testimonials.map((item, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1, duration: 0.5 }}
            className="bg-white p-8 rounded-3xl border border-zinc-200/80 shadow-sm relative group hover:shadow-md transition-shadow duration-300"
          >
            <Quote className="absolute top-6 right-6 w-8 h-8 text-zinc-100 group-hover:text-orange-50 transition-colors duration-300" />
            
            <div className="flex gap-1 mb-6">
              {Array.from({ length: item.rating }).map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
              ))}
            </div>
            
            <p className="text-sm font-medium text-zinc-600 leading-relaxed mb-8 min-h-[80px]">
              "{item.content}"
            </p>
            
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center font-bold text-zinc-600 text-sm">
                {item.author.charAt(0)}
              </div>
              <div>
                <h4 className="text-sm font-bold text-zinc-900">{item.author}</h4>
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mt-0.5">{item.role}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
