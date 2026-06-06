import Link from "next/link";
import Image from "next/image";
import { footerLinks, supportEmailHref, supportPhone, supportPhoneHref } from "@/lib/storefront";
import { Facebook, Instagram, Twitter, Youtube, Linkedin, CreditCard, ShieldCheck, Lock } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-gray-100 bg-white text-gray-900">
      <div className="container mx-auto grid gap-12 px-6 py-16 md:grid-cols-4">

        {/* Brand & Social Section */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 overflow-hidden flex items-center justify-center p-1">
              <Image src="/logo.jpg" alt="UC Enterprises" width={48} height={48} className="w-full h-full object-contain" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-black">UC <span className="text-red-500">Enterprises</span></h2>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Lab Equipment & Industrial Tools</p>
            </div>
          </div>
          <p className="text-sm leading-relaxed text-gray-500 max-w-xs">
            India's most trusted destination for laboratory essentials, industrial tools, and safety equipment. Quality delivered to your doorstep.
          </p>

          {/* Social Media Icons */}
          <div className="flex items-center gap-4">
            <a href="#" className="p-2 rounded-full bg-gray-50 text-gray-400 hover:bg-indigo-600 hover:text-white transition-all">
              <Instagram className="w-5 h-5" />
            </a>
            <a href="#" className="p-2 rounded-full bg-gray-50 text-gray-400 hover:bg-blue-600 hover:text-white transition-all">
              <Facebook className="w-5 h-5" />
            </a>
            <a href="#" className="p-2 rounded-full bg-gray-50 text-gray-400 hover:bg-sky-500 hover:text-white transition-all">
              <Twitter className="w-5 h-5" />
            </a>
            <a href="#" className="p-2 rounded-full bg-gray-50 text-gray-400 hover:bg-blue-700 hover:text-white transition-all">
              <Linkedin className="w-5 h-5" />
            </a>
          </div>
        </div>

        {/* Links: Explore */}
        <div>
          <h3 className="text-sm font-bold uppercase tracking-widest text-gray-900 mb-6">Explore</h3>
          <ul className="space-y-4 text-sm text-gray-500 font-medium">
            {footerLinks.company.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="hover:text-indigo-600 transition-colors">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Links: Policies */}
        <div>
          <h3 className="text-sm font-bold uppercase tracking-widest text-gray-900 mb-6">Policies</h3>
          <ul className="space-y-4 text-sm text-gray-500 font-medium">
            {footerLinks.policies.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="hover:text-indigo-600 transition-colors">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Contact Section */}
        <div>
          <h3 className="text-sm font-bold uppercase tracking-widest text-gray-900 mb-6">Customer Support</h3>
          <div className="space-y-4 text-sm text-gray-500 font-medium">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase text-gray-400 font-bold">Call Us</span>
              <a href={supportPhoneHref} className="text-gray-900 hover:text-indigo-600">{supportPhone}</a>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase text-gray-400 font-bold">Email Us</span>
              <a href={supportEmailHref} className="text-gray-900 hover:text-indigo-600">ucenterprises1@gmail.com</a>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase text-gray-400 font-bold">Our Location</span>
              <p className="text-gray-900">Ambala Delhi Highway, Zirakpur, Punjab</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-100 bg-gray-50/50">
        <div className="container mx-auto px-6 py-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-gray-400 font-medium">
            © {new Date().getFullYear()} UC Enterprises. All rights reserved. Made in India.
          </p>
          <div className="flex flex-col gap-4">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">
              Secure Payment Gateways
            </p>
            <div className="flex items-center gap-6">
              {/* Generic Payment Icon representing Visa/Mastercard/UPI */}
              <div className="flex items-center gap-2 group">
                <CreditCard className="w-5 h-5 text-gray-300 group-hover:text-indigo-600 transition-colors" />
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Cards</span>
              </div>

              <div className="flex items-center gap-2 group">
                <ShieldCheck className="w-5 h-5 text-gray-300 group-hover:text-indigo-600 transition-colors" />
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">UPI</span>
              </div>

              <div className="flex items-center gap-2 group border-l border-gray-100 pl-6">
                <Lock className="w-4 h-4 text-emerald-500/50" />
                <span className="text-[10px] font-bold text-emerald-600/70 uppercase tracking-widest">SSL Encrypted</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}