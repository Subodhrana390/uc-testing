"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { Search, Loader2, Edit, Save, Trash2, SlidersHorizontal, RefreshCw, Image as ImageIcon } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import toast from "react-hot-toast";
import { createAdminClient as createClient } from "@/utils/supabase/admin-client";
import { cn } from "@/lib/utils";
import { Pagination } from "@/components/ui/pagination";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";

export default function VariantsPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState("All");

  // Edit state
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [saving, setSaving] = useState(false);

  const supabase = useMemo(() => createClient(), []);

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const { data: tableData = { items: [], count: 0 }, isLoading: tableLoading } = useQuery({
    queryKey: ["admin-variants-table", currentPage, pageSize, debouncedSearchQuery, statusFilter],
    queryFn: async () => {
      let q = supabase
        .from("product_variants")
        .select("*, products(name, images)", { count: "exact" });

      if (debouncedSearchQuery) {
        q = q.or(`sku.ilike.%${debouncedSearchQuery}%,products.name.ilike.%${debouncedSearchQuery}%`);
      }

      if (statusFilter !== "All") {
        q = q.eq("status", statusFilter.toUpperCase());
      }

      const start = (currentPage - 1) * pageSize;
      const end = start + pageSize - 1;

      const { data, count, error } = await q
        .order("created_at", { ascending: false })
        .range(start, end);

      if (error) throw error;
      return { items: data || [], count: count || 0 };
    },
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
  });

  const variants = tableData.items;
  const totalItems = tableData.count;

  const handleRefresh = useCallback(async () => {
    const toastId = toast.loading("Refreshing variants data...");
    try {
      await queryClient.invalidateQueries({ queryKey: ["admin-variants-table"] });
      toast.success("Variants refreshed successfully", { id: toastId });
    } catch (err) {
      toast.error("Failed to refresh variants data", { id: toastId });
    }
  }, [queryClient]);

  const updateVariantMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("product_variants")
        .update({
          sku: editForm.sku,
          name: editForm.name,
          price: editForm.price,
          stock_quantity: editForm.stock_quantity,
          status: editForm.status
        })
        .eq("id", editingVariantId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-variants-table"] });
      toast.success("Variant updated successfully!");
      setEditingVariantId(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update variant");
    },
    onSettled: () => {
      setSaving(false);
    }
  });

  const deleteVariantMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("product_variants").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-variants-table"] });
      toast.success("Variant deleted successfully!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete variant");
    }
  });

  const startEditing = (variant: any) => {
    setEditingVariantId(variant.id);
    setEditForm({
      sku: variant.sku,
      name: variant.name || "",
      price: variant.price,
      stock_quantity: variant.stock_quantity,
      status: variant.status
    });
  };

  const handleSave = () => {
    setSaving(true);
    updateVariantMutation.mutate();
  };

  const columnHelper = createColumnHelper<any>();

  const columns = useMemo(() => [
    columnHelper.accessor("products.name", {
      header: "Parent Product",
      cell: (info) => {
        const product = info.row.original.products;
        const productId = info.row.original.product_id;
        const image = product?.images?.[0];

        return (
          <Link prefetch={false} href={`/uc-admin-portal/products/${productId}`} className="flex items-center gap-3 font-semibold text-zinc-900 hover:text-primary transition-colors group">
            {image ? (
              <div className="relative w-10 h-10 rounded-md overflow-hidden bg-zinc-100 shrink-0 border border-zinc-200 group-hover:border-primary/30 transition-colors">
                <Image src={image} alt={product.name || "Product image"} fill className="object-cover" sizes="40px" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-md bg-zinc-50 border border-zinc-200 flex items-center justify-center shrink-0 group-hover:border-primary/30 transition-colors">
                <ImageIcon className="w-4 h-4 text-zinc-400" />
              </div>
            )}
            <span className="truncate max-w-[180px] block">{product?.name || "Unknown"}</span>
          </Link>
        );
      }
    }),
    columnHelper.accessor("sku", {
      header: "SKU",
      cell: (info) => {
        const variant = info.row.original;
        if (editingVariantId === variant.id) {
          return (
            <input
              type="text"
              value={editForm.sku}
              onChange={e => setEditForm({ ...editForm, sku: e.target.value })}
              className="w-full text-xs border border-zinc-300 rounded px-2 py-1"
            />
          );
        }
        return <span className="font-mono text-xs font-bold text-zinc-700">{variant.sku}</span>;
      }
    }),
    columnHelper.accessor("name", {
      header: "Variant Name",
      cell: (info) => {
        const variant = info.row.original;
        if (editingVariantId === variant.id) {
          return (
            <input
              type="text"
              value={editForm.name}
              onChange={e => setEditForm({ ...editForm, name: e.target.value })}
              className="w-full text-xs border border-zinc-300 rounded px-2 py-1 min-w-[150px]"
            />
          );
        }
        return <span className="text-xs font-bold text-zinc-700">{variant.name || "-"}</span>;
      }
    }),
    columnHelper.accessor("attributes", {
      header: "Attributes",
      cell: (info) => {
        const attr = info.row.original.attributes;
        return (
          <div className="flex flex-wrap gap-1">
            {Object.entries(attr || {}).map(([k, v]) => (
              <span key={k} className="bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded font-medium text-[10px]">
                {k}: {String(v)}
              </span>
            ))}
          </div>
        );
      }
    }),
    columnHelper.accessor("price", {
      header: "Price (₹)",
      cell: (info) => {
        const variant = info.row.original;
        if (editingVariantId === variant.id) {
          return (
            <input
              type="number"
              value={editForm.price}
              onChange={e => setEditForm({ ...editForm, price: Number(e.target.value) })}
              className="w-20 text-xs border border-zinc-300 rounded px-2 py-1"
            />
          );
        }
        return <span className="font-bold text-zinc-900">₹{variant.price}</span>;
      }
    }),
    columnHelper.accessor("stock_quantity", {
      header: "Stock",
      cell: (info) => {
        const variant = info.row.original;
        if (editingVariantId === variant.id) {
          return (
            <input
              type="number"
              value={editForm.stock_quantity}
              onChange={e => setEditForm({ ...editForm, stock_quantity: Number(e.target.value) })}
              className="w-16 text-xs border border-zinc-300 rounded px-2 py-1"
            />
          );
        }
        return (
          <span className={cn("px-2 py-1 rounded text-xs font-bold", variant.stock_quantity > 0 ? "bg-teal-50 text-teal-700" : "bg-red-50 text-red-700")}>
            {variant.stock_quantity}
          </span>
        );
      }
    }),
    columnHelper.display({
      id: "actions",
      header: "Actions",
      cell: (info) => {
        const variant = info.row.original;
        if (editingVariantId === variant.id) {
          return (
            <div className="flex gap-2">
              <button onClick={handleSave} disabled={saving} className="text-teal-600 hover:text-teal-800">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              </button>
              <button onClick={() => setEditingVariantId(null)} className="text-zinc-400 hover:text-zinc-600 text-xs font-bold">
                Cancel
              </button>
            </div>
          );
        }
        return (
          <div className="flex gap-2">
            <button onClick={() => startEditing(variant)} className="text-zinc-400 hover:text-orange-500 transition-colors">
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                if (confirm("Are you sure you want to delete this variant?")) {
                  deleteVariantMutation.mutate(variant.id);
                }
              }}
              className="text-zinc-400 hover:text-red-500 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        );
      }
    })
  ], [editingVariantId, editForm, saving]);

  const table = useReactTable({
    data: variants,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="space-y-6 w-full px-4 sm:px-6 lg:px-8 relative">
      {/* Banner */}
      <div className="bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500 rounded-3xl p-6 md:p-8 text-white shadow-lg relative overflow-hidden mb-8">
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight border-none p-0 !pl-0 before:hidden">Global Variants Manager</h1>
            <p className="text-sm font-medium text-orange-100 mt-1">
              View and manage all product variants across the entire catalog.
            </p>
          </div>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-zinc-100">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search by SKU or Product Name..."
              className="w-full pl-9 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select
            className="bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden relative">
        {tableLoading && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-10 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          </div>
        )}
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-zinc-50/80 border-b border-zinc-200">
                {table.getHeaderGroups().map(headerGroup =>
                  headerGroup.headers.map(header => (
                    <th key={header.id} className="px-6 py-4 font-bold text-zinc-500 uppercase tracking-wider text-xs whitespace-nowrap">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-6 py-12 text-center text-zinc-500 font-medium">
                    No variants found matching your filters.
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map(row => (
                  <tr key={row.id} className="hover:bg-zinc-50/50 transition-colors">
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} className="px-6 py-4 align-middle">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-zinc-100">
        <span className="text-xs font-semibold text-zinc-500">
          Showing {Math.min(variants.length, pageSize)} of {totalItems} variants
        </span>
        <Pagination
          currentPage={currentPage}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
}
