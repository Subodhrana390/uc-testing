import Link from "next/link";
import Image from "next/image";
import { footerLinks, supportEmailHref, supportPhone, supportPhoneHref } from "@/lib/storefront";
import { Facebook, Instagram, Twitter, Youtube, Linkedin, CreditCard, ShieldCheck, Lock } from "lucide-react";
import { SiteSettings } from "@/app/actions/settings";

interface FooterProps {
  settings?: SiteSettings | null;
}

export default function Footer({ settings }: FooterProps) {
  const socialLinks = settings?.social_links || {};
  const logoSrc = settings?.logo_url || "/logo.png";
  const siteName = settings?.site_name || "UC Enterprises";
  const displayPhone = settings?.contact_phone || supportPhone;
  const displayPhoneHref = settings?.contact_phone ? `tel:${settings.contact_phone.replace(/\s+/g, '')}` : supportPhoneHref;
  const displayEmail = settings?.contact_email || "ucenterprises1@gmail.com";
  const displayEmailHref = settings?.contact_email ? `mailto:${settings.contact_email}` : supportEmailHref;
  const displayAddress = settings?.contact_address || "Shop No. 1, Khairabad Village, Near Bus Stand, Bela Road, Khairabad, Ropar, Punjab - 140001, India.";

  const hasAnySocial = !!(
    socialLinks.instagram ||
    socialLinks.facebook ||
    socialLinks.twitter ||
    socialLinks.linkedin ||
    socialLinks.youtube
  );

  return (
    <footer className="border-t border-zinc-200 bg-white">
      <div className="w-full px-4 md:px-8 2xl:px-12 mx-auto grid gap-12 px-6 py-16 md:grid-cols-4">

        {/* Brand & Social Section */}
        <div className="space-y-6 text-left">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 overflow-hidden flex items-center justify-center p-1">
              <Image src={logoSrc} alt={siteName} width={48} height={48} className="w-full h-full object-contain" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-zinc-950 uppercase">{siteName}</h2>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Lab Equipment & Industrial Tools</p>
            </div>
          </div>
          <p className="text-sm leading-relaxed text-zinc-500 max-w-xs">
            India's most trusted destination for laboratory essentials, industrial tools, and safety equipment. Quality delivered to your doorstep.
          </p>

          {/* Social Media Icons */}
          <div className="flex items-center gap-4">
            {socialLinks.instagram && (
              <a
                href={socialLinks.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-full bg-pink-50 border border-pink-200 text-pink-600 hover:bg-pink-600 hover:text-white transition-all shadow-sm"
              >
                <Instagram className="w-4 h-4" />
              </a>
            )}

            {socialLinks.facebook && (
              <a
                href={socialLinks.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-full bg-blue-50 border border-blue-200 text-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
              >
                <Facebook className="w-4 h-4" />
              </a>
            )}

            {socialLinks.twitter && (
              <a
                href={socialLinks.twitter}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-full bg-sky-50 border border-sky-200 text-sky-500 hover:bg-sky-500 hover:text-white transition-all shadow-sm"
              >
                <Twitter className="w-4 h-4" />
              </a>
            )}

            {socialLinks.linkedin && (
              <a
                href={socialLinks.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-full bg-blue-50 border border-blue-200 text-[#0A66C2] hover:bg-[#0A66C2] hover:text-white transition-all shadow-sm"
              >
                <Linkedin className="w-4 h-4" />
              </a>
            )}

            {socialLinks.youtube && (
              <a
                href={socialLinks.youtube}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-full bg-red-50 border border-red-200 text-red-600 hover:bg-red-600 hover:text-white transition-all shadow-sm"
              >
                <Youtube className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>

        {/* Links: Explore */}
        <div>
          <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-950 mb-6">Explore</h3>
          <ul className="space-y-4 text-sm text-zinc-500 font-medium text-left">
            {footerLinks.company.map((link) => (
              <li key={link.href}>
                <Link prefetch={false} href={link.href} className="hover:text-primary transition-colors">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Links: Policies */}
        <div>
          <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-950 mb-6">Policies</h3>
          <ul className="space-y-4 text-sm text-zinc-500 font-medium text-left">
            {footerLinks.policies.map((link) => (
              <li key={link.href}>
                <Link prefetch={false} href={link.href} className="hover:text-primary transition-colors">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Contact Section */}
        <div className="text-left">
          <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-950 mb-6">Customer Support</h3>
          <div className="space-y-4 text-sm text-zinc-500 font-medium">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase text-zinc-400 font-bold tracking-widest">Call Us</span>
              <a href={displayPhoneHref} className="text-zinc-900 hover:text-primary transition-colors">{displayPhone}</a>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase text-zinc-400 font-bold tracking-widest">Email Us</span>
              <a href={displayEmailHref} className="text-zinc-900 hover:text-primary transition-colors">{displayEmail}</a>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase text-zinc-400 font-bold tracking-widest">Our Location</span>
              <p className="text-zinc-900 leading-relaxed">{displayAddress}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-zinc-100 bg-zinc-50">
        <div className="w-full px-4 md:px-8 2xl:px-12 mx-auto py-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-zinc-500 font-medium">
            © {new Date().getFullYear()} {siteName}. All rights reserved. Made in India.
          </p>
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 group">
                <CreditCard className="w-5 h-5 text-zinc-400 group-hover:text-zinc-600 transition-colors" />
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest group-hover:text-zinc-600 transition-colors">Cards</span>
              </div>

              <div className="flex items-center gap-2 group">
                <ShieldCheck className="w-5 h-5 text-zinc-400 group-hover:text-zinc-600 transition-colors" />
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest group-hover:text-zinc-600 transition-colors">UPI</span>
              </div>

              <div className="flex items-center gap-2 group border-l border-zinc-200 pl-6">
                <Lock className="w-4 h-4 text-emerald-500" />
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">SSL Encrypted</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
