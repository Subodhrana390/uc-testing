"use client";

import { X, Copy, Check, MessageCircle, Facebook, Twitter, Linkedin, Mail } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  text: string;
  url: string;
  imageUrl?: string;
}

export default function ShareModal({ isOpen, onClose, title, text, url, imageUrl }: ShareModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  const encodedText = encodeURIComponent(text);

  const shareOptions = [
    {
      name: "WhatsApp",
      icon: MessageCircle,
      href: `https://api.whatsapp.com/send?text=${encodedTitle}%0A${encodedUrl}`,
      color: "bg-emerald-50 text-emerald-600 hover:bg-emerald-100",
      iconColor: "text-emerald-500"
    },
    {
      name: "Facebook",
      icon: Facebook,
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      color: "bg-blue-50 text-blue-600 hover:bg-blue-100",
      iconColor: "text-blue-500"
    },
    {
      name: "X (Twitter)",
      icon: Twitter,
      href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
      color: "bg-zinc-100 text-zinc-900 hover:bg-zinc-200",
      iconColor: "text-zinc-800"
    },
    {
      name: "LinkedIn",
      icon: Linkedin,
      href: `https://www.linkedin.com/shareArticle?mini=true&url=${encodedUrl}&title=${encodedTitle}&summary=${encodedText}`,
      color: "bg-sky-50 text-sky-700 hover:bg-sky-100",
      iconColor: "text-sky-600"
    },
    {
      name: "Email",
      icon: Mail,
      href: `mailto:?subject=${encodedTitle}&body=${encodedText}%0A%0A${encodedUrl}`,
      color: "bg-orange-50 text-orange-600 hover:bg-orange-100",
      iconColor: "text-orange-500"
    }
  ];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy", err);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999]"
          />
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-white rounded-3xl w-full max-w-md shadow-2xl pointer-events-auto overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-zinc-100">
                <h3 className="text-lg font-black text-zinc-900">Share Product</h3>
                <button
                  onClick={onClose}
                  className="p-2 -mr-2 rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Product Preview */}
                <div className="flex items-center gap-4 bg-zinc-50 p-3 rounded-2xl border border-zinc-100">
                  {imageUrl && (
                    <div className="w-16 h-16 shrink-0 bg-white rounded-xl border border-zinc-200 overflow-hidden relative p-1.5">
                      <img src={imageUrl} alt="" className="w-full h-full object-contain" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-zinc-900 truncate">{title}</h4>
                    <p className="text-xs font-medium text-zinc-500 truncate mt-0.5">Check out this product</p>
                  </div>
                </div>

                {/* Social Share Grid */}
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-3">Share via</p>
                  <div className="grid grid-cols-5 gap-2">
                    {shareOptions.map((option) => {
                      const Icon = option.icon;
                      return (
                        <a
                          key={option.name}
                          href={option.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex flex-col items-center gap-2 group"
                        >
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform active:scale-95 group-hover:-translate-y-1 ${option.color}`}>
                            <Icon className={`w-5 h-5 ${option.iconColor}`} />
                          </div>
                          <span className="text-[10px] font-bold text-zinc-500 truncate max-w-full px-1">{option.name}</span>
                        </a>
                      );
                    })}
                  </div>
                </div>

                {/* Copy Link */}
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-3">Or copy link</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-12 px-4 rounded-xl border border-zinc-200 bg-zinc-50 flex items-center overflow-hidden">
                      <p className="text-xs font-medium text-zinc-500 truncate select-all">{url}</p>
                    </div>
                    <button
                      onClick={handleCopy}
                      className={`h-12 px-5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 active:scale-95 shrink-0 ${
                        copied 
                          ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-500/20" 
                          : "bg-zinc-900 hover:bg-zinc-800 text-white shadow-md shadow-zinc-900/20"
                      }`}
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      <span>{copied ? "Copied!" : "Copy"}</span>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
