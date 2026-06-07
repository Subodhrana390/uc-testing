"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { X, Image as ImageIcon, Loader2, Upload } from "lucide-react";
import { createAdminClient as createClient } from "@/utils/supabase/admin-client";
import toast from "react-hot-toast";

interface SingleImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  bucket?: string;
}

export default function SingleImageUpload({ 
  value, 
  onChange, 
  label = "Image", 
  bucket = "product-images" 
}: SingleImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("Please upload an image file");
      return;
    }

    setUploading(true);
    try {
      const fileName = `${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
      
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      onChange(publicUrl);
      toast.success("Image uploaded successfully!");
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const removeImage = () => {
    onChange("");
  };

  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{label}</label>
      
      {value ? (
        <div className="relative w-32 h-32 border border-zinc-100 overflow-hidden bg-zinc-50 group shadow-sm">
          <Image unoptimized src={value} alt="Preview" fill className="object-contain" />
          <button
            type="button"
            onClick={removeImage}
            className="absolute top-2 right-2 p-1 bg-white border border-zinc-100 text-red-600 shadow-md opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center w-32 h-32 border-2 border-dashed border-zinc-100 hover:border-zinc-950 hover:bg-zinc-50 transition-all cursor-pointer group">
          <div className="flex flex-col items-center gap-2 text-zinc-400 group-hover:text-zinc-950 transition-colors">
            {uploading ? (
              <Loader2 className="w-6 h-6 animate-spin text-zinc-950" />
            ) : (
              <>
                <Upload className="w-6 h-6" />
                <span className="text-[9px] font-black uppercase tracking-widest">Select File</span>
              </>
            )}
          </div>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleUpload}
            disabled={uploading}
          />
        </label>
      )}
      
      <div className="flex gap-2">
        <input
          placeholder="External Image URL..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-10 px-4 border border-zinc-100 text-[10px] font-bold focus:outline-none focus:border-zinc-950 transition-all placeholder:text-zinc-200"
        />
      </div>
    </div>
  );
}
