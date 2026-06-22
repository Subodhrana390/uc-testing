"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { generateVariants, bulkUpsertVariants, getProductVariants, deleteVariant } from "@/app/actions/variants";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, Plus, Trash2, Save, Wand2, X, Upload } from "lucide-react";
import toast from "react-hot-toast";
import { createAdminClient as createClient } from "@/utils/supabase/admin-client";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";

function VariantImageCell({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error("Please upload an image file");
      return;
    }

    setUploading(true);
    try {
      const fileName = `${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
      const { data, error } = await supabase.storage
        .from("products")
        .upload(fileName, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from("products")
        .getPublicUrl(fileName);

      onChange(publicUrl);
      toast.success("Image uploaded!");
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center justify-center">
      {value ? (
        <div className="relative w-10 h-10 border border-zinc-200 rounded-md overflow-hidden bg-zinc-50 group shadow-sm shrink-0">
          <Image unoptimized src={value} alt="Preview" fill className="object-cover" />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute inset-0 flex items-center justify-center bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
            title="Remove Image"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <label className="flex items-center justify-center w-10 h-10 border border-dashed border-zinc-200 rounded-md hover:border-zinc-500 hover:bg-zinc-50 transition cursor-pointer group shrink-0">
          {uploading ? (
            <Loader2 className="w-4 h-4 animate-spin text-zinc-650" />
          ) : (
            <Upload className="w-4 h-4 text-zinc-400 group-hover:text-zinc-600" />
          )}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleUpload}
            disabled={uploading}
          />
        </label>
      )}
    </div>
  );
}

export default function ProductVariantsManager({
  productId,
  productName = "",
  basePrice,
  gstRate = 0,
  onDefaultSync
}: {
  productId: string;
  productName?: string;
  basePrice: number;
  gstRate?: number;
  onDefaultSync?: (v: any) => void;
}) {
  const [variants, setVariants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [attributesMatrix, setAttributesMatrix] = useState<Record<string, string>>({});
  const [newKey, setNewKey] = useState("");
  const [newValues, setNewValues] = useState("");

  useEffect(() => {
    fetchVariants();
  }, [productId]);

  const fetchVariants = async () => {
    setLoading(true);
    const { success, data } = await getProductVariants(productId);
    if (success && data) {
      const mapped = data.map((v: any) => ({
        ...v,
        sale_price: v.sale_price ? (v.sale_price / (1 + gstRate / 100)).toFixed(2) : (v.price ? (v.price / (1 + gstRate / 100)).toFixed(2) : "")
      }));
      setVariants(mapped);
    }
    setLoading(false);
  };

  const handleGenerate = async () => {
    const parsedMatrix: Record<string, string[]> = {};
    Object.entries(attributesMatrix).forEach(([key, val]) => {
      parsedMatrix[key] = val.split(",").map(v => v.trim()).filter(Boolean);
    });

    if (Object.keys(parsedMatrix).length === 0) {
      toast.error("Please add at least one attribute to generate variants.");
      return;
    }

    setSaving(true);
    const { success, error } = await generateVariants(productId, parsedMatrix, basePrice);
    if (success) {
      toast.success("Variants generated successfully");
      fetchVariants();
      setAttributesMatrix({}); // Reset matrix after generation
    } else {
      toast.error(error || "Failed to generate variants");
    }
    setSaving(false);
  };

  const handleSaveAll = async () => {
    setSaving(true);
    const toSave = variants.map(v => {
      const incl = v.sale_price ? Number(v.sale_price) * (1 + gstRate / 100) : 0;
      return {
        ...v,
        price: incl,
        sale_price: incl
      };
    });
    const { success, error } = await bulkUpsertVariants(toSave);
    if (success) {
      toast.success("Variants saved successfully");
      fetchVariants();
      const defVariant = toSave.find((v: any) => v.is_default);
      if (defVariant && onDefaultSync) {
        onDefaultSync({
          price: defVariant.sale_price ? (defVariant.sale_price / (1 + gstRate / 100)).toFixed(2) : defVariant.price ? (defVariant.price / (1 + gstRate / 100)).toFixed(2) : "",
          sale_price: defVariant.sale_price ? (defVariant.sale_price / (1 + gstRate / 100)).toFixed(2) : "",
          sku: defVariant.sku,
          stock_quantity: defVariant.stock_quantity
        });
      }
    } else {
      toast.error(error || "Failed to save variants");
    }
    setSaving(false);
  };

  const handleUpdateVariant = (index: number, field: string, value: any) => {
    setVariants(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleAddVariant = () => {
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const autoSku = `PRD-${productId.split("-")[0]}-${randomSuffix}`;
    
    // Auto populate attributes keys with empty values
    const initialAttrs: Record<string, string> = {};
    attributeKeys.forEach(k => {
      initialAttrs[k] = "";
    });

    setVariants(prev => [
      ...prev,
      {
        id: "",
        product_id: productId,
        sku: autoSku,
        name: productName,
        sale_price: basePrice || 0,
        stock_quantity: 0,
        attributes: initialAttrs,
        is_default: prev.length === 0,
        status: "ACTIVE",
        images: []
      }
    ]);
  };

  const handleDeleteVariant = async (id: string, index: number) => {
    if (id) {
      if (confirm("Are you sure you want to delete this variant? This will immediately remove it from the database.")) {
        const { success, error } = await deleteVariant(id);
        if (success) {
          toast.success("Variant deleted");
          fetchVariants();
        } else {
          toast.error(error || "Failed to delete variant");
        }
      }
    } else {
      setVariants(prev => {
        const updated = [...prev];
        updated.splice(index, 1);
        return updated;
      });
    }
  };

  // Dynamically compute all attribute keys present in variants or generator matrix
  const attributeKeys = useMemo(() => {
    const keys = new Set<string>();
    variants.forEach(v => {
      if (v.attributes) {
        Object.keys(v.attributes).forEach(k => keys.add(k));
      }
    });
    Object.keys(attributesMatrix).forEach(k => keys.add(k));
    return Array.from(keys);
  }, [variants, attributesMatrix]);

  const columnHelper = createColumnHelper<any>();

  const columns = useMemo(() => {
    const cols = [
      columnHelper.display({
        id: "image",
        header: () => <div className="text-center">Image</div>,
        cell: (info) => {
          const i = info.row.index;
          const v = info.row.original;
          const imgUrl = v.images?.[0] || "";
          return (
            <VariantImageCell
              value={imgUrl}
              onChange={(url) => handleUpdateVariant(i, "images", url ? [url] : [])}
            />
          );
        }
      }),
      columnHelper.accessor("sku", {
        header: "SKU",
        cell: (info) => {
          const i = info.row.index;
          const v = info.row.original;
          return (
            <input
              type="text"
              value={v.sku || ""}
              onChange={e => handleUpdateVariant(i, 'sku', e.target.value)}
              className="w-full border border-zinc-200 rounded-md text-xs px-2 py-1 outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400 font-mono text-zinc-700"
              placeholder="SKU"
            />
          );
        }
      }),
      columnHelper.accessor("name", {
        header: "Variant Name",
        cell: (info) => {
          const i = info.row.index;
          const v = info.row.original;
          return (
            <input
              type="text"
              value={v.name || ""}
              onChange={e => handleUpdateVariant(i, 'name', e.target.value)}
              className="w-full min-w-[130px] border border-zinc-200 rounded-md text-xs px-2 py-1 outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400"
              placeholder="Variant Name"
            />
          );
        }
      })
    ];

    // Add dynamic attribute columns
    attributeKeys.forEach((key) => {
      cols.push(
        columnHelper.display({
          id: `attr_${key}`,
          header: key,
          cell: (info) => {
            const i = info.row.index;
            const v = info.row.original;
            const attrs = v.attributes || {};
            const val = attrs[key] || "";
            return (
              <input
                type="text"
                value={String(val)}
                onChange={(e) => {
                  const updatedAttrs = { ...v.attributes, [key]: e.target.value };
                  handleUpdateVariant(i, "attributes", updatedAttrs);
                }}
                className="w-20 border border-zinc-200 rounded-md text-xs px-2 py-1 outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400"
                placeholder="Value"
              />
            );
          }
        })
      );
    });

    cols.push(
      columnHelper.accessor("sale_price", {
        header: "Price (Excl GST)",
        cell: (info) => {
          const i = info.row.index;
          const v = info.row.original;
          return (
            <input
              type="number"
              value={v.sale_price ?? ""}
              onChange={e => handleUpdateVariant(i, 'sale_price', e.target.value ? Number(e.target.value) : "")}
              className="w-20 border border-zinc-200 rounded-md text-xs px-2 py-1 outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400"
              placeholder="Price"
            />
          );
        }
      }),
      columnHelper.accessor("stock_quantity", {
        header: "Stock",
        cell: (info) => {
          const i = info.row.index;
          const v = info.row.original;
          return (
            <input
              type="number"
              value={v.stock_quantity ?? 0}
              onChange={e => handleUpdateVariant(i, 'stock_quantity', Number(e.target.value))}
              className="w-16 border border-zinc-200 rounded-md text-xs px-2 py-1 outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400"
              placeholder="Stock"
            />
          );
        }
      }),
      columnHelper.accessor("is_default", {
        header: () => <div className="text-center">Default</div>,
        cell: (info) => {
          const i = info.row.index;
          const v = info.row.original;
          return (
            <div className="text-center">
              <input
                type="radio"
                name="defaultVariant"
                checked={v.is_default || false}
                onChange={() => {
                  setVariants(prev => prev.map((_v, idx) => ({ ..._v, is_default: idx === i })));
                }}
                className="w-4 h-4 text-zinc-950 accent-zinc-950 cursor-pointer"
              />
            </div>
          );
        }
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: (info) => {
          const i = info.row.index;
          const v = info.row.original;
          return (
            <select
              value={v.status || "ACTIVE"}
              onChange={e => handleUpdateVariant(i, 'status', e.target.value)}
              className="border border-zinc-200 rounded-md text-xs px-2 py-1 bg-white outline-none focus:border-zinc-400"
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          );
        }
      }),
      columnHelper.display({
        id: "actions",
        header: () => <div className="text-right">Actions</div>,
        cell: (info) => {
          const i = info.row.index;
          const v = info.row.original;
          return (
            <div className="text-right">
              <button
                type="button"
                onClick={() => handleDeleteVariant(v.id, i)}
                className="text-red-500 hover:bg-red-50 p-1.5 rounded transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        }
      })
    );

    return cols;
  }, [variants, attributeKeys]);

  const table = useReactTable({
    data: variants,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: 10 }
    }
  });

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin w-6 h-6 text-zinc-400" /></div>;

  return (
    <div className="space-y-6">
      {/* Bulk Generator Card */}
      <Card className="border border-zinc-200 rounded-xl overflow-hidden shadow-sm bg-white">
        <div className="p-4 border-b border-zinc-200 bg-zinc-50/50 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-orange-500 animate-pulse" />
            <h3 className="text-sm font-bold text-zinc-900">Bulk Variant Generator</h3>
          </div>
          <span className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Configure Attribute Matrix</span>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="space-y-1.5 text-left">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Attribute Name</label>
              <input
                type="text"
                placeholder="e.g. Size, Color, Thread"
                value={newKey}
                onChange={e => setNewKey(e.target.value)}
                className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-zinc-400 placeholder:text-zinc-300"
              />
            </div>
            <div className="space-y-1.5 text-left">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Values (Comma Separated)</label>
              <input
                type="text"
                placeholder="e.g. S, M, L or 10MM, 20MM"
                value={newValues}
                onChange={e => setNewValues(e.target.value)}
                className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-zinc-400 placeholder:text-zinc-300"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (!newKey.trim()) { toast.error("Attribute name is required"); return; }
                if (!newValues.trim()) { toast.error("Attribute values are required"); return; }
                setAttributesMatrix(prev => ({
                  ...prev,
                  [newKey.trim()]: newValues
                }));
                setNewKey("");
                setNewValues("");
              }}
              className="h-9 text-xs font-bold gap-1 border-zinc-200 hover:bg-zinc-50 shadow-sm rounded-lg"
            >
              <Plus className="w-3.5 h-3.5" /> Add Attribute
            </Button>
          </div>

          {/* Active Matrix List */}
          {Object.keys(attributesMatrix).length > 0 && (
            <div className="bg-zinc-50/50 p-4 rounded-xl border border-zinc-150 space-y-3 text-left">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Defined Attributes:</span>
              <div className="flex flex-wrap gap-3">
                {Object.entries(attributesMatrix).map(([key, val]) => (
                  <div key={key} className="bg-white border border-zinc-200 rounded-lg p-2.5 flex items-center gap-4 shadow-sm">
                    <div>
                      <span className="text-xs font-bold text-zinc-700 block">{key}</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {val.split(",").map(v => v.trim()).filter(Boolean).map(v => (
                          <span key={v} className="bg-zinc-100 text-zinc-650 px-2 py-0.5 rounded text-[9px] font-bold">
                            {v}
                          </span>
                        ))}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const next = { ...attributesMatrix };
                        delete next[key];
                        setAttributesMatrix(next);
                      }}
                      className="text-zinc-400 hover:text-red-500 p-1 hover:bg-zinc-50 rounded transition ml-auto"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              
              <div className="pt-3 border-t border-zinc-200/50 flex justify-end">
                <Button
                  type="button"
                  onClick={handleGenerate}
                  disabled={saving}
                  className="bg-zinc-950 hover:bg-zinc-800 text-white gap-2 text-xs font-bold h-9 shadow-sm rounded-lg"
                >
                  <Wand2 className="w-4 h-4 text-orange-400" />
                  Generate All Combinations
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Grid */}
      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-zinc-200 flex justify-between items-center bg-zinc-50/50">
          <h3 className="text-sm font-bold text-zinc-900">Manage Variants ({variants.length})</h3>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={handleAddVariant} disabled={saving} className="gap-1.5 h-8 text-xs rounded-lg shadow-sm border-zinc-200">
              <Plus className="w-3.5 h-3.5" /> Add Row
            </Button>
            <Button type="button" onClick={handleSaveAll} disabled={saving || variants.length === 0} className="gap-1.5 h-8 text-xs rounded-lg shadow-sm bg-zinc-950 text-white hover:bg-zinc-800">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save Changes
            </Button>
          </div>
        </div>
        {variants.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-zinc-50/70 border-b border-zinc-200 text-zinc-500 uppercase tracking-wider">
                  {table.getHeaderGroups().map(headerGroup => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map(header => (
                        <th key={header.id} className="px-4 py-3.5 font-bold text-[10px] tracking-wider whitespace-nowrap">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody className="divide-y divide-zinc-150">
                  {table.getRowModel().rows.map(row => (
                    <tr key={row.id} className="hover:bg-zinc-50/40 transition">
                      {row.getVisibleCells().map(cell => (
                        <td key={cell.id} className="px-4 py-2.5 align-middle">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {table.getPageCount() > 1 && (
              <div className="p-4 border-t border-zinc-200 flex items-center justify-between bg-white rounded-b-xl">
                <span className="text-xs text-zinc-500 font-semibold">
                  Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
                </span>
                <div className="flex gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={() => table.previousPage()} 
                    disabled={!table.getCanPreviousPage()}
                    className="h-8 text-xs border-zinc-200"
                  >
                    Previous
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={() => table.nextPage()} 
                    disabled={!table.getCanNextPage()}
                    className="h-8 text-xs border-zinc-200"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="p-12 text-center text-zinc-400 text-xs font-semibold">
            No variants created yet. Define attributes and generate combinations above or click Add Row manually.
          </div>
        )}
      </div>
    </div>
  );
}
