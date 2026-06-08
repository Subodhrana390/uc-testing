"use client";

import { ShieldCheck, Truck, Clock, Award } from "lucide-react";
import { motion } from "framer-motion";

const features = [
  {
    icon: <ShieldCheck className="w-8 h-8 text-primary" />,
    title: "100% Quality Assured",
    description: "All products undergo rigorous testing and meet strict industrial and laboratory ISO standards.",
  },
  {
    icon: <Truck className="w-8 h-8 text-primary" />,
    title: "Pan-India Fulfillment",
    description: "Reliable logistics partners ensuring safe and timely delivery across all states in India.",
  },
  {
    icon: <Clock className="w-8 h-8 text-primary" />,
    title: "24/7 Dedicated Support",
    description: "Our expert support team is always available to help you with your queries and orders.",
  },
  {
    icon: <Award className="w-8 h-8 text-primary" />,
    title: "Unbeatable Value",
    description: "We offer the most competitive pricing on high-quality industrial and laboratory supplies.",
  },
];

export default function WhyChooseUs() {
  return (
    <div className="bg-white p-8 md:p-12">
      <div className="text-center mb-12">
        <h2 className="text-2xl md:text-3xl font-extrabold text-zinc-950 tracking-tight">Why Choose UC Enterprises?</h2>
        <p className="text-sm font-medium text-zinc-500 max-w-2xl mx-auto mt-3">
          We are committed to delivering excellence. Experience the best in industrial and laboratory supplies delivered right to your doorstep.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {features.map((feature, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1, duration: 0.5 }}
            className="flex flex-col items-center text-center group"
          >
            <div className="w-16 h-16 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
              {feature.icon}
            </div>
            <h3 className="text-base font-bold text-zinc-900 mb-2">{feature.title}</h3>
            <p className="text-xs text-zinc-500 font-medium leading-relaxed">
              {feature.description}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}