"use client";

import { useState, useEffect, useMemo } from "react";
import { generateVariants, bulkUpsertVariants, getProductVariants, deleteVariant } from "@/app/actions/variants";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Trash2, Save, Wand2, X } from "lucide-react";
import toast from "react-hot-toast";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";

export default function ProductVariantsManager({ productId, basePrice, gstRate = 0, onDefaultSync }: { productId: string, basePrice: number, gstRate?: number, onDefaultSync?: (v: any) => void }) {
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
    
    setVariants(prev => [
      ...prev,
      {
        id: "",
        product_id: productId,
        sku: autoSku,
        sale_price: basePrice || 0,
        stock_quantity: 0,
        attributes: {},
        is_default: prev.length === 0,
        status: "ACTIVE"
      }
    ]);
  };

  const handleDeleteVariant = async (id: string, index: number) => {
    if (id) {
      const { success } = await deleteVariant(id);
      if (success) {
        toast.success("Variant deleted");
        fetchVariants();
      }
    } else {
      setVariants(prev => {
        const updated = [...prev];
        updated.splice(index, 1);
        return updated;
      });
    }
  };

  const columnHelper = createColumnHelper<any>();

  const columns = useMemo(() => [
    columnHelper.display({
      id: "variant_details",
      header: "Variant Details",
      cell: (info) => {
        const i = info.row.index;
        const v = info.row.original;
        const attrs = v.attributes || {};
        
        // Assume single attribute
        const attrKey = Object.keys(attrs)[0] || "Variant";
        const attrVal = attrs[attrKey] || "";

        const renameAttr = (oldKey: string, newKey: string) => {
          if (!newKey || oldKey === newKey) return;
          handleUpdateVariant(i, "attributes", { [newKey]: attrs[oldKey] || "" });
        };

        const updateAttrVal = (val: string) => {
          handleUpdateVariant(i, "attributes", { [attrKey]: val });
        };

        return (
          <div className="flex flex-col gap-2 min-w-[180px]">
            {/* Attribute row */}
            <div className="flex items-center gap-1 group">
              <input
                type="text"
                defaultValue={attrKey}
                onBlur={(e) => renameAttr(attrKey, e.target.value.trim())}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.currentTarget.blur();
                }}
                className="text-[10px] font-bold text-zinc-600 bg-zinc-100 px-1 py-1 rounded w-16 outline-none focus:ring-1 focus:ring-zinc-400"
                title={attrKey}
              />
              <input
                type="text"
                value={String(attrVal)}
                onChange={(e) => updateAttrVal(e.target.value)}
                className="flex-1 w-full border border-zinc-200 rounded text-[10px] px-2 py-1 outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400"
                placeholder="Value (e.g. 10 MM)"
              />
            </div>
            
            {/* SKU row */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold text-zinc-400 w-16 px-1 uppercase tracking-wider">SKU</span>
              <input
                type="text"
                value={v.sku || ""}
                onChange={e => handleUpdateVariant(i, 'sku', e.target.value)}
                className="flex-1 w-full border border-zinc-200 rounded text-[10px] px-2 py-1 outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400 text-zinc-600 font-mono"
                placeholder="SKU"
              />
            </div>
          </div>
        );
      }
    }),
    columnHelper.accessor("sale_price", {
      header: "Sale Price (Excl GST)",
      cell: (info) => {
        const i = info.row.index;
        const v = info.row.original;
        return (
          <input
            type="number"
            value={v.sale_price || ""}
            onChange={e => handleUpdateVariant(i, 'sale_price', Number(e.target.value))}
            className="w-24 border-zinc-200 rounded text-xs px-2 py-1"
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
            value={v.stock_quantity}
            onChange={e => handleUpdateVariant(i, 'stock_quantity', Number(e.target.value))}
            className="w-16 border-zinc-200 rounded text-xs px-2 py-1"
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
            />
          </div>
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
            <button type="button" onClick={() => handleDeleteVariant(v.id, i)} className="text-red-500 hover:bg-red-50 p-1.5 rounded">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      }
    })
  ], []);

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
    <div className="space-y-8">
      {/* Grid */}
      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-zinc-200 flex justify-between items-center bg-zinc-50">
          <h3 className="text-sm font-bold text-zinc-900">Manage Variants ({variants.length})</h3>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={handleAddVariant} disabled={saving} className="gap-2 h-8 text-xs">
              <Plus className="w-3.5 h-3.5" /> Add Row
            </Button>
            <Button type="button" onClick={handleSaveAll} disabled={saving || variants.length === 0} className="gap-2 h-8 text-xs">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save Changes
            </Button>
          </div>
        </div>
        {variants.length > 0 ? (
          <>
            <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 uppercase tracking-wider">
                {table.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map(header => (
                      <th key={header.id} className="px-4 py-3 font-semibold">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {table.getRowModel().rows.map(row => (
                  <tr key={row.id} className="hover:bg-zinc-50">
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} className="px-4 py-2">
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
              <span className="text-xs text-zinc-500 font-medium">
                Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
              </span>
              <div className="flex gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={() => table.previousPage()} 
                  disabled={!table.getCanPreviousPage()}
                  className="h-8 text-xs"
                >
                  Previous
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={() => table.nextPage()} 
                  disabled={!table.getCanNextPage()}
                  className="h-8 text-xs"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
          </>
        ) : (
          <div className="p-12 text-center text-zinc-500 text-sm font-medium">
            No variants created yet. Generate combinations above or add a row manually.
          </div>
        )}
      </div>
    </div>
  );
}
