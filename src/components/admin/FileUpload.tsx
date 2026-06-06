"use client";

import { useState } from "react";
import { FileIcon, X, Loader2, UploadCloud, Download } from "lucide-react";
import { createAdminClient as createClient } from "@/utils/supabase/admin-client";
import toast from "react-hot-toast";

interface FileUploadProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  accept?: string;
  bucket?: string;
}

export default function FileUpload({ 
  value, 
  onChange, 
  label = "Upload File", 
  accept = ".pdf", 
  bucket = "product-documents" 
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const supabase = createClient();

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileName = `${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      onChange(publicUrl);
      toast.success("File uploaded successfully");
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const removeFile = () => {
    onChange("");
  };

  return (
    <div className="space-y-2">
      {value ? (
        <div className="flex items-center justify-between p-3 border rounded-lg bg-zinc-50 group">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-50 text-red-600 rounded-lg">
              <FileIcon className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-zinc-900 truncate max-w-[200px]">
                {value.split('/').pop()}
              </span>
              <a 
                href={value} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-[10px] text-zinc-400 hover:text-primary flex items-center gap-1"
              >
                <Download className="w-3 h-3" /> View Document
              </a>
            </div>
          </div>
          <button 
            onClick={removeFile}
            className="p-2 text-zinc-400 hover:text-red-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-zinc-200 rounded-xl hover:border-black hover:bg-zinc-50 transition-all cursor-pointer group">
          <div className="flex flex-col items-center gap-2 text-zinc-400 group-hover:text-black">
            {uploading ? (
              <Loader2 className="w-8 h-8 animate-spin" />
            ) : (
              <>
                <UploadCloud className="w-8 h-8" />
                <div className="text-center">
                  <p className="text-sm font-bold">{label}</p>
                  <p className="text-[10px] uppercase tracking-widest font-medium opacity-60">PDF up to 10MB</p>
                </div>
              </>
            )}
          </div>
          <input 
            type="file" 
            accept={accept} 
            onChange={handleUpload} 
            disabled={uploading} 
            className="hidden" 
          />
        </label>
      )}
    </div>
  );
}
