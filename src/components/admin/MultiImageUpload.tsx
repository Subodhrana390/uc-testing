"use client";

import { useState } from "react";
import { X, Plus, Image as ImageIcon, Loader2, Upload, Star, ArrowLeft, ArrowRight, Maximize2 } from "lucide-react";
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
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
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

  const handlePrev = () => {
    if (selectedImageIndex === null) return;
    setSelectedImageIndex(prev => prev !== null ? (prev - 1 + images.length) % images.length : null);
  };

  const handleNext = () => {
    if (selectedImageIndex === null) return;
    setSelectedImageIndex(prev => prev !== null ? (prev + 1) % images.length : null);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {images.map((url, index) => (
          <div key={index} className="relative aspect-square border border-zinc-150 overflow-hidden bg-zinc-50 group/item shadow-sm rounded-xl flex items-center justify-center p-2 hover:border-zinc-350 hover:shadow-md transition-all duration-200">
            <div 
              onClick={() => setSelectedImageIndex(index)}
              className="w-full h-full cursor-pointer flex items-center justify-center relative"
              title="Click to view large preview"
            >
              <img src={url} alt="" className="w-full h-full object-contain mix-blend-multiply transition-transform duration-300 group-hover/item:scale-105" />
              
              {/* Click to expand overlay */}
              <div className="absolute inset-0 bg-black/10 opacity-0 group-hover/item:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                <Maximize2 className="w-5 h-5 text-white drop-shadow-md" />
              </div>
            </div>
            
            {/* Top Bar Actions */}
            <div className="absolute top-2 left-2 right-2 flex justify-between items-center opacity-0 group-hover/item:opacity-100 transition-opacity z-10">
              {index > 0 ? (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); makePrimary(index); }}
                  className="p-1.5 bg-white hover:bg-teal-50 border border-zinc-150 text-zinc-500 hover:text-teal-600 rounded-lg shadow-sm transition-all hover:scale-105"
                  title="Make Primary Asset"
                >
                  <Star className="w-3.5 h-3.5 text-zinc-400 hover:text-teal-600" />
                </button>
              ) : (
                <div className="p-1.5 bg-teal-50 border border-teal-100 text-teal-650 rounded-lg shadow-sm">
                  <Star className="w-3.5 h-3.5 fill-teal-650 text-teal-650" />
                </div>
              )}
              
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); removeImage(index); }}
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
                    onClick={(e) => { e.stopPropagation(); moveImage(index, "left"); }}
                    className="p-1 bg-white hover:bg-zinc-50 border border-zinc-150 text-zinc-500 hover:text-zinc-800 rounded-md shadow-sm transition-all"
                    title="Move Left"
                  >
                    <ArrowLeft className="w-3 h-3" />
                  </button>
                )}
                {index < images.length - 1 && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); moveImage(index, "right"); }}
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

      {/* Large Image Preview Modal / Lightbox */}
      {selectedImageIndex !== null && (
        <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 md:p-10 animate-in fade-in duration-200">
          <div className="relative bg-white border border-zinc-150 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 bg-white">
              <div className="flex flex-col">
                <h3 className="font-bold text-zinc-900 text-base">Image Preview</h3>
                <p className="text-xs text-zinc-400">
                  Asset {selectedImageIndex + 1} of {images.length}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedImageIndex(null)}
                className="p-1.5 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-zinc-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body - Large Image View */}
            <div className="flex-1 min-h-0 bg-zinc-50 relative flex items-center justify-center p-6 group">
              <img
                src={images[selectedImageIndex]}
                alt={`Asset ${selectedImageIndex + 1}`}
                className="max-w-full max-h-[55vh] object-contain rounded-lg shadow-sm"
              />

              {/* Navigation Arrows */}
              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={handlePrev}
                    className="absolute left-4 p-2 bg-white/95 hover:bg-white border border-zinc-150 text-zinc-700 rounded-full shadow-lg transition opacity-80 hover:opacity-100 hover:scale-105"
                    title="Previous Image"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    className="absolute right-4 p-2 bg-white/95 hover:bg-white border border-zinc-150 text-zinc-700 rounded-full shadow-lg transition opacity-80 hover:opacity-100 hover:scale-105"
                    title="Next Image"
                  >
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex flex-wrap items-center justify-between px-6 py-4 border-t border-zinc-100 bg-white gap-4">
              <div className="flex items-center gap-2">
                {selectedImageIndex === 0 ? (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 border border-teal-100 text-teal-700 rounded-lg text-xs font-bold uppercase tracking-wider">
                    <Star className="w-3.5 h-3.5 fill-teal-600 text-teal-600" />
                    Primary Asset
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      makePrimary(selectedImageIndex);
                      setSelectedImageIndex(0);
                    }}
                    className="flex items-center gap-1.5 text-zinc-650 hover:text-teal-600 hover:bg-teal-50 hover:border-teal-200"
                  >
                    <Star className="w-3.5 h-3.5 text-zinc-400" />
                    Set as Primary
                  </Button>
                )}
                
                {images.length > 1 && (
                  <div className="flex gap-1 ml-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={selectedImageIndex === 0}
                      onClick={() => {
                        moveImage(selectedImageIndex, "left");
                        setSelectedImageIndex(selectedImageIndex - 1);
                      }}
                      className="px-2"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={selectedImageIndex === images.length - 1}
                      onClick={() => {
                        moveImage(selectedImageIndex, "right");
                        setSelectedImageIndex(selectedImageIndex + 1);
                      }}
                      className="px-2"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(images[selectedImageIndex!]);
                    toast.success("Image URL copied!");
                  }}
                  className="text-zinc-600"
                >
                  Copy URL
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    const idx = selectedImageIndex!;
                    removeImage(idx);
                    if (images.length <= 1) {
                      setSelectedImageIndex(null);
                    } else {
                      setSelectedImageIndex(Math.min(idx, images.length - 2));
                    }
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Delete Image
                </Button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
