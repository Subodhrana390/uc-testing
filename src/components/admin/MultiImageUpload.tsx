"use client";

import { useState } from "react";
import { X, Plus, Image as ImageIcon, Loader2, Upload, Star, ArrowLeft, ArrowRight } from "lucide-react";
import { createAdminClient as createClient } from "@/utils/supabase/admin-client";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface MultiImageUploadProps {
  images: string[];
  onChange: (images: string[]) => void;
}

export default function MultiImageUpload({ images, onChange }: MultiImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const supabase = createClient();

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const newImages = [...images];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileName = `${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
        const { data, error } = await supabase.storage
          .from('product-images')
          .upload(fileName, file);

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
          .from('product-images')
          .getPublicUrl(fileName);

        newImages.push(publicUrl);
      }
      onChange(newImages);
      toast.success(`${files.length} asset(s) registered successfully!`);
    } catch (err: any) {
      toast.error(err.message || "Transfer failed");
    } finally {
      setUploading(false);
    }
  };

  const addUrl = () => {
    if (!urlInput) return;
    if (!urlInput.match(/^https?:\/\/.+/)) {
      toast.error("Invalid URI protocol");
      return;
    }
    onChange([...images, urlInput]);
    setUrlInput("");
  };

  const removeImage = (index: number) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    onChange(newImages);
  };

  const makePrimary = (index: number) => {
    if (index === 0) return;
    const newImages = [...images];
    const [selectedImage] = newImages.splice(index, 1);
    newImages.unshift(selectedImage);
    onChange(newImages);
    toast.success("Primary asset updated");
  };

  const moveImage = (index: number, direction: "left" | "right") => {
    const newIndex = direction === "left" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= images.length) return;
    const newImages = [...images];
    const temp = newImages[index];
    newImages[index] = newImages[newIndex];
    newImages[newIndex] = temp;
    onChange(newImages);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {images.map((url, index) => (
          <div key={index} className="relative aspect-square border border-zinc-150 overflow-hidden bg-zinc-50 group/item shadow-sm rounded-xl flex items-center justify-center p-2">
            <img src={url} alt="" className="w-full h-full object-contain mix-blend-multiply" />
            
            {/* Top Bar Actions */}
            <div className="absolute top-2 left-2 right-2 flex justify-between items-center opacity-0 group-hover/item:opacity-100 transition-opacity z-10">
              {index > 0 ? (
                <button
                  type="button"
                  onClick={() => makePrimary(index)}
                  className="p-1.5 bg-white hover:bg-teal-50 border border-zinc-150 text-zinc-500 hover:text-teal-600 rounded-lg shadow-sm transition-all hover:scale-105"
                  title="Make Primary Asset"
                >
                  <Star className="w-3.5 h-3.5 text-zinc-400 hover:text-teal-600" />
                </button>
              ) : (
                <div className="p-1.5 bg-teal-50 border border-teal-100 text-teal-650 rounded-lg shadow-sm">
                  <Star className="w-3.5 h-3.5 fill-teal-600 text-teal-600" />
                </div>
              )}
              
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="p-1.5 bg-white hover:bg-red-50 border border-zinc-150 text-zinc-500 hover:text-red-650 rounded-lg shadow-sm transition-all hover:scale-105"
                title="Remove Asset"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Bottom Re-ordering Actions */}
            {images.length > 1 && (
              <div className="absolute bottom-2 left-2 right-2 flex justify-center gap-1.5 opacity-0 group-hover/item:opacity-100 transition-opacity z-10">
                {index > 0 && (
                  <button
                    type="button"
                    onClick={() => moveImage(index, "left")}
                    className="p-1 bg-white hover:bg-zinc-50 border border-zinc-150 text-zinc-500 hover:text-zinc-800 rounded-md shadow-sm transition-all"
                    title="Move Left"
                  >
                    <ArrowLeft className="w-3 h-3" />
                  </button>
                )}
                {index < images.length - 1 && (
                  <button
                    type="button"
                    onClick={() => moveImage(index, "right")}
                    className="p-1 bg-white hover:bg-zinc-50 border border-zinc-150 text-zinc-500 hover:text-zinc-800 rounded-md shadow-sm transition-all"
                    title="Move Right"
                  >
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}

            {/* Primary Asset Footer Badge */}
            {index === 0 && (
              <div className="absolute bottom-0 left-0 right-0 bg-teal-600 text-white text-[8px] font-black text-center py-1 uppercase tracking-[0.2em] z-0 pointer-events-none group-hover/item:opacity-0 transition-opacity">
                Primary Asset
              </div>
            )}
          </div>
        ))}
        
        <label className="flex flex-col items-center justify-center aspect-square border-2 border-dashed border-zinc-200 rounded-xl hover:border-zinc-950 hover:bg-zinc-50 transition-all cursor-pointer group">
          <div className="flex flex-col items-center gap-2 text-zinc-400 group-hover:text-zinc-950 transition-colors">
            {uploading ? (
              <Loader2 className="w-6 h-6 animate-spin text-zinc-950" />
            ) : (
              <>
                <Upload className="w-6 h-6" />
                <span className="text-[9px] font-black uppercase tracking-widest">Add Asset</span>
              </>
            )}
          </div>
          <input
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={handleUpload}
            disabled={uploading}
          />
        </label>
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Inject external image URL..."
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addUrl())}
          className="flex-1 h-11 border-zinc-200 bg-white rounded-xl text-sm focus-visible:ring-1 focus-visible:ring-teal-600 focus-visible:border-teal-600 placeholder:text-zinc-400"
        />
        <Button 
          type="button"
          onClick={addUrl}
          className="h-11 bg-zinc-900 hover:bg-zinc-800 text-white flex items-center justify-center rounded-xl px-4 transition-all shadow-sm shrink-0"
        >
          <Plus className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}
