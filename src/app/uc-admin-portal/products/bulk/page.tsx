"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { createAdminClient as createClient } from "@/utils/supabase/admin-client";
import { ArrowLeft, UploadCloud, Download, Save, Loader2, AlertTriangle, FileSpreadsheet, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";

import { validateAndParseData, ParsedProduct } from "@/utils/bulk-upload";

export default function BulkUploadPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedProduct[]>([]);
  const [uploading, setUploading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const [catsRes, brandsRes] = await Promise.all([
        supabase.from("categories").select("id, name, igst_rate"),
        supabase.from("brands").select("id, name")
      ]);
      if (catsRes.data) setCategories(catsRes.data);
      if (brandsRes.data) setBrands(brandsRes.data);
      setLoading(false);
    }
    fetchData();
  }, [supabase]);

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^\w ]+/g, "")
      .replace(/ +/g, "-");
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        "Name": "Sample Product A",
        "SKU": "SMP-001",
        "Barcode": "1234567890123",
        "HSN Code": "8501",
        "Price": 1500,
        "Cost Price": 1000,
        "Sale Price": 1400,
        "Stock Quantity": 50,
        "Category": categories[0]?.name || "Chemicals",
        "Brand": brands[0]?.name || "Generic",
        "Unit": "pcs",
        "Status": "Active",
        "Short Description": "A simple sample product for reference.",
        "Long Description": "<p>A detailed long description.</p>",
        "Specification": "<ul><li>Spec 1</li><li>Spec 2</li></ul>",
        "Manufacturing Info": "Manufactured in India.",
        "Warranty Info": "1 Year Warranty.",
        "SEO Title": "Sample Product A - Best Price",
        "SEO Keywords": "sample, product, a",
        "SEO Description": "Buy Sample Product A online at the best price.",
        "Has Variants": "No"
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Products_Template");
    XLSX.writeFile(wb, "bulk_products_template.xlsx");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rawJson = XLSX.utils.sheet_to_json<any>(sheet);

        const parsed = validateAndParseData(rawJson, categories, brands);
        setParsedData(parsed);
        
        // Reset file input so same file can be uploaded again if needed
        if (fileInputRef.current) fileInputRef.current.value = '';
      } catch (error) {
        console.error("Error reading file:", error);
        toast.error("Failed to read the file. Please ensure it's a valid Excel or CSV.");
      }
    };

    reader.readAsBinaryString(selectedFile);
  };

  const handleBulkSubmit = async () => {
    const validProducts = parsedData.filter((p) => p._status === "valid");
    if (validProducts.length === 0) {
      toast.error("No valid products to upload.");
      return;
    }

    setUploading(true);
    const toastId = toast.loading(`Uploading ${validProducts.length} products...`);

    try {
      const inserts = validProducts.map(p => p._parsedData);
      
      const { error } = await supabase.from("products").insert(inserts);

      if (error) throw error;

      toast.success(`Successfully uploaded ${validProducts.length} products!`, { id: toastId });
      router.push("/uc-admin-portal/products");
    } catch (error: any) {
      console.error("Bulk upload error:", error);
      toast.error(error.message || "Failed to upload products", { id: toastId });
    } finally {
      setUploading(false);
    }
  };

  const validCount = parsedData.filter((p) => p._status === "valid").length;
  const invalidCount = parsedData.length - validCount;

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 text-[#18181b]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-6">
        <div className="flex items-center gap-4">
          <Link prefetch={false} href="/uc-admin-portal/products" className="p-2 border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-colors">
            <ArrowLeft className="w-5 h-5 text-zinc-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Bulk Upload Products</h1>
            <p className="text-zinc-500 text-sm font-medium mt-1">Add multiple products via Excel or CSV file.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadTemplate}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 text-zinc-700 rounded-xl hover:bg-zinc-50 transition-colors text-sm font-bold shadow-sm"
          >
            <Download className="w-4 h-4" />
            Download Template
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        </div>
      ) : (
        <div className="grid gap-6">
          {/* Upload Area */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-8 flex flex-col items-center justify-center text-center shadow-sm">
            <div className="w-16 h-16 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center mb-4">
              <UploadCloud className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-bold mb-2">Upload your spreadsheet</h2>
            <p className="text-zinc-500 text-sm mb-6 max-w-md">
              Ensure your file matches the template columns exactly. Categories and Brands must exist in the system beforehand.
            </p>
            <input
              type="file"
              accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileUpload}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-6 py-2.5 bg-zinc-900 text-white rounded-xl font-bold hover:bg-zinc-800 transition-colors shadow-sm"
            >
              Select File to Upload
            </button>
          </div>

          {/* Preview Section */}
          {parsedData.length > 0 && (
            <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
              <div className="p-5 border-b border-zinc-200 bg-zinc-50 flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <h3 className="font-bold flex items-center gap-2 text-lg">
                    <FileSpreadsheet className="w-5 h-5 text-orange-500" />
                    Data Preview
                  </h3>
                  <div className="flex items-center gap-3 text-sm font-semibold">
                    <span className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg">
                      <CheckCircle2 className="w-4 h-4" /> {validCount} Valid
                    </span>
                    {invalidCount > 0 && (
                      <span className="flex items-center gap-1.5 text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg">
                        <XCircle className="w-4 h-4" /> {invalidCount} Invalid
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={handleBulkSubmit}
                  disabled={uploading || validCount === 0}
                  className="flex items-center gap-2 px-5 py-2.5 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-700 transition-colors disabled:opacity-50 shadow-sm"
                >
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {uploading ? "Importing..." : `Import ${validCount} Valid Items`}
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-zinc-50/80 border-b border-zinc-200 text-zinc-500 text-xs uppercase tracking-wider font-bold">
                      <th className="px-4 py-3">Row</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Product Name</th>
                      <th className="px-4 py-3">SKU</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Brand</th>
                      <th className="px-4 py-3 text-right">Price (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {parsedData.map((row, i) => (
                      <tr key={i} className={row._status === "invalid" ? "bg-rose-50/30" : "hover:bg-zinc-50/50"}>
                        <td className="px-4 py-3 text-zinc-400 font-medium">{row._row_number}</td>
                        <td className="px-4 py-3">
                          {row._status === "valid" ? (
                            <span className="text-emerald-600 font-bold text-xs flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Ready
                            </span>
                          ) : (
                            <div className="group relative">
                              <span className="text-rose-600 font-bold text-xs flex items-center gap-1 cursor-help">
                                <AlertTriangle className="w-3.5 h-3.5" /> Error
                              </span>
                              <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-48 p-2 bg-zinc-900 text-white text-xs rounded-lg z-10 shadow-xl">
                                <ul className="list-disc pl-4">
                                  {row._errors?.map((err, errIdx) => (
                                    <li key={errIdx}>{err}</li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 font-semibold truncate max-w-[200px]" title={row.Name}>
                          {row.Name || <span className="text-zinc-300 italic">Missing</span>}
                        </td>
                        <td className="px-4 py-3 text-zinc-600 font-mono text-xs">{row.SKU || "-"}</td>
                        <td className="px-4 py-3 text-zinc-600">{row.Category || "-"}</td>
                        <td className="px-4 py-3 text-zinc-600">{row.Brand || "-"}</td>
                        <td className="px-4 py-3 text-zinc-900 font-bold text-right">{row.Price.toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
