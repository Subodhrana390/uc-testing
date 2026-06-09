"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  Truck,
  MapPin,
  Clock,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Settings2,
  Pencil,
  Trash2,
  Save,
  Loader2,
  Upload,
  Globe
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createAdminClient as createClient } from "@/utils/supabase/admin-client";
import toast from "react-hot-toast";
import LogoLoader from "@/components/ui/LogoLoader";
import { Pagination } from "@/components/ui/pagination";

// shadcn/ui components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export default function DeliveryManagementPage() {
  const [activeTab, setActiveTab] = useState("zones");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Supabase connection
  const supabase = useMemo(() => createClient(), []);

  // --- ZONES STATE ---
  const [zones, setZones] = useState<any[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [zoneToDelete, setZoneToDelete] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    estimate: "",
    status: "Standard",
    coverage: "",
    active: true,
    base_charge: 50
  });

  // --- PINCODES STATE ---
  const [pincodesCount, setPincodesCount] = useState(0);
  const [pincodeSearchQuery, setPincodeSearchQuery] = useState("");
  const [isPincodeDrawerOpen, setIsPincodeDrawerOpen] = useState(false);
  const [editingPincode, setEditingPincode] = useState<any>(null);
  const [pincodeToDelete, setPincodeToDelete] = useState<any>(null);
  const [pincodeCurrentPage, setPincodeCurrentPage] = useState(1);
  const [pincodePageSize, setPincodePageSize] = useState(10);
  const [isBulkPincodeDialogOpen, setIsBulkPincodeDialogOpen] = useState(false);
  const [pincodeFormData, setPincodeFormData] = useState({
    pincode: "",
    zone_id: "",
    estimate_override: "",
    active: true
  });
  const [bulkPincodeFormData, setBulkPincodeFormData] = useState({
    pincodesText: "",
    zone_id: "",
    estimate_override: ""
  });

  const [tablePincodes, setTablePincodes] = useState<any[]>([]);
  const [tablePincodesLoading, setTablePincodesLoading] = useState(true);
  const [totalPincodesItems, setTotalPincodesItems] = useState(0);
  const [debouncedPincodeSearchQuery, setDebouncedPincodeSearchQuery] = useState("");

  // --- CARRIERS STATE ---
  const [carriers, setCarriers] = useState<any[]>([]);
  const [isCarrierDrawerOpen, setIsCarrierDrawerOpen] = useState(false);
  const [editingCarrier, setEditingCarrier] = useState<any>(null);
  const [carrierToDelete, setCarrierToDelete] = useState<any>(null);
  const [carrierFormData, setCarrierFormData] = useState({
    name: "",
    code: "",
    api_endpoint: "",
    active: true
  });

  // --- SETTINGS STATE ---
  const [settings, setSettings] = useState({
    dispatch_cutoff: "14:00",
    same_day_processing: true,
    global_safety_buffer: 1,
    auto_refresh_interval: 4
  });
  const [savingSettings, setSavingSettings] = useState(false);

  // --- GENERAL FETCH ---
  const fetchAllData = async () => {
    try {
      // Fetch zones
      const { data: zonesData, error: zonesError } = await supabase
        .from("delivery_zones")
        .select("*")
        .order("created_at", { ascending: true });
      if (zonesError) throw zonesError;
      setZones(zonesData || []);

      // Fetch pincodes count
      const { count: pincodesCountVal, error: pincodesCountError } = await supabase
        .from("delivery_pincodes")
        .select("*", { count: "exact", head: true });
      if (pincodesCountError) throw pincodesCountError;
      setPincodesCount(pincodesCountVal || 0);

      // Fetch carriers
      const { data: carriersData, error: carriersError } = await supabase
        .from("delivery_carriers")
        .select("*")
        .order("name", { ascending: true });
      if (carriersError) throw carriersError;
      setCarriers(carriersData || []);

      // Fetch settings
      const { data: settingsData, error: settingsError } = await supabase
        .from("delivery_settings")
        .select("*");
      if (settingsError) throw settingsError;

      if (settingsData && settingsData.length > 0) {
        const settingsMap: any = { ...settings };
        settingsData.forEach((item: any) => {
          settingsMap[item.key] = item.value;
        });
        setSettings(settingsMap);
      }
    } catch (error) {
      console.error("Error loading delivery configuration:", error);
      toast.error("Failed to load delivery configuration");
    } finally {
      setLoading(false);
    }
  };

  const fetchTablePincodes = useCallback(async () => {
    setTablePincodesLoading(true);
    try {
      let q;
      if (debouncedPincodeSearchQuery) {
        q = supabase
          .from("delivery_pincodes")
          .select("*, delivery_zones!inner(name)", { count: "exact" })
          .or(`pincode.ilike.%${debouncedPincodeSearchQuery}%,estimate_override.ilike.%${debouncedPincodeSearchQuery}%,delivery_zones.name.ilike.%${debouncedPincodeSearchQuery}%`);
      } else {
        q = supabase
          .from("delivery_pincodes")
          .select("*, delivery_zones(name)", { count: "exact" });
      }

      const start = (pincodeCurrentPage - 1) * pincodePageSize;
      const end = start + pincodePageSize - 1;

      const { data, count, error } = await q
        .order("pincode", { ascending: true })
        .range(start, end);

      if (error) throw error;
      setTablePincodes(data || []);
      setTotalPincodesItems(count || 0);
    } catch (error) {
      console.error("Error fetching table pincodes:", error);
      toast.error("Failed to load pincodes exceptions");
    } finally {
      setTablePincodesLoading(false);
    }
  }, [supabase, pincodeCurrentPage, pincodePageSize, debouncedPincodeSearchQuery]);

  useEffect(() => {
    fetchAllData();
  }, [supabase]);

  useEffect(() => {
    fetchTablePincodes();
  }, [fetchTablePincodes]);

  // Debounce pincode search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedPincodeSearchQuery(pincodeSearchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [pincodeSearchQuery]);

  // Reset page to 1 when search query changes
  useEffect(() => {
    setPincodeCurrentPage(1);
  }, [debouncedPincodeSearchQuery]);

  // --- FILTERED LISTS ---
  const filteredZones = useMemo(() => {
    return zones.filter(z =>
      z.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      z.coverage.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (z.estimate || "").toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [zones, searchQuery]);


  // --- ZONES OPERATIONS ---
  const handleOpenDrawer = (zone?: any) => {
    if (zone) {
      setEditingZone(zone);
      setFormData({
        name: zone.name,
        estimate: zone.estimate,
        status: zone.status || "Standard",
        coverage: zone.coverage || "",
        active: zone.active !== false,
        base_charge: zone.base_charge || 50
      });
    } else {
      setEditingZone(null);
      setFormData({
        name: "",
        estimate: "",
        status: "Standard",
        coverage: "",
        active: true,
        base_charge: 50
      });
    }
    setIsDrawerOpen(true);
  };

  const handleZoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.estimate || !formData.coverage) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSaving(true);
    try {
      if (editingZone) {
        const { error } = await supabase
          .from("delivery_zones")
          .update(formData)
          .eq("id", editingZone.id);
        if (error) throw error;
        toast.success("Delivery zone updated successfully");
      } else {
        const { error } = await supabase
          .from("delivery_zones")
          .insert([formData]);
        if (error) throw error;
        toast.success("Delivery zone created successfully");
      }
      setIsDrawerOpen(false);
      fetchAllData();
    } catch (error: any) {
      toast.error(error.message || "Failed to save delivery zone");
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmZoneDelete = async () => {
    if (!zoneToDelete) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("delivery_zones")
        .delete()
        .eq("id", zoneToDelete.id);
      if (error) throw error;
      toast.success("Delivery zone deleted successfully");
      setZoneToDelete(null);
      fetchAllData();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete zone");
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleZoneActive = async (zone: any) => {
    try {
      const { error } = await supabase
        .from("delivery_zones")
        .update({ active: !zone.active })
        .eq("id", zone.id);
      if (error) throw error;
      toast.success(`Zone ${zone.active ? 'deactivated' : 'activated'}`);
      fetchAllData();
    } catch (error: any) {
      toast.error(error.message || "Failed to update zone status");
    }
  };


  // --- PINCODES OPERATIONS ---
  const handleOpenPincodeDrawer = (pincodeItem?: any) => {
    if (pincodeItem) {
      setEditingPincode(pincodeItem);
      setPincodeFormData({
        pincode: pincodeItem.pincode,
        zone_id: pincodeItem.zone_id || "",
        estimate_override: pincodeItem.estimate_override || "",
        active: pincodeItem.active !== false
      });
    } else {
      setEditingPincode(null);
      setPincodeFormData({
        pincode: "",
        zone_id: zones[0]?.id || "",
        estimate_override: "",
        active: true
      });
    }
    setIsPincodeDrawerOpen(true);
  };

  const handlePincodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pincodeFormData.pincode || !pincodeFormData.zone_id) {
      toast.error("Please fill in pincode and select a delivery zone");
      return;
    }
    setSaving(true);
    try {
      if (editingPincode) {
        const { error } = await supabase
          .from("delivery_pincodes")
          .update({
            pincode: pincodeFormData.pincode,
            zone_id: pincodeFormData.zone_id,
            estimate_override: pincodeFormData.estimate_override || null,
            active: pincodeFormData.active
          })
          .eq("id", editingPincode.id);
        if (error) throw error;
        toast.success("Pincode override updated");
      } else {
        const { error } = await supabase
          .from("delivery_pincodes")
          .insert([{
            pincode: pincodeFormData.pincode,
            zone_id: pincodeFormData.zone_id,
            estimate_override: pincodeFormData.estimate_override || null,
            active: pincodeFormData.active
          }]);
        if (error) throw error;
        toast.success("Pincode override created");
      }
      setIsPincodeDrawerOpen(false);
      fetchAllData();
      fetchTablePincodes();
    } catch (error: any) {
      toast.error(error.message || "Failed to save pincode override");
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmPincodeDelete = async () => {
    if (!pincodeToDelete) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("delivery_pincodes")
        .delete()
        .eq("id", pincodeToDelete.id);
      if (error) throw error;
      toast.success("Pincode override deleted");
      setPincodeToDelete(null);
      fetchAllData();
      fetchTablePincodes();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete pincode override");
    } finally {
      setDeleting(false);
    }
  };

  const handleTogglePincodeActive = async (pincodeItem: any) => {
    try {
      const { error } = await supabase
        .from("delivery_pincodes")
        .update({ active: !pincodeItem.active })
        .eq("id", pincodeItem.id);
      if (error) throw error;
      toast.success(`Pincode ${pincodeItem.active ? 'deactivated' : 'activated'}`);
      fetchAllData();
      fetchTablePincodes();
    } catch (error: any) {
      toast.error(error.message || "Failed to update pincode status");
    }
  };

  const handleBulkPincodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkPincodeFormData.pincodesText || !bulkPincodeFormData.zone_id) {
      toast.error("Please enter pincodes and select a delivery zone");
      return;
    }
    setSaving(true);
    try {
      const codes = bulkPincodeFormData.pincodesText
        .split(/[,\n\s]+/)
        .map(code => code.trim().replace(/\D/g, ""))
        .filter(code => code.length > 0);

      if (codes.length === 0) {
        toast.error("No valid pincodes detected");
        setSaving(false);
        return;
      }

      const inserts = codes.map(code => ({
        pincode: code,
        zone_id: bulkPincodeFormData.zone_id,
        estimate_override: bulkPincodeFormData.estimate_override || null,
        active: true
      }));

      const { error } = await supabase
        .from("delivery_pincodes")
        .upsert(inserts, { onConflict: "pincode" });

      if (error) throw error;

      toast.success(`Successfully mapped ${codes.length} pincodes`);
      setIsBulkPincodeDialogOpen(false);
      setBulkPincodeFormData({ pincodesText: "", zone_id: "", estimate_override: "" });
      fetchAllData();
      fetchTablePincodes();
    } catch (error: any) {
      toast.error(error.message || "Failed to bulk import pincodes");
    } finally {
      setSaving(false);
    }
  };


  // --- CARRIERS OPERATIONS ---
  const handleOpenCarrierDrawer = (carrier?: any) => {
    if (carrier) {
      setEditingCarrier(carrier);
      setCarrierFormData({
        name: carrier.name,
        code: carrier.code,
        api_endpoint: carrier.api_endpoint || "",
        active: carrier.active !== false
      });
    } else {
      setEditingCarrier(null);
      setCarrierFormData({
        name: "",
        code: "",
        api_endpoint: "",
        active: true
      });
    }
    setIsCarrierDrawerOpen(true);
  };

  const handleCarrierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!carrierFormData.name || !carrierFormData.code) {
      toast.error("Name and code are required");
      return;
    }

    setSaving(true);
    try {
      if (editingCarrier) {
        const { error } = await supabase
          .from("delivery_carriers")
          .update({
            name: carrierFormData.name,
            code: carrierFormData.code.toLowerCase().trim(),
            api_endpoint: carrierFormData.api_endpoint || null,
            active: carrierFormData.active
          })
          .eq("id", editingCarrier.id);
        if (error) throw error;
        toast.success("Carrier updated successfully");
      } else {
        const { error } = await supabase
          .from("delivery_carriers")
          .insert([{
            name: carrierFormData.name,
            code: carrierFormData.code.toLowerCase().trim(),
            api_endpoint: carrierFormData.api_endpoint || null,
            active: carrierFormData.active
          }]);
        if (error) throw error;
        toast.success("Carrier registered successfully");
      }
      setIsCarrierDrawerOpen(false);
      fetchAllData();
    } catch (error: any) {
      toast.error(error.message || "Failed to save carrier");
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmCarrierDelete = async () => {
    if (!carrierToDelete) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("delivery_carriers")
        .delete()
        .eq("id", carrierToDelete.id);
      if (error) throw error;
      toast.success("Carrier credentials removed");
      setCarrierToDelete(null);
      fetchAllData();
    } catch (error: any) {
      toast.error(error.message || "Failed to remove carrier");
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleCarrierActive = async (carrier: any) => {
    try {
      const { error } = await supabase
        .from("delivery_carriers")
        .update({ active: !carrier.active })
        .eq("id", carrier.id);
      if (error) throw error;
      toast.success(`Carrier ${carrier.active ? 'deactivated' : 'activated'}`);
      fetchAllData();
    } catch (error: any) {
      toast.error(error.message || "Failed to update carrier status");
    }
  };


  // --- SETTINGS OPERATIONS ---
  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const promises = Object.entries(settings).map(([key, val]) =>
        supabase
          .from("delivery_settings")
          .upsert({ key, value: val }, { onConflict: "key" })
      );

      const results = await Promise.all(promises);
      const errors = results.filter(r => r.error).map(r => r.error);

      if (errors.length > 0) {
        throw errors[0];
      }

      toast.success("Operational settings updated successfully");
      fetchAllData();
    } catch (error: any) {
      toast.error(error.message || "Failed to save settings");
    } finally {
      setSavingSettings(false);
    }
  };


  // --- STYLING HELPERS ---
  const getBadgeStyle = (status: string) => {
    const base = "text-[9px] font-bold px-2.5 py-1 border uppercase tracking-wider rounded-full flex items-center gap-1.5 w-fit";
    switch (status.toLowerCase()) {
      case "express":
        return `${base} bg-indigo-500/8 text-indigo-700 border-indigo-500/15`;
      case "priority":
        return `${base} bg-blue-500/8 text-blue-700 border-blue-500/15`;
      case "standard":
        return `${base} bg-emerald-500/8 text-emerald-700 border-emerald-500/15`;
      default:
        return `${base} bg-zinc-500/8 text-zinc-700 border-zinc-500/15`;
    }
  };

  if (loading) {
    return <LogoLoader text="Loading delivery configurations..." />;
  }

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto w-full px-2 lg:px-4">
      {/* Rose Gradient Banner */}
      <div className="bg-gradient-to-r from-rose-600 via-pink-600 to-rose-500 rounded-3xl p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
        {/* Subtle decorative glows */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl pointer-events-none" />

        {/* Header System */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 relative z-10">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight border-none p-0 !pl-0 before:hidden">Delivery & Logistics</h1>
            <p className="text-sm font-medium text-rose-100 mt-1">
              Configure delivery zones, track shipment metrics, and establish transit rules.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {activeTab === "zones" && (
              <button
                onClick={() => handleOpenDrawer()}
                className="inline-flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 text-white active:scale-95 transition-all text-xs font-bold px-5 py-3.5 rounded-xl border border-white/10 shadow-sm"
              >
                <Plus className="w-4 h-4" /> Add Zone
              </button>
            )}
            {activeTab === "pincodes" && (
              <div className="flex gap-2">
                <button
                  onClick={() => setIsBulkPincodeDialogOpen(true)}
                  className="inline-flex items-center justify-center gap-2 bg-white/10 border border-white/20 text-white hover:bg-white/20 active:scale-95 transition-all text-xs font-bold px-5 py-3.5 rounded-xl shadow-sm"
                >
                  <Upload className="w-4 h-4" /> Bulk Map
                </button>
                <button
                  onClick={() => handleOpenPincodeDrawer()}
                  className="inline-flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 text-white active:scale-95 transition-all text-xs font-bold px-5 py-3.5 rounded-xl border border-white/10 shadow-sm"
                >
                  <Plus className="w-4 h-4" /> Add Override
                </button>
              </div>
            )}
            {activeTab === "carriers" && (
              <button
                onClick={() => handleOpenCarrierDrawer()}
                className="inline-flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 text-white active:scale-95 transition-all text-xs font-bold px-5 py-3.5 rounded-xl border border-white/10 shadow-sm"
              >
                <Plus className="w-4 h-4" /> Add Carrier
              </button>
            )}
          </div>
        </div>

        {/* Stats Quick Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
          {[
            { label: "Active Zones", value: String(zones.filter(z => z.active).length).padStart(2, "0"), icon: <MapPin className="w-5 h-5" />, tag: "Fulfillment active" },
            { label: "Pincode Exceptions", value: String(pincodesCount).padStart(2, "0"), icon: <Globe className="w-5 h-5" />, tag: "Custom rules active" },
            { label: "Logistics Carriers", value: String(carriers.length).padStart(2, "0"), icon: <Truck className="w-5 h-5" />, tag: "Integrated networks" }
          ].map((c, i) => (
            <div key={i} className="p-5 rounded-2xl border border-white/10 flex items-center justify-between shadow-sm relative overflow-hidden bg-white/10 text-white">
              <div>
                <span className="text-[11px] font-bold text-white/70 uppercase tracking-wider">{c.label}</span>
                <h2 className="text-3xl font-black mt-1.5 tracking-tight text-white">{c.value}</h2>
                <span className="text-[10px] font-semibold text-white/60 mt-1.5 block">{c.tag}</span>
              </div>
              <div className="w-12 h-12 rounded-xl border border-white/15 flex items-center justify-center shadow-sm flex-shrink-0 bg-white/10 text-white">
                {c.icon}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content Area Container */}
      <div className="bg-white border border-zinc-100 shadow-sm rounded-3xl overflow-hidden">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-zinc-100 p-6 bg-zinc-50/15">
          {[
            { id: "zones", label: "Zones" },
            { id: "pincodes", label: "Pincodes Override" },
            { id: "carriers", label: "Carriers" },
            { id: "settings", label: "Operational Settings" }
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "px-4 py-2 text-xs font-bold rounded-lg transition-all border uppercase tracking-wider",
                  isActive
                    ? "bg-zinc-950 text-white border-zinc-950 shadow-sm"
                    : "bg-white text-zinc-500 border-zinc-200/80 hover:text-zinc-800 hover:border-zinc-300"
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Body */}
        <div className="p-6">
          {/* ZONES TAB */}
          {activeTab === "zones" && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row gap-4 items-center mb-2">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-4.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Search delivery zones, local hubs, or pincode mappings..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 h-12 bg-white border border-zinc-200/85 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-zinc-950/5 focus:border-zinc-400 transition-all placeholder:text-zinc-400"
                  />
                </div>
              </div>

              <div className="grid gap-4">
                {filteredZones.map((zone) => (
                  <div key={zone.id} className="p-5 border border-zinc-150 rounded-2xl hover:bg-zinc-50/10 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-zinc-50 border border-zinc-200/60 rounded-xl flex items-center justify-center text-zinc-450">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-zinc-900 tracking-tight">{zone.name}</h4>
                        <p className="text-[10px] font-semibold text-zinc-400 mt-1 flex items-center gap-1.5">
                          Coverage Prefix: <span className="text-zinc-650 font-bold">{zone.coverage}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-6 md:gap-12 ml-0 md:ml-auto">
                      <div className="min-w-[100px]">
                        <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-0.5">Est. Transit</p>
                        <p className="text-xs font-bold text-zinc-800">{zone.estimate}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1.5">Logistics Mode</p>
                        <span className={getBadgeStyle(zone.status)}>
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                          {zone.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleToggleZoneActive(zone)}
                          className={cn(
                            "px-2.5 py-1 text-xs font-medium rounded-lg border transition-all mr-2",
                            zone.active
                              ? "bg-teal-50 text-teal-700 border-teal-100"
                              : "bg-zinc-100 text-zinc-500 border-zinc-200"
                          )}
                        >
                          {zone.active ? "Active" : "Disabled"}
                        </button>
                        <button
                          onClick={() => handleOpenDrawer(zone)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-100 transition-all text-zinc-400 hover:text-zinc-700"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setZoneToDelete(zone)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-100 transition-all text-rose-450 hover:text-rose-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {filteredZones.length === 0 && (
                  <div className="py-20 text-center flex flex-col items-center justify-center space-y-4">
                    <div className="w-16 h-16 bg-zinc-50 border border-zinc-100 flex items-center justify-center rounded-2xl text-zinc-300">
                      <Truck className="w-8 h-8" />
                    </div>
                    <div className="max-w-xs">
                      <p className="text-base font-bold text-zinc-900 tracking-tight">No Zones Found</p>
                      <p className="text-xs font-medium text-zinc-500 mt-1 leading-relaxed">No delivery zones match your search query.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PINCODES OVERRIDE TAB */}
          {activeTab === "pincodes" && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row gap-4 items-center mb-2">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-4.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Search exceptions by pincode, override description, or zone..."
                    value={pincodeSearchQuery}
                    onChange={(e) => setPincodeSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 h-12 bg-white border border-zinc-200/85 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-zinc-950/5 focus:border-zinc-400 transition-all placeholder:text-zinc-400"
                  />
                </div>
              </div>

              <div className="grid gap-4">
                {tablePincodesLoading ? (
                  <div className="py-20 text-center flex flex-col items-center justify-center gap-2 text-zinc-500">
                    <Loader2 className="w-6 h-6 animate-spin text-rose-500" />
                    <p className="text-xs font-semibold">Loading pincode overrides...</p>
                  </div>
                ) : tablePincodes.length === 0 ? (
                  <div className="py-20 text-center flex flex-col items-center justify-center space-y-4">
                    <div className="w-16 h-16 bg-zinc-50 border border-zinc-100 flex items-center justify-center rounded-2xl text-zinc-300">
                      <Globe className="w-8 h-8" />
                    </div>
                    <div className="max-w-xs">
                      <p className="text-base font-bold text-zinc-900 tracking-tight">No Custom Overrides</p>
                      <p className="text-xs font-medium text-zinc-500 mt-1 leading-relaxed">No pincode exceptions found. All pincodes utilize defaults from global zones.</p>
                    </div>
                  </div>
                ) : (
                  tablePincodes.map((item) => (
                    <div key={item.id} className="p-5 border border-zinc-150 rounded-2xl hover:bg-zinc-50/10 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-zinc-50 border border-zinc-200/60 rounded-xl flex items-center justify-center text-zinc-455">
                          <Globe className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-zinc-900 tracking-tight">Pincode: {item.pincode}</h4>
                          <p className="text-[10px] font-semibold text-zinc-400 mt-1 flex items-center gap-1.5">
                            Mapped Zone: <span className="text-zinc-700 font-bold">{item.delivery_zones?.name || "None"}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-6 md:gap-12 ml-0 md:ml-auto">
                        <div className="min-w-[100px]">
                          <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-0.5">Custom Override</p>
                          <p className="text-xs font-bold text-zinc-800">{item.estimate_override || "Using Zone Default"}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleTogglePincodeActive(item)}
                            className={cn(
                              "px-2.5 py-1 text-xs font-medium rounded-lg border transition-all mr-2",
                              item.active
                                ? "bg-teal-50 text-teal-700 border-teal-100"
                                : "bg-zinc-100 text-zinc-500 border-zinc-200"
                            )}
                          >
                            {item.active ? "Active" : "Disabled"}
                          </button>
                          <button
                            onClick={() => handleOpenPincodeDrawer(item)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-100 transition-all text-zinc-400 hover:text-zinc-700"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setPincodeToDelete(item)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-100 transition-all text-rose-450 hover:text-rose-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {!tablePincodesLoading && totalPincodesItems > 0 && (
                <div className="mt-6 border border-zinc-150 rounded-2xl overflow-hidden bg-white">
                  <Pagination
                    currentPage={pincodeCurrentPage}
                    totalItems={totalPincodesItems}
                    pageSize={pincodePageSize}
                    onPageChange={setPincodeCurrentPage}
                    onPageSizeChange={setPincodePageSize}
                    variantColor="rose"
                  />
                </div>
              )}
            </div>
          )}

          {/* CARRIERS TAB */}
          {activeTab === "carriers" && (
            <div className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {carriers.map((carrier) => (
                  <div key={carrier.id} className="p-6 border border-zinc-150 rounded-2xl bg-white shadow-sm flex flex-col justify-between min-h-[160px] hover:border-zinc-300 transition-all">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest font-mono">
                          API CODE: {carrier.code}
                        </span>
                        <button
                          onClick={() => handleToggleCarrierActive(carrier)}
                          className={cn(
                            "px-2 py-0.5 text-[10px] font-bold rounded border uppercase tracking-wider transition-all",
                            carrier.active
                              ? "bg-teal-50 text-teal-700 border-teal-100"
                              : "bg-zinc-100 text-zinc-500 border-zinc-200"
                          )}
                        >
                          {carrier.active ? "Online" : "Offline"}
                        </button>
                      </div>
                      <h4 className="text-base font-bold text-zinc-900 tracking-tight flex items-center gap-2">
                        <Truck className="w-4 h-4 text-zinc-500" />
                        {carrier.name}
                      </h4>
                      <p className="text-[10px] text-zinc-400 font-bold truncate mt-2 font-mono bg-zinc-50 p-2 rounded-lg border border-zinc-200/50">
                        Endpoint: {carrier.api_endpoint || "Direct tracking disabled"}
                      </p>
                    </div>

                    <div className="flex items-center justify-end gap-2 mt-5 pt-3 border-t border-zinc-100">
                      <button
                        onClick={() => handleOpenCarrierDrawer(carrier)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-100 border border-zinc-150 transition-all text-zinc-500 hover:text-zinc-800"
                        title="Edit credentials"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setCarrierToDelete(carrier)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-100 border border-zinc-150 transition-all text-rose-500 hover:text-rose-700"
                        title="Delete partner"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}

                {carriers.length === 0 && (
                  <div className="py-20 text-center col-span-full flex flex-col items-center justify-center space-y-4">
                    <div className="w-16 h-16 bg-zinc-50 border border-zinc-100 flex items-center justify-center rounded-2xl text-zinc-300">
                      <Truck className="w-8 h-8" />
                    </div>
                    <div className="max-w-xs">
                      <p className="text-base font-bold text-zinc-900 tracking-tight">No Carrier Credentials</p>
                      <p className="text-xs font-medium text-zinc-500 mt-1 leading-relaxed">Logistics partner connections are empty. Add bluedart or delhivery API keys to get started.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SETTINGS TAB */}
          {activeTab === "settings" && (
            <Card className="border border-zinc-150 shadow-sm rounded-2xl max-w-2xl mx-auto py-2">
              <CardContent className="p-6 space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-zinc-900 tracking-tight">Global Operational Settings</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">Modify dispatch cutoff hours and processing limits globally.</p>
                </div>

                <div className="space-y-4 pt-2 border-t border-zinc-100">
                  {/* Dispatch Cutoff */}
                  <div className="space-y-2">
                    <Label htmlFor="dispatch_cutoff" className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                      Fulfillment Cutoff Hour
                    </Label>
                    <Input
                      id="dispatch_cutoff"
                      type="text"
                      className="h-11 border-zinc-200 rounded-xl text-sm font-semibold"
                      value={settings.dispatch_cutoff}
                      onChange={(e) => setSettings({ ...settings, dispatch_cutoff: e.target.value })}
                      placeholder="e.g. 14:00"
                      required
                    />
                    <p className="text-[10px] text-zinc-400 leading-normal">
                      Order placement threshold for same-day dispatch. Format: 24-hour HH:MM (e.g. 14:00 represent 2:00 PM).
                    </p>
                  </div>

                  {/* Safety Buffer */}
                  <div className="space-y-2">
                    <Label htmlFor="global_safety_buffer" className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                      Global Transit Safety Buffer (Days)
                    </Label>
                    <Input
                      id="global_safety_buffer"
                      type="number"
                      min={0}
                      className="h-11 border-zinc-200 rounded-xl text-sm font-semibold"
                      value={settings.global_safety_buffer}
                      onChange={(e) => setSettings({ ...settings, global_safety_buffer: parseInt(e.target.value) || 0 })}
                      placeholder="e.g. 1"
                      required
                    />
                    <p className="text-[10px] text-zinc-400 leading-normal">
                      Extra calendar days dynamically appended to storefront estimation widgets to cover courier holidays.
                    </p>
                  </div>

                  {/* Refresh Rate */}
                  <div className="space-y-2">
                    <Label htmlFor="auto_refresh_interval" className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                      Logistics API Auto-Refresh Rate (Hours)
                    </Label>
                    <Input
                      id="auto_refresh_interval"
                      type="number"
                      min={1}
                      className="h-11 border-zinc-200 rounded-xl text-sm font-semibold"
                      value={settings.auto_refresh_interval}
                      onChange={(e) => setSettings({ ...settings, auto_refresh_interval: parseInt(e.target.value) || 4 })}
                      placeholder="e.g. 4"
                      required
                    />
                    <p className="text-[10px] text-zinc-400 leading-normal">
                      Determine how frequently backend workers query Delhivery/Bluedart webhooks to sync active trackings.
                    </p>
                  </div>

                  {/* Same-day Dispatch Switch */}
                  <div className="flex items-center justify-between p-4 bg-zinc-50/50 border border-zinc-150 rounded-xl mt-4">
                    <div className="space-y-0.5">
                      <Label htmlFor="same_day_processing" className="text-sm font-medium text-zinc-800">Same-Day Processing</Label>
                      <p className="text-xs text-zinc-400 leading-normal">Allow same-day dispatch estimations during checkout hours</p>
                    </div>
                    <Switch
                      id="same_day_processing"
                      checked={settings.same_day_processing}
                      onCheckedChange={(checked) => setSettings({ ...settings, same_day_processing: checked })}
                      className="data-[state=checked]:bg-teal-600"
                    />
                  </div>

                  {/* Action Button */}
                  <div className="pt-4 flex justify-end">
                    <Button
                      onClick={handleSaveSettings}
                      disabled={savingSettings}
                      className="bg-zinc-950 hover:bg-zinc-850 text-white rounded-xl h-11 px-6 text-xs font-bold uppercase tracking-wider flex items-center gap-2"
                    >
                      {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Save Configurations
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Operational Cutoff Details Banner */}
      <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 text-white rounded-3xl p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full -mr-32 -mt-32 blur-3xl" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div>
            <h3 className="text-xl font-bold tracking-tight">Fulfillment Protocols</h3>
            <p className="text-zinc-400 text-xs font-medium mt-1">Operational standards for dispatching, buffer limits, and courier API configurations.</p>
          </div>
          <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
            <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-3">
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-indigo-400">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[9px] font-black uppercase text-zinc-455">Active Cutoff</p>
                <p className="text-sm font-bold mt-0.5">{settings.dispatch_cutoff}</p>
              </div>
            </div>
            <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-3">
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[9px] font-black uppercase text-zinc-455">Same Day status</p>
                <p className="text-sm font-bold mt-0.5">{settings.same_day_processing ? "Active" : "Paused"}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================
          DRAWER SHEETS & POPUP DIALOGS PANEL SECTION
         ======================================================== */}

      {/* --- ZONES SHEET PANEL --- */}
      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent className="w-full sm:max-w-lg bg-white rounded-l-2xl border-l border-zinc-100 p-0 flex flex-col overflow-hidden text-zinc-900">
          <SheetHeader className="p-6 border-b border-zinc-100 bg-zinc-50/30">
            <SheetTitle className="text-lg font-bold text-zinc-800">
              {editingZone ? "Edit Delivery Zone" : "New Delivery Zone"}
            </SheetTitle>
            <SheetDescription className="text-xs text-zinc-500 mt-0.5">
              Specify coverage parameters, estimated transit times, and logistics modes.
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleZoneSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="zone-name" className="text-xs font-medium text-zinc-500">Zone Name</Label>
              <Input
                id="zone-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="h-11 border-zinc-200 rounded-xl text-sm focus-visible:ring-1 focus-visible:ring-teal-600"
                placeholder=" Punjab & Chandigarh (Local)"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="zone-estimate" className="text-xs font-medium text-zinc-500">Estimated Transit</Label>
              <Input
                id="zone-estimate"
                value={formData.estimate}
                onChange={(e) => setFormData({ ...formData, estimate: e.target.value })}
                className="h-11 border-zinc-200 rounded-xl text-sm focus-visible:ring-1 focus-visible:ring-teal-600"
                placeholder="e.g. 24-48 Hours"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="zone-base-charge" className="text-xs font-medium text-zinc-500">Base Shipping Charge (₹)</Label>
              <Input
                id="zone-base-charge"
                type="number"
                min="0"
                value={formData.base_charge}
                onChange={(e) => setFormData({ ...formData, base_charge: Number(e.target.value) })}
                className="h-11 border-zinc-200 rounded-xl text-sm focus-visible:ring-1 focus-visible:ring-teal-600"
                placeholder="e.g. 50"
                required
              />
              <p className="text-[10px] text-zinc-400 mt-1 leading-relaxed">
                The standard shipping cost for this zone.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="zone-coverage" className="text-xs font-medium text-zinc-500">Coverage Prefix Mappings</Label>
              <Input
                id="zone-coverage"
                value={formData.coverage}
                onChange={(e) => setFormData({ ...formData, coverage: e.target.value })}
                className="h-11 border-zinc-200 rounded-xl text-sm focus-visible:ring-1 focus-visible:ring-teal-600"
                placeholder="e.g. 14, 15, 16"
                required
              />
              <p className="text-[10px] text-zinc-400 mt-1 leading-relaxed">
                Enter the first 2 digits of eligible Indian pincodes (e.g. `14` matches `140001` to `149999`). Use `Pan India` for global fallback coverage.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="zone-status" className="text-xs font-medium text-zinc-500">Logistics Mode</Label>
              <select
                id="zone-status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full h-11 px-3 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-teal-600 bg-white"
              >
                <option value="Standard">Standard</option>
                <option value="Express">Express</option>
                <option value="Priority">Priority</option>
              </select>
            </div>

            <div className="flex items-center justify-between p-4 bg-zinc-50/50 border border-zinc-100 rounded-xl">
              <div className="space-y-0.5">
                <Label htmlFor="zone-active" className="text-sm font-medium text-zinc-800">Fulfillment Active</Label>
                <p className="text-xs text-zinc-400">Determine whether logistics mapping is live for checkouts</p>
              </div>
              <Switch
                id="zone-active"
                checked={formData.active}
                onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                className="data-[state=checked]:bg-teal-600"
              />
            </div>
          </form>

          <div className="p-6 border-t border-zinc-150/40 bg-zinc-50/30">
            <Button
              disabled={saving}
              onClick={handleZoneSubmit}
              className="w-full bg-zinc-900 hover:bg-zinc-800 text-white h-11 rounded-xl text-sm font-medium transition-all shadow-sm gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Delivery Zone
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* --- PINCODE SHEET OVERRIDE --- */}
      <Sheet open={isPincodeDrawerOpen} onOpenChange={setIsPincodeDrawerOpen}>
        <SheetContent className="w-full sm:max-w-lg bg-white rounded-l-2xl border-l border-zinc-100 p-0 flex flex-col overflow-hidden text-zinc-900">
          <SheetHeader className="p-6 border-b border-zinc-100 bg-zinc-50/30">
            <SheetTitle className="text-lg font-bold text-zinc-800">
              {editingPincode ? "Edit Pincode Override" : "New Pincode Override"}
            </SheetTitle>
            <SheetDescription className="text-xs text-zinc-500 mt-0.5">
              Specify a specific pincode exception details to lock shipping times or map to a custom zone.
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handlePincodeSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="pincode-val" className="text-xs font-medium text-zinc-500">Pincode</Label>
              <Input
                id="pincode-val"
                maxLength={6}
                value={pincodeFormData.pincode}
                onChange={(e) => setPincodeFormData({ ...pincodeFormData, pincode: e.target.value.replace(/\D/g, "") })}
                className="h-11 border-zinc-200 rounded-xl text-sm focus-visible:ring-1 focus-visible:ring-teal-600"
                placeholder="e.g. 140001"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pincode-zone" className="text-xs font-medium text-zinc-500">Delivery Zone Mapping</Label>
              <select
                id="pincode-zone"
                value={pincodeFormData.zone_id}
                onChange={(e) => setPincodeFormData({ ...pincodeFormData, zone_id: e.target.value })}
                className="w-full h-11 px-3 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-teal-600 bg-white"
                required
              >
                <option value="" disabled>Select Zone</option>
                {zones.map((zone) => (
                  <option key={zone.id} value={zone.id}>{zone.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pincode-override" className="text-xs font-medium text-zinc-500">Custom Estimated Transit (Optional)</Label>
              <Input
                id="pincode-override"
                value={pincodeFormData.estimate_override}
                onChange={(e) => setPincodeFormData({ ...pincodeFormData, estimate_override: e.target.value })}
                className="h-11 border-zinc-200 rounded-xl text-sm focus-visible:ring-1 focus-visible:ring-teal-600"
                placeholder="e.g. 12 Hours or Same Day"
              />
              <p className="text-[10px] text-zinc-400 mt-1 leading-normal">
                Leave empty to inherit standard estimated timeline from the selected Zone.
              </p>
            </div>

            <div className="flex items-center justify-between p-4 bg-zinc-50/50 border border-zinc-100 rounded-xl">
              <div className="space-y-0.5">
                <Label htmlFor="pincode-active" className="text-sm font-medium text-zinc-800">Rule Active</Label>
                <p className="text-xs text-zinc-400">Determine whether this override is active during checkouts</p>
              </div>
              <Switch
                id="pincode-active"
                checked={pincodeFormData.active}
                onCheckedChange={(checked) => setPincodeFormData({ ...pincodeFormData, active: checked })}
                className="data-[state=checked]:bg-teal-600"
              />
            </div>
          </form>

          <div className="p-6 border-t border-zinc-150/40 bg-zinc-50/30">
            <Button
              disabled={saving}
              onClick={handlePincodeSubmit}
              className="w-full bg-zinc-900 hover:bg-zinc-800 text-white h-11 rounded-xl text-sm font-medium transition-all shadow-sm gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Pincode Rule
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* --- CARRIERS SHEET --- */}
      <Sheet open={isCarrierDrawerOpen} onOpenChange={setIsCarrierDrawerOpen}>
        <SheetContent className="w-full sm:max-w-lg bg-white rounded-l-2xl border-l border-zinc-100 p-0 flex flex-col overflow-hidden text-zinc-900">
          <SheetHeader className="p-6 border-b border-zinc-100 bg-zinc-50/30">
            <SheetTitle className="text-lg font-bold text-zinc-800">
              {editingCarrier ? "Edit Carrier Credentials" : "New Carrier Integration"}
            </SheetTitle>
            <SheetDescription className="text-xs text-zinc-500 mt-0.5">
              Register carrier codes, endpoints, and credentials for order tracking webhooks.
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleCarrierSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="carrier-name" className="text-xs font-medium text-zinc-500">Carrier Partner Name</Label>
              <Input
                id="carrier-name"
                value={carrierFormData.name}
                onChange={(e) => setCarrierFormData({ ...carrierFormData, name: e.target.value })}
                className="h-11 border-zinc-200 rounded-xl text-sm focus-visible:ring-1 focus-visible:ring-teal-600"
                placeholder="e.g. Bluedart Express"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="carrier-code" className="text-xs font-medium text-zinc-500">Unique Code (Lowercase)</Label>
              <Input
                id="carrier-code"
                value={carrierFormData.code}
                onChange={(e) => setCarrierFormData({ ...carrierFormData, code: e.target.value })}
                className="h-11 border-zinc-200 rounded-xl text-sm focus-visible:ring-1 focus-visible:ring-teal-600"
                placeholder="e.g. bluedart"
                disabled={!!editingCarrier}
                required
              />
              <p className="text-[10px] text-zinc-400 mt-1 leading-normal">
                Must match tracking database fields. Use lowercase letters, no spaces (e.g. `delhivery`, `bluedart`).
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="carrier-endpoint" className="text-xs font-medium text-zinc-500">Tracking API Endpoint</Label>
              <Input
                id="carrier-endpoint"
                type="url"
                value={carrierFormData.api_endpoint}
                onChange={(e) => setCarrierFormData({ ...carrierFormData, api_endpoint: e.target.value })}
                className="h-11 border-zinc-200 rounded-xl text-sm focus-visible:ring-1 focus-visible:ring-teal-600"
                placeholder="https://api.carrier.com/v1/track"
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-zinc-50/50 border border-zinc-100 rounded-xl">
              <div className="space-y-0.5">
                <Label htmlFor="carrier-active" className="text-sm font-medium text-zinc-800">Connection Online</Label>
                <p className="text-xs text-zinc-400">Determine whether tracking integrations run automated calls</p>
              </div>
              <Switch
                id="carrier-active"
                checked={carrierFormData.active}
                onCheckedChange={(checked) => setCarrierFormData({ ...carrierFormData, active: checked })}
                className="data-[state=checked]:bg-teal-600"
              />
            </div>
          </form>

          <div className="p-6 border-t border-zinc-150/40 bg-zinc-50/30">
            <Button
              disabled={saving}
              onClick={handleCarrierSubmit}
              className="w-full bg-zinc-900 hover:bg-zinc-800 text-white h-11 rounded-xl text-sm font-medium transition-all shadow-sm gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Carrier Integration
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* --- BULK PINCODE OVERRIDE DIALOG --- */}
      <Dialog open={isBulkPincodeDialogOpen} onOpenChange={setIsBulkPincodeDialogOpen}>
        <DialogContent className="sm:max-w-[500px] bg-white rounded-2xl border border-zinc-150 p-6 shadow-xl text-zinc-900">
          <DialogHeader className="gap-2">
            <DialogTitle className="text-lg font-bold text-zinc-850">Bulk Pincode Mapping</DialogTitle>
            <DialogDescription className="text-xs text-zinc-550 leading-normal">
              Type or paste multiple 6-digit postal codes separated by commas, spaces, or newlines to map them simultaneously.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleBulkPincodeSubmit} className="space-y-4 my-2">
            <div className="space-y-1.5">
              <Label htmlFor="bulk-zone" className="text-xs font-semibold text-zinc-500">Destination Zone</Label>
              <select
                id="bulk-zone"
                value={bulkPincodeFormData.zone_id}
                onChange={(e) => setBulkPincodeFormData({ ...bulkPincodeFormData, zone_id: e.target.value })}
                className="w-full h-11 px-3 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-teal-600 bg-white"
                required
              >
                <option value="" disabled>Select Zone</option>
                {zones.map((zone) => (
                  <option key={zone.id} value={zone.id}>{zone.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bulk-override" className="text-xs font-semibold text-zinc-500">Custom Estimate Override (Optional)</Label>
              <Input
                id="bulk-override"
                value={bulkPincodeFormData.estimate_override}
                onChange={(e) => setBulkPincodeFormData({ ...bulkPincodeFormData, estimate_override: e.target.value })}
                className="h-11 border-zinc-200 rounded-xl text-sm"
                placeholder="e.g. Same Day or 24 Hours"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bulk-pincodes-area" className="text-xs font-semibold text-zinc-500">Pincode List</Label>
              <textarea
                id="bulk-pincodes-area"
                rows={5}
                value={bulkPincodeFormData.pincodesText}
                onChange={(e) => setBulkPincodeFormData({ ...bulkPincodeFormData, pincodesText: e.target.value })}
                placeholder="e.g. 140001, 140002, 160001, 160002"
                className="w-full border border-zinc-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-1 focus:ring-teal-600 bg-zinc-50/50"
                required
              />
            </div>
          </form>

          <DialogFooter className="mt-4 gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setIsBulkPincodeDialogOpen(false)}
              className="border-zinc-200 text-zinc-700 hover:bg-zinc-50 rounded-xl"
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkPincodeSubmit}
              disabled={saving}
              className="bg-zinc-950 hover:bg-zinc-800 text-white rounded-xl gap-2 font-medium"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Import & Map
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* --- CONFIRM ZONES DELETE DIALOG --- */}
      <Dialog open={!!zoneToDelete} onOpenChange={(open) => !open && setZoneToDelete(null)}>
        <DialogContent className="sm:max-w-[425px] bg-white rounded-2xl border border-zinc-150 p-6 shadow-xl text-zinc-900">
          <DialogHeader className="gap-2">
            <DialogTitle className="text-lg font-bold text-zinc-800">Delete Zone</DialogTitle>
            <DialogDescription className="text-sm text-zinc-500 leading-relaxed">
              Are you sure you want to delete <span className="font-semibold text-zinc-700">{zoneToDelete?.name}</span>? This will permanently remove it and disable its transit estimations.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setZoneToDelete(null)}
              className="border-zinc-200 text-zinc-700 hover:bg-zinc-50 hover:text-zinc-950 rounded-xl"
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmZoneDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl gap-2 font-medium"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Delete Zone
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- CONFIRM PINCODES OVERRIDE DELETE DIALOG --- */}
      <Dialog open={!!pincodeToDelete} onOpenChange={(open) => !open && setPincodeToDelete(null)}>
        <DialogContent className="sm:max-w-[425px] bg-white rounded-2xl border border-zinc-150 p-6 shadow-xl text-zinc-900">
          <DialogHeader className="gap-2">
            <DialogTitle className="text-lg font-bold text-zinc-800">Delete Override Rule</DialogTitle>
            <DialogDescription className="text-sm text-zinc-500 leading-relaxed">
              Are you sure you want to delete the override rule for pincode <span className="font-semibold text-zinc-700">{pincodeToDelete?.pincode}</span>? This pincode will revert to inheriting standard zone estimates.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setPincodeToDelete(null)}
              className="border-zinc-200 text-zinc-700 hover:bg-zinc-50 rounded-xl"
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmPincodeDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl gap-2 font-medium"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Remove Rule
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- CONFIRM CARRIER REMOVE DIALOG --- */}
      <Dialog open={!!carrierToDelete} onOpenChange={(open) => !open && setCarrierToDelete(null)}>
        <DialogContent className="sm:max-w-[425px] bg-white rounded-2xl border border-zinc-150 p-6 shadow-xl text-zinc-900">
          <DialogHeader className="gap-2">
            <DialogTitle className="text-lg font-bold text-zinc-800">Delete Carrier Integration</DialogTitle>
            <DialogDescription className="text-sm text-zinc-500 leading-relaxed">
              Are you sure you want to delete <span className="font-semibold text-zinc-700">{carrierToDelete?.name}</span>? Orders managed by this carrier will fail to query tracking data via automated webhooks.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setCarrierToDelete(null)}
              className="border-zinc-200 text-zinc-700 hover:bg-zinc-50 rounded-xl"
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmCarrierDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl gap-2 font-medium"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Remove Connection
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
