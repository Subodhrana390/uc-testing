"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { createAdminClient as createClient } from "@/utils/supabase/admin-client";
import {
  Search,
  MoreHorizontal,
  Eye,
  Truck,
  CheckCircle2,
  Filter,
  Clock,
  Download,
  Package,
  X,
  Loader2,
  Settings,
  MoreVertical,
  ArrowRight,
  RefreshCw,
  Printer,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Calendar,
  FileSpreadsheet,
} from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import LogoLoader from "@/components/ui/LogoLoader";
import { getDisplayOrderId } from "@/lib/order";
import { Pagination } from "@/components/ui/pagination";

// Recharts imports
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// shadcn/ui imports
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableBody,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type StatusType = "All" | "Pending" | "Confirmed" | "Processing" | "Shipped" | "Delivered" | "Cancelled" | "Return";

const getPossibleNextStatuses = (currentStatus: string): string[] => {
  const status = (currentStatus || "").trim().toUpperCase();
  const transitions: Record<string, string[]> = {
    PENDING: ["Confirmed", "Cancelled"],
    CONFIRMED: ["Processing", "Cancelled"],
    PROCESSING: ["Cancelled"],
    SHIPPED: ["Delivered"],
    DELIVERED: [],
    RETURN_REQUESTED: ["Return_Approved"],
    RETURN_APPROVED: ["Returned"],
    RETURNED: ["Refund_Pending"],
    REFUND_PENDING: ["Refunded"],
    FAILED: ["Cancelled"],
    CANCELLED: [],
    REFUNDED: [],
  };

  const defaultStatuses = [
    "Confirmed", "Processing",
    "Shipped", "Delivered", "Cancelled",
    "Return_Requested", "Return_Approved", "Returned",
    "Refund_Pending", "Refunded",
  ];

  return transitions[status] ?? defaultStatuses;
};

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onChange: (start: string, end: string) => void;
}

function DateRangePicker({ startDate, endDate, onChange }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = startDate ? new Date(startDate) : new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [hoverDate, setHoverDate] = useState<string | null>(null);

  // Close calendar when clicking outside
  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".date-range-picker-container")) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen]);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  // Get total days in month
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // Get start day of week (0-6)
  const startDayOfWeek = new Date(year, month, 1).getDay();

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentMonth(new Date(year, month - 1, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentMonth(new Date(year, month + 1, 1));
  };

  const formatDateString = (y: number, m: number, d: number) => {
    const mm = String(m + 1).padStart(2, "0");
    const dd = String(d).padStart(2, "0");
    return `${y}-${mm}-${dd}`;
  };

  const handleDateClick = (dateStr: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!startDate || (startDate && endDate)) {
      onChange(dateStr, "");
    } else {
      if (new Date(dateStr) < new Date(startDate)) {
        onChange(dateStr, "");
      } else {
        onChange(startDate, dateStr);
        setIsOpen(false); // Auto close after selecting range
      }
    }
  };

  const isSelected = (dateStr: string) => {
    return dateStr === startDate || dateStr === endDate;
  };

  const isInRange = (dateStr: string) => {
    if (!startDate) return false;
    const time = new Date(dateStr).getTime();
    const startTime = new Date(startDate).getTime();
    if (endDate) {
      const endTime = new Date(endDate).getTime();
      return time > startTime && time < endTime;
    }
    if (hoverDate) {
      const hoverTime = new Date(hoverDate).getTime();
      return time > startTime && time < hoverTime;
    }
    return false;
  };

  const days = [];
  // Empty slots for previous month padding
  for (let i = 0; i < startDayOfWeek; i++) {
    days.push(null);
  }
  // Days of month
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const displayValue = () => {
    if (!startDate) return "Select date range";
    const startFmt = new Date(startDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
    if (!endDate) return `${startFmt} - ...`;
    const endFmt = new Date(endDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
    return `${startFmt} to ${endFmt}`;
  };

  return (
    <div className="relative date-range-picker-container w-full sm:w-[260px] shrink-0">
      <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider block mb-1.5">Date Range</span>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-9 bg-zinc-50 border border-zinc-200 hover:bg-zinc-100/70 text-left px-3 rounded-md text-xs text-[#18181b] flex items-center justify-between transition-all duration-200 cursor-pointer"
      >
        <span className={!startDate ? "text-zinc-400 font-medium" : "font-semibold text-zinc-800"}>
          {displayValue()}
        </span>
        <Calendar className="w-4 h-4 text-zinc-400 shrink-0 ml-2" />
      </button>

      {isOpen && (
        <div className="absolute top-11 left-0 z-50 w-[280px] bg-white border border-zinc-200 rounded-xl shadow-2xl p-4 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 hover:bg-zinc-150 rounded-lg text-zinc-500 transition-all cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-extrabold text-zinc-800">
              {monthNames[month]} {year}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 hover:bg-zinc-150 rounded-lg text-zinc-500 transition-all cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1">
            <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {days.map((day, idx) => {
              if (day === null) {
                return <div key={`empty-${idx}`} className="h-7" />;
              }

              const dateStr = formatDateString(year, month, day);
              const selected = isSelected(dateStr);
              const inRange = isInRange(dateStr);

              return (
                <button
                  key={`day-${day}`}
                  type="button"
                  onMouseEnter={() => !endDate && startDate && setHoverDate(dateStr)}
                  onMouseLeave={() => setHoverDate(null)}
                  onClick={(e) => handleDateClick(dateStr, e)}
                  className={cn(
                    "h-7 w-full text-xs font-semibold rounded-md flex items-center justify-center transition-all cursor-pointer",
                    selected && "bg-blue-600 text-white font-extrabold shadow-sm hover:bg-blue-700",
                    inRange && !selected && "bg-blue-50 text-blue-700 hover:bg-blue-100",
                    !selected && !inRange && "text-zinc-700 hover:bg-zinc-100"
                  )}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <div className="mt-3 pt-2 border-t border-zinc-100 flex items-center justify-between">
            <span className="text-[10px] text-zinc-400 font-medium">Click start then end date</span>
            {(startDate || endDate) && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange("", "");
                  setHoverDate(null);
                }}
                className="text-[10px] text-rose-600 hover:text-rose-700 font-bold hover:bg-rose-50 px-1.5 py-0.5 rounded-md cursor-pointer transition-all"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface PriceRangePickerProps {
  minPrice: string;
  maxPrice: string;
  setMinPrice: (val: string) => void;
  setMaxPrice: (val: string) => void;
}

function PriceRangePicker({ minPrice, maxPrice, setMinPrice, setMaxPrice }: PriceRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Close popup when clicking outside
  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".price-range-picker-container")) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen]);

  const displayValue = () => {
    if (!minPrice && !maxPrice) return "Select price range";
    if (minPrice && !maxPrice) return `₹${parseInt(minPrice).toLocaleString()} - ...`;
    if (!minPrice && maxPrice) return `... - ₹${parseInt(maxPrice).toLocaleString()}`;
    return `₹${parseInt(minPrice).toLocaleString()} to ₹${parseInt(maxPrice).toLocaleString()}`;
  };

  return (
    <div className="relative price-range-picker-container w-full sm:w-[200px] shrink-0">
      <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider block mb-1.5">Price Range (₹)</span>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-9 bg-zinc-50 border border-zinc-200 hover:bg-zinc-100/70 text-left px-3 rounded-md text-xs text-[#18181b] flex items-center justify-between transition-all duration-200 cursor-pointer"
      >
        <span className={(!minPrice && !maxPrice) ? "text-zinc-400 font-medium" : "font-semibold text-zinc-800"}>
          {displayValue()}
        </span>
        <SlidersHorizontal className="w-4 h-4 text-zinc-400 shrink-0 ml-2" />
      </button>

      {isOpen && (
        <div className="absolute top-11 left-0 z-50 w-[240px] bg-white border border-zinc-200 rounded-xl shadow-2xl p-4 animate-in fade-in zoom-in-95 duration-150 space-y-3">
          <div className="text-xs font-bold text-zinc-800 uppercase tracking-wider">Set Price Range</div>
          <div className="flex items-center gap-2">
            <div className="space-y-1 flex-1">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">Min (₹)</span>
              <Input
                placeholder="0"
                type="number"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className="bg-white border-zinc-200 text-xs h-9 focus-visible:ring-[#3b82f6]"
              />
            </div>
            <span className="text-zinc-400 text-xs font-bold pt-4">to</span>
            <div className="space-y-1 flex-1">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">Max (₹)</span>
              <Input
                placeholder="Max"
                type="number"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="bg-white border-zinc-200 text-xs h-9 focus-visible:ring-[#3b82f6]"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-zinc-100 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-[10px] text-blue-600 hover:text-blue-700 font-bold hover:bg-blue-50 px-1.5 py-0.5 rounded-md cursor-pointer transition-all"
            >
              Apply
            </button>
            {(minPrice || maxPrice) && (
              <button
                type="button"
                onClick={() => {
                  setMinPrice("");
                  setMaxPrice("");
                }}
                className="text-[10px] text-rose-600 hover:text-rose-700 font-bold hover:bg-rose-50 px-1.5 py-0.5 rounded-md cursor-pointer transition-all"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  // Modal states
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isTrackingOpen, setIsTrackingOpen] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);

  // Form states
  const [trackingId, setTrackingId] = useState("");
  const [carrier, setCarrier] = useState("");
  const [isUpdatingTracking, setIsUpdatingTracking] = useState(false);
  const [isRefunding, setIsRefunding] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusType>("All");
  const [carriers, setCarriers] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [tableOrders, setTableOrders] = useState<any[]>([]);
  const [tableLoading, setTableLoading] = useState(true);
  const [totalItems, setTotalItems] = useState(0);
  const [activeView, setActiveView] = useState<"analytics" | "table">("table");
  const [showFilters, setShowFilters] = useState(false);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");


  const [debouncedMinPrice, setDebouncedMinPrice] = useState("");
  const [debouncedMaxPrice, setDebouncedMaxPrice] = useState("");

  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    id: true,
    customer: true,
    date: true,
    amount: true,
    status: true,
    actions: true,
  });

  const toggleColumn = (col: string) => {
    setVisibleColumns((prev) => ({
      ...prev,
      [col]: !prev[col],
    }));
  };

  const activeColSpan = useMemo(() => {
    return (visibleColumns.id ? 1 : 0) +
      (visibleColumns.customer ? 1 : 0) +
      (visibleColumns.date ? 1 : 0) +
      (visibleColumns.amount ? 1 : 0) +
      (visibleColumns.status ? 1 : 0) +
      (visibleColumns.actions ? 1 : 0) + 1; // +1 for checkboxes
  }, [visibleColumns]);

  const supabase = useMemo(() => createClient(), []);

  const fetchOrders = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          id, 
          status, 
          created_at, 
          total_amount, 
          customer_name,
          order_items (
            quantity,
            products (
              name
            )
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  const fetchTableOrders = useCallback(async () => {
    setTableLoading(true);
    try {
      let q = supabase
        .from("orders")
        .select(`
          *,
          items:order_items (
            *,
            products (name)
          )
        `, { count: "exact" });

      if (debouncedSearchQuery) {
        const query = debouncedSearchQuery.trim();
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(query);

        // Check if query is a custom display order ID (e.g. OD178100194544591134)
        const odMatch = query.match(/^OD(\d{13})(\d{5})$/i);
        if (odMatch) {
          const ts = parseInt(odMatch[1]);
          const startWindow = new Date(ts - 2000).toISOString();
          const endWindow = new Date(ts + 2000).toISOString();

          const { data: windowOrders } = await supabase
            .from("orders")
            .select("id, created_at")
            .gte("created_at", startWindow)
            .lte("created_at", endWindow);

          const matchingOrder = windowOrders?.find(o => getDisplayOrderId(o.id, o.created_at).toLowerCase() === query.toLowerCase());
          if (matchingOrder) {
            q = q.eq("id", matchingOrder.id);
          } else {
            // No matching order, force 0 results
            q = q.eq("id", "00000000-0000-0000-0000-000000000000");
          }
        } else {
          let orConditions = `customer_name.ilike.%${query}%`;
          if (isUuid) {
            orConditions += `,id.eq.${query}`;
          }
          q = q.or(orConditions);
        }
      }

      if (statusFilter !== "All") {
        q = q.eq("status", statusFilter);
      }

      if (debouncedMinPrice) {
        const minVal = parseFloat(debouncedMinPrice);
        if (!isNaN(minVal)) {
          q = q.gte("total_amount", minVal);
        }
      }

      if (debouncedMaxPrice) {
        const maxVal = parseFloat(debouncedMaxPrice);
        if (!isNaN(maxVal)) {
          q = q.lte("total_amount", maxVal);
        }
      }

      if (startDate) {
        q = q.gte("created_at", `${startDate}T00:00:00Z`);
      }

      if (endDate) {
        q = q.lte("created_at", `${endDate}T23:59:59Z`);
      }

      const start = (currentPage - 1) * pageSize;
      const end = start + pageSize - 1;

      const { data, count, error } = await q
        .order("created_at", { ascending: false })
        .range(start, end);

      if (error) throw error;
      setTableOrders(data || []);
      setTotalItems(count || 0);

      // Auto-open if searching specifically for a single order from URL
      if (data && data.length === 1 && typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        const searchVal = params.get("search");
        if (searchVal && (
          searchVal.toLowerCase() === data[0].id.toLowerCase() ||
          getDisplayOrderId(data[0].id, data[0].created_at).toLowerCase() === searchVal.toLowerCase()
        )) {
          setSelectedOrder(data[0]);
          setIsDetailsOpen(true);
        }
      }
    } catch (error) {
      console.error("Error fetching table orders:", error);
      toast.error("Failed to load orders table");
    } finally {
      setTableLoading(false);
    }
  }, [supabase, currentPage, pageSize, debouncedSearchQuery, statusFilter, debouncedMinPrice, debouncedMaxPrice, startDate, endDate]);

  const fetchCarriers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("delivery_carriers")
        .select("*")
        .eq("active", true)
        .order("name", { ascending: true });
      if (error) throw error;
      setCarriers(data || []);
    } catch (error) {
      console.error("Error fetching carriers:", error);
    }
  }, [supabase]);

  useEffect(() => {
    setIsMounted(true);
    fetchOrders();
    fetchCarriers();

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const searchVal = params.get("search");
      if (searchVal) {
        setSearchQuery(searchVal);
        setActiveView("table");
      }
    }
  }, [fetchOrders, fetchCarriers]);

  useEffect(() => {
    fetchTableOrders();
  }, [fetchTableOrders]);

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Debounce price filters
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedMinPrice(minPrice);
    }, 300);
    return () => clearTimeout(handler);
  }, [minPrice]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedMaxPrice(maxPrice);
    }, 300);
    return () => clearTimeout(handler);
  }, [maxPrice]);





  // Realtime subscription — picks up customer payments and any order field changes instantly
  useEffect(() => {
    const channel = supabase
      .channel("admin-orders-realtime")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders" },
        (payload) => {
          setOrders((prev) =>
            prev.map((o) =>
              o.id === payload.new.id
                ? { ...o, ...payload.new }
                : o
            )
          );
          setTableOrders((prev) =>
            prev.map((o) =>
              o.id === payload.new.id
                ? { ...o, ...payload.new, items: o.items } // preserve joined items
                : o
            )
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        () => {
          fetchOrders();
          fetchTableOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, fetchOrders, fetchTableOrders]);

  const updateStatus = async (id: string, status: string): Promise<any> => {
    try {
      const response = await fetch("/api/orders/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: id, status })
      });

      const resData = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(resData.error || "Update failed");
      }

      const updatedOrder = resData.order;
      if (updatedOrder) {
        setOrders(prev => prev.map(o => o.id === id ? { ...o, ...updatedOrder } : o));
        setTableOrders(prev => prev.map(o => o.id === id ? { ...o, ...updatedOrder, items: o.items } : o));
        toast.success(`Order marked as ${status}`);
        return updatedOrder;
      } else {
        setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
        setTableOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
        toast.success(`Order marked as ${status}`);
        return null;
      }
    } catch (error: any) {
      toast.error(error.message);
      return null;
    }
  };

  const updateBulkStatus = async (status: string) => {
    if (selectedOrders.length === 0) return;
    try {
      const promises = selectedOrders.map(id =>
        fetch("/api/orders/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: id, status })
        }).then(r => r.json().catch(() => ({})))
      );
      const results = await Promise.all(promises);

      setOrders(prev => prev.map(o => {
        const res = results.find(r => r.order?.id === o.id);
        return res?.order ? { ...o, ...res.order } : (selectedOrders.includes(o.id) ? { ...o, status } : o);
      }));
      setTableOrders(prev => prev.map(o => {
        const res = results.find(r => r.order?.id === o.id);
        return res?.order ? { ...o, ...res.order, items: o.items } : (selectedOrders.includes(o.id) ? { ...o, status } : o);
      }));

      toast.success(`Bulk updated ${selectedOrders.length} orders to ${status}`);
      setSelectedOrders([]);
    } catch (error: any) {
      toast.error("Failed to update some orders");
    }
  };

  const updatePaymentStatus = async (orderId: string, paymentStatus: string, paymentMethod?: string) => {
    try {
      const response = await fetch("/api/orders/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, paymentStatus, paymentMethod })
      });

      if (!response.ok) {
        const resData = await response.json().catch(() => ({}));
        throw new Error(resData.error || "Payment update failed");
      }

      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, payment_status: paymentStatus, payment_method: paymentMethod || o.payment_method } : o));
      setTableOrders(prev => prev.map(o => o.id === orderId ? { ...o, payment_status: paymentStatus, payment_method: paymentMethod || o.payment_method } : o));
      toast.success(`Payment marked as ${paymentStatus}`);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const triggerRefund = async (order: any) => {
    if (order.payment_method === "ONLINE") {
      setIsRefunding(true);
      try {
        const res = await fetch("/api/razorpay/refund", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: order.id })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Refund failed");

        toast.success("Refund processed successfully via Razorpay");
        setOrders(prev => prev.map(o => o.id === order.id ? { ...o, payment_status: "Refunded" } : o));
        setTableOrders(prev => prev.map(o => o.id === order.id ? { ...o, payment_status: "Refunded" } : o));
        setSelectedOrder((prev: any) => ({ ...prev, payment_status: "Refunded" }));
      } catch (error: any) {
        toast.error(error.message);
      } finally {
        setIsRefunding(false);
      }
    } else {
      await updatePaymentStatus(order.id, "Refunded");
      setSelectedOrder((prev: any) => ({ ...prev, payment_status: "Refunded" }));
    }
  };

  const updateTracking = async (orderId: string) => {
    setIsUpdatingTracking(true);
    try {
      const response = await fetch("/api/orders/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, status: "Shipped", trackingId, carrier })
      });

      if (!response.ok) {
        const resData = await response.json().catch(() => ({}));
        throw new Error(resData.error || "Tracking update failed");
      }

      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, tracking_id: trackingId, carrier, status: "Shipped" } : o));
      setTableOrders(prev => prev.map(o => o.id === orderId ? { ...o, tracking_id: trackingId, carrier, status: "Shipped" } : o));
      toast.success("Logistics updated");
      setIsTrackingOpen(false);
      setSelectedOrder(null);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsUpdatingTracking(false);
    }
  };

  const exportToPDF = async () => {
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");
    const doc = new jsPDF();
    doc.setFontSize(10);
    doc.text("Order Report", 14, 15);
    autoTable(doc, {
      head: [['ID', 'Customer', 'Date', 'Total', 'Status']],
      body: orders.map(o => [getDisplayOrderId(o.id, o.created_at), o.customer_name, new Date(o.created_at).toLocaleDateString(), o.total_amount, o.status]),
      startY: 20,
      styles: { fontSize: 8 }
    });
    doc.save("orders_report.pdf");
  };

  const getFilteredExportData = async () => {
    let q = supabase
      .from("orders")
      .select(`
        id,
        created_at,
        customer_name,
        customer_email,
        total_amount,
        status,
        order_items (
          quantity,
          products (name)
        )
      `);

    if (debouncedSearchQuery) {
      const query = debouncedSearchQuery.trim();
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(query);

      // Check if query is a custom display order ID (e.g. OD178100194544591134)
      const odMatch = query.match(/^OD(\d{13})(\d{5})$/i);
      if (odMatch) {
        const ts = parseInt(odMatch[1]);
        const startWindow = new Date(ts - 2000).toISOString();
        const endWindow = new Date(ts + 2000).toISOString();

        const { data: windowOrders } = await supabase
          .from("orders")
          .select("id, created_at")
          .gte("created_at", startWindow)
          .lte("created_at", endWindow);

        const matchingOrder = windowOrders?.find(o => getDisplayOrderId(o.id, o.created_at).toLowerCase() === query.toLowerCase());
        if (matchingOrder) {
          q = q.eq("id", matchingOrder.id);
        } else {
          // No matching order, force 0 results
          q = q.eq("id", "00000000-0000-0000-0000-000000000000");
        }
      } else {
        let orConditions = `customer_name.ilike.%${query}%`;
        if (isUuid) {
          orConditions += `,id.eq.${query}`;
        }
        q = q.or(orConditions);
      }
    }

    if (statusFilter !== "All") {
      q = q.eq("status", statusFilter);
    }

    if (debouncedMinPrice) {
      const minVal = parseFloat(debouncedMinPrice);
      if (!isNaN(minVal)) {
        q = q.gte("total_amount", minVal);
      }
    }

    if (debouncedMaxPrice) {
      const maxVal = parseFloat(debouncedMaxPrice);
      if (!isNaN(maxVal)) {
        q = q.lte("total_amount", maxVal);
      }
    }

    if (startDate) {
      q = q.gte("created_at", `${startDate}T00:00:00Z`);
    }

    if (endDate) {
      q = q.lte("created_at", `${endDate}T23:59:59Z`);
    }

    const { data, error } = await q.order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  };

  const exportFilteredPDF = async () => {
    const toastId = toast.loading("Generating PDF Report...");
    try {
      const data = await getFilteredExportData();
      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");
      const doc = new jsPDF();

      doc.setFontSize(14);
      doc.text("Orders Report (Filtered)", 14, 15);
      doc.setFontSize(9);
      doc.text(`Generated on: ${new Date().toLocaleString("en-IN")}`, 14, 20);

      autoTable(doc, {
        head: [['Order ID', 'Customer', 'Email', 'Date', 'Total', 'Status']],
        body: data.map(o => [
          getDisplayOrderId(o.id, o.created_at),
          o.customer_name || "Guest",
          o.customer_email || "N/A",
          new Date(o.created_at).toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' }),
          `INR ${parseFloat(o.total_amount).toLocaleString("en-IN")}`,
          o.status
        ]),
        startY: 25,
        styles: { fontSize: 8 }
      });

      doc.save(`orders_report_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success("PDF Report downloaded successfully", { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate PDF Report", { id: toastId });
    }
  };

  const exportFilteredCSV = async () => {
    const toastId = toast.loading("Generating CSV Report...");
    try {
      const data = await getFilteredExportData();
      const headers = ["Order ID", "Customer", "Email", "Date", "Total Amount (INR)", "Status", "Items"];
      const rows = data.map(o => {
        const displayId = getDisplayOrderId(o.id, o.created_at);
        const dateStr = new Date(o.created_at).toLocaleDateString();
        const itemsSummary = (o.order_items || [])
          .map((item: any) => `${item.products?.name || "Product"} (x${item.quantity})`)
          .join(" | ");
        return [
          displayId,
          o.customer_name || "Guest",
          o.customer_email || "N/A",
          dateStr,
          o.total_amount,
          o.status,
          `"${itemsSummary.replace(/"/g, '""')}"`
        ];
      });

      const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `orders_report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("CSV Report downloaded successfully", { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate CSV Report", { id: toastId });
    }
  };

  const getStatusBadge = (status: string) => {
    if (!status) return null;
    switch (status.toUpperCase()) {
      case "PENDING":
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50">Pending</Badge>;
      case "CONFIRMED":
        return <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-50">Confirmed</Badge>;
      case "PROCESSING":
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-50">Processing</Badge>;
      case "SHIPPED":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50">Shipped</Badge>;
      case "DELIVERED":
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50">Delivered</Badge>;
      case "CANCELLED":
        return <Badge variant="destructive">Cancelled</Badge>;
      case "RETURN_REQUESTED":
        return <Badge variant="outline" className="bg-pink-50 text-pink-700 border-pink-200 hover:bg-pink-50">Return Requested</Badge>;
      case "RETURN_APPROVED":
        return <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-50">Return Approved</Badge>;
      case "RETURNED":
        return <Badge variant="outline" className="bg-rose-100 text-rose-800 border-rose-300 hover:bg-rose-100">Returned</Badge>;
      case "REFUND_PENDING":
        return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-50">Refund Pending</Badge>;
      case "REFUNDED":
        return <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-100">Refunded</Badge>;
      case "FAILED":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 hover:bg-red-50">Failed</Badge>;
      default:
        const lower = status.toLowerCase();
        if (lower === "placed") return <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-50">Placed</Badge>;
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Reset page to 1 when filters or query change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery, statusFilter, debouncedMinPrice, debouncedMaxPrice, startDate, endDate]);

  const stats = useMemo(() => {
    const total = orders.length;
    const pending = orders.filter(o => o.status.toLowerCase() === "pending").length;
    const shipped = orders.filter(o => o.status.toLowerCase() === "shipped").length;
    const delivered = orders.filter(o => o.status.toLowerCase() === "delivered").length;
    return { total, pending, shipped, delivered };
  }, [orders]);

  const dailyOrdersData = useMemo(() => {
    const dates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split("T")[0];
    }).reverse();

    return dates.map(date => {
      const dayOrders = orders.filter(o => o.created_at?.startsWith(date));
      return {
        date,
        name: new Date(date).toLocaleDateString("en-IN", { weekday: "short" }),
        orders: dayOrders.length,
      };
    });
  }, [orders]);

  const statusData = useMemo(() => {
    const confirmed = orders.filter(o => ["confirmed", "order_confirmed"].includes(o.status.toLowerCase())).length;
    const processing = orders.filter(o => o.status.toLowerCase() === "processing").length;
    const pending = orders.filter(o => ["pending", "pending_payment"].includes(o.status.toLowerCase())).length;
    const shipped = orders.filter(o => o.status.toLowerCase() === "shipped").length;
    const delivered = orders.filter(o => o.status.toLowerCase() === "delivered").length;
    const cancelled = orders.filter(o => o.status.toLowerCase() === "cancelled").length;
    const returned = orders.filter(o => ["returned", "return_requested", "return_approved"].includes(o.status.toLowerCase())).length;
    const refunded = orders.filter(o => ["refunded", "refund_pending"].includes(o.status.toLowerCase())).length;

    return [
      { name: "Pending", value: pending, color: "#f59e0b" },
      { name: "Confirmed", value: confirmed, color: "#6366f1" },
      { name: "Processing", value: processing, color: "#a855f7" },
      { name: "Shipped", value: shipped, color: "#3b82f6" },
      { name: "Delivered", value: delivered, color: "#10b981" },
      { name: "Cancelled", value: cancelled, color: "#ef4444" },
      { name: "Returned", value: returned, color: "#f43f5e" },
      { name: "Refunded", value: refunded, color: "#8b5cf6" },
    ].filter(item => item.value > 0);
  }, [orders]);

  const dailyTrends = useMemo(() => {
    const dates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split("T")[0];
    }).reverse();

    return dates.map(date => {
      const dayOrders = orders.filter(o => o.created_at?.startsWith(date));
      return {
        date,
        total: dayOrders.length,
        pending: dayOrders.filter(o => o.status.toLowerCase() === "pending").length,
        shipped: dayOrders.filter(o => o.status.toLowerCase() === "shipped").length,
        delivered: dayOrders.filter(o => o.status.toLowerCase() === "delivered").length,
      };
    });
  }, [orders]);

  const topProductsData = useMemo(() => {
    const counts: Record<string, number> = {};
    orders.forEach((order) => {
      const items = order.order_items || [];
      items.forEach((item: any) => {
        const productName = item.products?.name || "Unknown Product";
        const quantity = item.quantity || 0;
        counts[productName] = (counts[productName] || 0) + quantity;
      });
    });

    return Object.entries(counts)
      .map(([name, sales]) => ({ name, sales }))
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 5);
  }, [orders]);

  const getInitials = (name: string) => {
    if (!name) return "U";
    const parts = name.trim().split(" ");
    return parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() : name[0].toUpperCase();
  };

  const getAvatarBg = (name: string) => {
    const colors = ["bg-indigo-100 text-indigo-700", "bg-emerald-100 text-emerald-700", "bg-cyan-100 text-cyan-700", "bg-amber-100 text-amber-700", "bg-rose-100 text-rose-700", "bg-purple-100 text-purple-700"];
    return colors[(name.charCodeAt(0) || 0) % colors.length];
  };

  const handleRefresh = async () => {
    toast.promise(
      Promise.all([
        fetchOrders(),
        fetchTableOrders(),
        fetchCarriers()
      ]),
      {
        loading: "Refreshing order dashboard...",
        success: "Orders dashboard refreshed!",
        error: "Failed to refresh orders."
      }
    );
  };

  if (loading) return <LogoLoader text="Loading orders..." />;

  return (
    <div className="space-y-6 sm:space-y-8 w-full px-4 sm:px-6 lg:px-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Order Management</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Track orders, monitor deliveries, and manage logistics.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleRefresh}
              variant="outline"
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
          </div>
        </div>
        {/* View Switcher Tabs */}
        <div className="flex border-b border-zinc-200 gap-6 mt-4">
          <button
            onClick={() => setActiveView("analytics")}
            className={cn(
              "pb-3 text-sm font-bold tracking-wide transition-all border-b-2 cursor-pointer",
              activeView === "analytics"
                ? "border-primary text-zinc-950"
                : "border-transparent text-zinc-400 hover:text-zinc-655"
            )}
          >
            Analytics & Trends
          </button>
          <button
            onClick={() => setActiveView("table")}
            className={cn(
              "pb-3 text-sm font-bold tracking-wide transition-all border-b-2 cursor-pointer",
              activeView === "table"
                ? "border-primary text-zinc-950"
                : "border-transparent text-zinc-400 hover:text-zinc-655"
            )}
          >
            Orders
          </button>
        </div>
      </div>

      {activeView === "analytics" && (
        <div className="space-y-4 md:space-y-6">
          {/* Charts Grid */}
          <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
            {/* Order Status Distribution Donut Chart */}
            <Card className="min-w-0 bg-white border-zinc-200 shadow-sm rounded-2xl overflow-hidden p-4 sm:p-6 flex flex-col justify-between text-[#18181b]">
              <div>
                <h3 className="text-lg font-bold text-[#18181b] tracking-tight">Order Status Distribution</h3>
                <p className="text-xs font-semibold text-zinc-400 mt-1">Percentage and count of orders by status</p>
              </div>
              <div className="h-[260px] w-full mt-4 flex items-center justify-center relative">
                {isMounted && orders.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }: any) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            const percentage = ((data.value / (stats.total || 1)) * 100).toFixed(1);
                            return (
                              <div className="bg-zinc-950 text-white p-3 rounded-xl shadow-xl border border-zinc-800 text-xs font-bold animate-in fade-in duration-200">
                                <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest mb-1">
                                  {data.name}
                                </p>
                                <p className="text-sm font-black">
                                  {data.value} orders ({percentage}%)
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-zinc-300">
                    <p className="text-[10px] font-black uppercase tracking-widest">No order status data available</p>
                  </div>
                )}

                {/* Center Text inside Donut Hole */}
                {isMounted && orders.length > 0 && (
                  <div className="absolute flex flex-col items-center justify-center">
                    <span className="text-3xl font-black text-[#18181b]">{stats.total}</span>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Total Orders</span>
                  </div>
                )}
              </div>
              {/* Custom Legends */}
              <div className="flex flex-wrap items-center justify-center gap-4 mt-2">
                {statusData.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 text-xs font-semibold text-zinc-600">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span>{item.name} ({item.value})</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Daily Order Volume Area Chart */}
            <Card className="min-w-0 bg-white border-zinc-200 shadow-sm rounded-2xl overflow-hidden p-4 sm:p-6 flex flex-col justify-between text-[#18181b]">
              <div>
                <h3 className="text-lg font-bold text-[#18181b] tracking-tight">Daily Order Volume</h3>
                <p className="text-xs font-semibold text-zinc-400 mt-1">Daily order frequency (7 days)</p>
              </div>
              <div className="h-[260px] w-full mt-4 -ml-4">
                {isMounted && orders.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dailyOrdersData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="orderAreaGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.2} />
                          <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e2e8f0" />
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fontWeight: 600, fill: '#94a3b8' }}
                        dy={10}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fontWeight: 600, fill: '#94a3b8' }}
                      />
                      <Tooltip
                        cursor={{ stroke: '#3b82f6', strokeWidth: 1, strokeDasharray: '4 4' }}
                        content={({ active, payload }: any) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-zinc-950 text-white p-3 rounded-xl shadow-xl border border-[#3b82f6] text-xs font-bold animate-in fade-in duration-200">
                                <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest mb-1">
                                  {payload[0].payload.date}
                                </p>
                                <p className="text-sm font-black">
                                  {payload[0].value} orders
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="orders"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#orderAreaGrad)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-zinc-300">
                    <p className="text-[10px] font-black uppercase tracking-widest">No order volume data available</p>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Top Selling Products Horizontal Bar Chart */}
          <Card className="min-w-0 bg-white border border-zinc-200 shadow-sm rounded-2xl overflow-hidden p-4 sm:p-6 flex flex-col justify-between text-[#18181b]">
            <div>
              <h3 className="text-lg font-bold text-[#18181b] tracking-tight">Top Selling Products</h3>
              <p className="text-xs font-semibold text-zinc-400 mt-1">Total quantity sold per product</p>
            </div>
            <div className="h-[280px] w-full mt-4 -ml-4">
              {isMounted && topProductsData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={topProductsData}
                    margin={{ top: 10, right: 30, left: 140, bottom: 5 }}
                  >
                    <defs>
                      <linearGradient id="topProductsGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#059669" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 600, fill: '#94a3b8' }} />
                    <YAxis
                      dataKey="name"
                      type="category"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fontWeight: 600, fill: '#475569' }}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(241, 245, 249, 0.4)' }}
                      content={({ active, payload }: any) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-zinc-950 text-white p-3 rounded-xl shadow-xl border border-[#10b981] text-xs font-bold animate-in fade-in duration-200">
                              <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest mb-1">
                                {payload[0].payload.name}
                              </p>
                              <p className="text-sm font-black">
                                {payload[0].value} units sold
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar
                      dataKey="sales"
                      fill="url(#topProductsGrad)"
                      radius={[0, 4, 4, 0]}
                      barSize={16}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-zinc-300">
                  <p className="text-[10px] font-black uppercase tracking-widest">No product sales data available</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {activeView === "table" && (
        /* Main Table Area */
        <Card className="overflow-hidden bg-white shadow-sm border border-zinc-200 text-[#18181b]">          {/* Top Controls: Search & Filters (All in one row) */}
          <div className="p-3 border-b border-zinc-200 flex flex-wrap items-end gap-3 bg-zinc-50/30">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px] md:max-w-xs">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider block mb-1.5">Search</span>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <Input
                  placeholder="ID or Customer..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-8 bg-zinc-50 border-zinc-200 focus-visible:ring-[#3b82f6] text-[#18181b] h-9"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-all duration-150 animate-in fade-in zoom-in-75"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Status Dropdown */}
            <div className="w-full sm:w-[150px] shrink-0">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider block mb-1.5">Status</span>
              <Select value={statusFilter} onValueChange={(val) => setStatusFilter((val as StatusType) || "All")}>
                <SelectTrigger className="w-full bg-zinc-50 border-zinc-200 focus:ring-[#3b82f6] text-[#18181b] relative h-9">
                  <div className="flex items-center gap-2 text-zinc-600">
                    <Filter className="w-3.5 h-3.5 text-zinc-400" />
                    <SelectValue placeholder="Status" />
                  </div>
                  {statusFilter !== "All" && (
                    <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                  )}
                </SelectTrigger>
                <SelectContent className="bg-white border-zinc-200">
                  <SelectItem value="All">All Orders</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Confirmed">Confirmed</SelectItem>
                  <SelectItem value="Processing">Processing</SelectItem>
                  <SelectItem value="Shipped">Shipped</SelectItem>
                  <SelectItem value="Delivered">Delivered</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                  <SelectItem value="Return_Requested">Return Requested</SelectItem>
                  <SelectItem value="Return_Approved">Return Approved</SelectItem>
                  <SelectItem value="Returned">Returned</SelectItem>
                  <SelectItem value="Refund_Pending">Refund Pending</SelectItem>
                  <SelectItem value="Refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Price Range Picker */}
            <PriceRangePicker
              minPrice={minPrice}
              maxPrice={maxPrice}
              setMinPrice={setMinPrice}
              setMaxPrice={setMaxPrice}
            />

            {/* Date Range Picker */}
            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              onChange={(start, end) => {
                setStartDate(start);
                setEndDate(end);
              }}
            />

            {(minPrice || maxPrice || startDate || endDate || statusFilter !== "All" || searchQuery) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setMinPrice("");
                  setMaxPrice("");
                  setStartDate("");
                  setEndDate("");
                  setStatusFilter("All");
                  setSearchQuery("");
                }}
                className="h-9 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-3 font-bold"
              >
                Clear All
              </Button>
            )}
          </div>

          {/* Table Utilities Bar (Just Above Table) */}
          <div className="p-3 border-b border-zinc-200 flex items-center justify-between bg-white">
            <span className="text-xs font-semibold text-zinc-500 select-none">
              Showing <span className="font-bold text-zinc-800">{totalItems}</span> order{totalItems !== 1 ? 's' : ''}
            </span>
            <div className="flex items-center gap-2 select-none">
              {/* Columns Selector Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger render={
                  <Button variant="outline" size="sm" className="h-9 gap-1.5 border-zinc-200 text-zinc-700 bg-white hover:bg-zinc-50 rounded-md cursor-pointer text-xs font-semibold px-2.5">
                    <Settings className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Columns</span>
                  </Button>
                } />
                <DropdownMenuContent align="end" className="w-44 bg-white border border-zinc-200 shadow-xl rounded-xl p-1.5 z-50">
                  <DropdownMenuLabel className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-2 py-1">Visible Columns</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <div className="space-y-0.5 p-0.5">
                    {[
                      { key: "id", label: "Order ID" },
                      { key: "customer", label: "Customer" },
                      { key: "date", label: "Date" },
                      { key: "amount", label: "Total Amount" },
                      { key: "status", label: "Status" },
                      { key: "actions", label: "Actions" },
                    ].map((col) => (
                      <label key={col.key} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-zinc-50 text-xs text-zinc-700 cursor-pointer select-none font-medium transition-all">
                        <input
                          type="checkbox"
                          checked={visibleColumns[col.key]}
                          onChange={() => toggleColumn(col.key)}
                          className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
                        />
                        <span>{col.label}</span>
                      </label>
                    ))}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Export Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger render={
                  <Button variant="outline" size="sm" className="h-9 gap-1.5 border-zinc-200 text-zinc-700 bg-white hover:bg-zinc-50 rounded-md cursor-pointer text-xs font-semibold px-2.5">
                    <Download className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Export</span>
                  </Button>
                } />
                <DropdownMenuContent align="end" className="w-36 bg-white border border-zinc-200 shadow-xl rounded-xl p-1.5 z-50">
                  <DropdownMenuItem onClick={exportFilteredPDF} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-zinc-700 hover:bg-zinc-50 font-medium">
                    <Printer className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Export PDF</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={exportFilteredCSV} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-zinc-700 hover:bg-zinc-50 font-medium">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Export CSV</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Bulk Actions Toolbar */}
          {selectedOrders.length > 0 && (
            <div className="bg-blue-50/50 px-4 py-3 flex items-center justify-between animate-in slide-in-from-top-2">
              <span className="text-sm font-semibold text-blue-800">
                {selectedOrders.length} order{selectedOrders.length > 1 ? 's' : ''} selected
              </span>
              <div className="flex gap-2">
                <Select onValueChange={(val: string | null) => { if (val) updateBulkStatus(val); }}>
                  <SelectTrigger className="w-[180px] h-8 text-xs bg-white text-blue-700">
                    <SelectValue placeholder="Bulk Change Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Confirmed">Mark Confirmed</SelectItem>
                    <SelectItem value="Processing">Mark Processing</SelectItem>
                    <SelectItem value="Shipped">Mark Shipped</SelectItem>
                    <SelectItem value="Delivered">Mark Delivered</SelectItem>
                    <SelectItem value="Cancelled">Mark Cancelled</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs text-zinc-650 border-zinc-200 bg-white"
                  onClick={() => setSelectedOrders([])}
                >
                  Cancel Selection
                </Button>
              </div>
            </div>
          )}

          {/* Orders Table */}
          <div className="border-t border-zinc-200">
            <ScrollArea className="h-[500px] w-full">
              <Table className="min-w-[800px]">
                <TableHeader className="bg-zinc-50/80 sticky top-0 z-10 backdrop-blur-sm border-b border-zinc-200">
                  <TableRow>
                    <TableHead className="w-12 text-center">
                      <input
                        type="checkbox"
                        className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer mt-1"
                        checked={tableOrders.length > 0 && selectedOrders.length === tableOrders.length}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedOrders(tableOrders.map(o => o.id));
                          else setSelectedOrders([]);
                        }}
                      />
                    </TableHead>
                    {visibleColumns.id && <TableHead className="w-[120px] text-zinc-500 font-bold">Order ID</TableHead>}
                    {visibleColumns.customer && <TableHead className="text-zinc-500 font-bold">Customer</TableHead>}
                    {visibleColumns.date && <TableHead className="text-zinc-500 font-bold">Date</TableHead>}
                    {visibleColumns.amount && <TableHead className="text-zinc-500 font-bold">Total Amount</TableHead>}
                    {visibleColumns.status && <TableHead className="text-zinc-500 font-bold">Status</TableHead>}
                    {visibleColumns.actions && <TableHead className="text-right pr-6 text-zinc-500 font-bold">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-zinc-100">
                  {tableLoading ? (
                    <TableRow>
                      <TableCell colSpan={activeColSpan} className="h-60 text-center">
                        <div className="flex flex-col items-center justify-center gap-2 py-8 text-zinc-500">
                          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                          <p className="text-xs font-semibold">Loading orders...</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : tableOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={activeColSpan} className="h-60 text-center">
                        <div className="flex flex-col items-center justify-center gap-2 py-8">
                          <div className="w-12 h-12 rounded-full bg-zinc-50 flex items-center justify-center text-zinc-400 border border-zinc-100 shadow-inner">
                            <Search className="w-5 h-5" />
                          </div>
                          <p className="text-sm font-bold text-zinc-800 mt-2">No results found</p>
                          <p className="text-xs text-zinc-400 max-w-[240px]">We couldn't find any orders matching "{searchQuery}" or status "{statusFilter}".</p>
                          {(searchQuery || statusFilter !== "All") && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSearchQuery("");
                                setStatusFilter("All");
                              }}
                              className="mt-2 text-xs border-zinc-200 hover:bg-zinc-50"
                            >
                              Clear Filters
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    tableOrders.map((order) => {
                      return (
                        <TableRow
                          key={order.id}
                          className={cn(
                            "hover:bg-zinc-50 transition-all duration-200",
                            selectedOrders.includes(order.id)
                              ? "bg-blue-50/40"
                              : "even:bg-zinc-50/30 hover:translate-x-0.5 hover:shadow-sm"
                          )}
                        >
                          <TableCell className="text-center">
                            <input
                              type="checkbox"
                              className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                              checked={selectedOrders.includes(order.id)}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedOrders(prev => [...prev, order.id]);
                                else setSelectedOrders(prev => prev.filter(id => id !== order.id));
                              }}
                            />
                          </TableCell>
                          {visibleColumns.id && (
                            <TableCell className="font-bold font-mono text-zinc-700 text-xs">
                              {getDisplayOrderId(order.id, order.created_at)}
                            </TableCell>
                          )}
                          {visibleColumns.customer && (
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0", getAvatarBg(order.customer_name))}>
                                  {getInitials(order.customer_name)}
                                </div>
                                <div className="space-y-0.5">
                                  <span className="text-sm font-semibold text-[#18181b] block">{order.customer_name}</span>
                                  <span className="text-[11px] text-zinc-400 block line-clamp-1">{order.customer_email}</span>
                                </div>
                              </div>
                            </TableCell>
                          )}
                          {visibleColumns.date && (
                            <TableCell className="text-xs font-medium text-zinc-500">
                              {new Date(order.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                            </TableCell>
                          )}
                          {visibleColumns.amount && (
                            <TableCell className="font-bold text-sm text-[#18181b]">
                              ₹{parseFloat(order.total_amount || 0).toLocaleString()}
                            </TableCell>
                          )}
                          {visibleColumns.status && (
                            <TableCell>
                              {getStatusBadge(order.status)}
                            </TableCell>
                          )}
                          {visibleColumns.actions && (
                            <TableCell className="text-right pr-6 relative">
                              <DropdownMenu>
                                <DropdownMenuTrigger render={
                                  <Button variant="ghost" size="icon" className="w-8 h-8 p-0 rounded-lg text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 transition-all ml-auto">
                                    <span className="sr-only">Open menu</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                } />
                                <DropdownMenuContent align="end" className="w-52 bg-white border border-zinc-200 shadow-xl rounded-xl">
                                  <DropdownMenuGroup>
                                    <DropdownMenuLabel>Order Actions</DropdownMenuLabel>
                                    <DropdownMenuSeparator />

                                    {getPossibleNextStatuses(order.status).length > 0 && (
                                      <DropdownMenuSub>
                                        <DropdownMenuSubTrigger className="flex cursor-default items-center gap-1.5 rounded-md px-1.5 py-1 text-sm outline-hidden select-none hover:bg-zinc-50">
                                          <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-600" />
                                          Change Status
                                        </DropdownMenuSubTrigger>
                                        <DropdownMenuSubContent className="w-48 bg-white border border-zinc-200 shadow-lg rounded-lg p-1 text-zinc-700 z-50">
                                          {getPossibleNextStatuses(order.status).map((s) => (
                                            <DropdownMenuItem key={s} onClick={() => updateStatus(order.id, s)}>
                                              {s}
                                            </DropdownMenuItem>
                                          ))}
                                        </DropdownMenuSubContent>
                                      </DropdownMenuSub>
                                    )}

                                    {order.status?.toUpperCase() === 'PROCESSING' && (
                                      <DropdownMenuItem onClick={() => {
                                        setSelectedOrder(order);
                                        setTrackingId(order.tracking_id || "");
                                        setCarrier(order.carrier || "");
                                        setTimeout(() => setIsTrackingOpen(true), 50);
                                      }}>
                                        <Truck className="w-4 h-4 mr-2 text-blue-600" />
                                        Update Shipping
                                      </DropdownMenuItem>
                                    )}

                                    {order.payment_status?.toLowerCase() !== 'paid' && order.payment_status !== 'Refunded' && order.payment_status !== 'Refund Pending' && order.payment_method?.toUpperCase() === 'COD' && (
                                      <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => updatePaymentStatus(order.id, "Paid", "COD")}>
                                          Mark Paid (Cash)
                                        </DropdownMenuItem>
                                      </>
                                    )}

                                    {order.payment_status === 'Refund Pending' && (
                                      <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => triggerRefund(order)} disabled={isRefunding}>
                                          Process Refund
                                        </DropdownMenuItem>
                                      </>
                                    )}

                                    {['PROCESSING', 'SHIPPED', 'DELIVERED'].includes(order.status?.toUpperCase()) && (
                                      <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem className="p-0 cursor-pointer">
                                          <Link href={`/uc-admin-portal/orders/${order.id}/label`} target="_blank" className="flex items-center w-full px-2 py-1.5">
                                            <Download className="w-4 h-4 mr-2 text-zinc-600" />
                                            Generate Label
                                          </Link>
                                        </DropdownMenuItem>
                                      </>
                                    )}

                                    <DropdownMenuItem onClick={() => {
                                      setSelectedOrder(order);
                                      setTimeout(() => setIsDetailsOpen(true), 50);
                                    }}>
                                      <Eye className="w-4 h-4 mr-2 text-zinc-600" />
                                      View Details
                                    </DropdownMenuItem>


                                  </DropdownMenuGroup>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
            {!tableLoading && totalItems > 0 && (
              <Pagination
                currentPage={currentPage}
                totalItems={totalItems}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
                variantColor="blue"
              />
            )}
          </div>
        </Card>
      )}

      {/* Tracking Dialog */}
      <Dialog open={isTrackingOpen} onOpenChange={setIsTrackingOpen}>
        <DialogContent className="sm:max-w-[425px] bg-white border border-zinc-200 shadow-xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-zinc-900 font-bold">Shipment Logistics</DialogTitle>
            <DialogDescription className="text-zinc-500">
              Assign carrier information for Order {selectedOrder ? getDisplayOrderId(selectedOrder.id, selectedOrder.created_at) : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 text-zinc-900">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-700">Courier Carrier</label>
              <Select value={carrier} onValueChange={(val) => setCarrier(val || "")}>
                <SelectTrigger className="w-full bg-white border-zinc-200 focus:ring-[#3b82f6] text-[#18181b]">
                  <SelectValue placeholder="Select Carrier Partner" />
                </SelectTrigger>
                <SelectContent className="bg-white border-zinc-200">
                  {carriers.map((c) => (
                    <SelectItem key={c.id} value={c.name}>
                      {c.name}
                    </SelectItem>
                  ))}
                  {carriers.length === 0 && (
                    <SelectItem value="none" disabled>
                      No active carriers found
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-700">Tracking ID</label>
              <Input
                value={trackingId}
                onChange={(e) => setTrackingId(e.target.value)}
                placeholder="Enter tracking barcode number"
                className="bg-white border-zinc-200 focus-visible:ring-[#3b82f6] text-[#18181b]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTrackingOpen(false)} className="border-zinc-200 text-zinc-600 hover:bg-zinc-50 rounded-xl" disabled={isUpdatingTracking}>Cancel</Button>
            <Button onClick={() => updateTracking(selectedOrder?.id)} className="bg-[#3b82f6] hover:bg-[#2563eb] text-white font-bold border-0 rounded-xl" disabled={isUpdatingTracking}>
              {isUpdatingTracking ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating...</> : 'Update Shipment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="sm:max-w-[600px] gap-0 p-0 bg-white border border-zinc-200 shadow-xl rounded-2xl overflow-hidden">
          <DialogHeader className="p-6 pb-4 border-b border-zinc-150">
            <DialogTitle className="text-zinc-900 font-bold">
              Order Details - {selectedOrder ? getDisplayOrderId(selectedOrder.id, selectedOrder.created_at) : ""}
            </DialogTitle>
            <DialogDescription className="text-zinc-500">
              Manage order status and view customer details
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh]">
            {selectedOrder && (
              <div className="p-6 space-y-6 text-[#18181b]">
                {/* Order Status Controller */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-zinc-50 rounded-2xl border border-zinc-200 shadow-xs">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Status:</span>
                    {getStatusBadge(selectedOrder.status)}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-zinc-600">Update Status:</span>
                    <Select
                      value={selectedOrder.status}
                      onValueChange={async (newStatus) => {
                        const updated = await updateStatus(selectedOrder.id, newStatus);
                        if (updated) {
                          setSelectedOrder((prev: any) => ({ ...prev, ...updated }));
                        } else {
                          setSelectedOrder((prev: any) => ({ ...prev, status: newStatus }));
                        }
                      }}
                      disabled={getPossibleNextStatuses(selectedOrder.status).length === 0}
                    >
                      <SelectTrigger className="w-[180px] h-9 bg-white border-zinc-200 text-sm font-medium text-zinc-850 focus:ring-2 focus:ring-blue-500 rounded-xl">
                        <SelectValue placeholder="Select Status" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border border-zinc-200 rounded-xl shadow-lg z-50">
                        {/* Include the current status so it remains visible in trigger */}
                        <SelectItem value={selectedOrder.status}>{selectedOrder.status}</SelectItem>
                        {getPossibleNextStatuses(selectedOrder.status)
                          .filter((s) => s.toUpperCase() !== selectedOrder.status.toUpperCase())
                          .map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))
                        }
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-6 text-sm">
                  <div className="space-y-1">
                    <h4 className="font-bold text-zinc-900">Customer Information</h4>
                    <p className="text-zinc-600">{selectedOrder.customer_name}</p>
                    <p className="text-zinc-500 text-xs">{selectedOrder.customer_email}</p>
                    <p className="text-zinc-500 text-xs">{selectedOrder.phone}</p>
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-zinc-900">Shipping Address</h4>
                    <p className="text-zinc-600 text-xs leading-relaxed whitespace-pre-wrap">
                      {selectedOrder.shipping_address || "No shipping record details"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-zinc-900">Payment Details</h4>
                    <p className="text-zinc-600 text-xs font-semibold uppercase">
                      {selectedOrder.is_emi ? "EMI / INSTALLMENTS" : (selectedOrder.payment_method || 'N/A')}
                    </p>
                    <p className={cn(
                      "text-xs font-bold",
                      selectedOrder.payment_status?.toLowerCase() === 'paid' ? 'text-emerald-600' :
                        selectedOrder.payment_status === 'Refund Pending' ? 'text-orange-600' :
                          selectedOrder.payment_status === 'Refunded' ? 'text-indigo-650 font-bold' :
                            'text-amber-600'
                    )}>
                      {selectedOrder.payment_status || 'Unpaid'}
                    </p>

                    {selectedOrder.is_emi && (
                      <div className="mt-2 p-2 bg-zinc-50 border border-zinc-200 rounded-lg text-[10px] space-y-1 font-semibold text-zinc-650">
                        <p className="font-bold text-zinc-800 uppercase tracking-wide">EMI Breakup</p>
                        <div>Provider: <span className="font-bold text-zinc-950">{selectedOrder.emi_details?.provider_name || 'N/A'}</span></div>
                        <div>Tenure: <span className="font-bold text-zinc-950">{selectedOrder.emi_tenure} Months</span></div>
                        <div>Installment: <span className="font-bold text-zinc-950">₹{selectedOrder.emi_monthly_installment}/mo</span></div>
                        <div>Interest: <span className="font-bold text-zinc-950">{selectedOrder.emi_interest_rate}% p.a.</span></div>
                        <div className="border-t border-zinc-200 pt-1 mt-1 font-bold text-zinc-850">
                          Total Payable: <span className="font-black text-zinc-950">₹{selectedOrder.emi_total_payable}</span>
                        </div>
                      </div>
                    )}

                    {selectedOrder.transaction_id && (
                      <p className="text-zinc-500 text-[10px] font-mono mt-1 break-all">
                        Txn ID: {selectedOrder.transaction_id}
                      </p>
                    )}
                    {selectedOrder.razorpay_order_id && (
                      <p className="text-zinc-500 text-[10px] font-mono mt-0.5 break-all">
                        Rzp Ord: {selectedOrder.razorpay_order_id}
                      </p>
                    )}
                    {selectedOrder.razorpay_payment_id && (
                      <p className="text-zinc-500 text-[10px] font-mono mt-0.5 break-all">
                        Rzp Pay: {selectedOrder.razorpay_payment_id}
                      </p>
                    )}

                    {(selectedOrder.transaction_id || selectedOrder.razorpay_payment_id) && (
                      <div className="pt-1.5">
                        <Link
                          href={`/uc-admin-portal/payments?search=${selectedOrder.transaction_id || selectedOrder.razorpay_payment_id}`}
                          className="inline-flex items-center gap-1 text-[10px] font-extrabold text-blue-600 hover:text-blue-800 transition-colors uppercase tracking-wider"
                        >
                          View Payment Record &rarr;
                        </Link>
                      </div>
                    )}

                    {selectedOrder.payment_status === 'Refund Pending' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2 text-[10px] h-7 border-orange-200 text-orange-700 bg-orange-50 hover:bg-orange-100 hover:text-orange-800 font-bold rounded-lg w-full"
                        onClick={() => triggerRefund(selectedOrder)}
                        disabled={isRefunding}
                      >
                        {isRefunding ? "Processing..." : "Process Refund"}
                      </Button>
                    )}
                  </div>
                </div>

                {selectedOrder.refund_bank_details && (
                  <div className="mt-4 p-4 rounded-xl bg-orange-50 border border-orange-200">
                    <h4 className="font-bold text-sm text-orange-900 mb-3">Customer Bank Details for Refund</h4>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-orange-700/70 font-semibold uppercase tracking-wider block mb-1">Bank Name</span>
                        <span className="font-bold text-orange-950">{selectedOrder.refund_bank_details.bankName}</span>
                      </div>
                      <div>
                        <span className="text-orange-700/70 font-semibold uppercase tracking-wider block mb-1">Account Name</span>
                        <span className="font-bold text-orange-950">{selectedOrder.refund_bank_details.accountName}</span>
                      </div>
                      <div>
                        <span className="text-orange-700/70 font-semibold uppercase tracking-wider block mb-1">Account No</span>
                        <span className="font-bold text-orange-950 font-mono tracking-widest">{selectedOrder.refund_bank_details.accountNumber}</span>
                      </div>
                      <div>
                        <span className="text-orange-700/70 font-semibold uppercase tracking-wider block mb-1">IFSC Code</span>
                        <span className="font-bold text-orange-950 uppercase">{selectedOrder.refund_bank_details.ifscCode}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <h4 className="font-bold text-sm text-zinc-900">Purchased Items</h4>
                  <div className="rounded-xl border border-zinc-200 overflow-hidden">
                    <Table>
                      <TableHeader className="bg-zinc-50">
                        <TableRow className="border-b border-zinc-200">
                          <TableHead className="font-bold text-zinc-600">Product Name</TableHead>
                          <TableHead className="text-center w-16 font-bold text-zinc-600">Qty</TableHead>
                          <TableHead className="text-right font-bold text-zinc-600">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="divide-y divide-zinc-100">
                        {selectedOrder.items?.map((item: any, i: number) => (
                          <TableRow key={i} className="hover:bg-zinc-50 border-b border-zinc-100">
                            <TableCell className="font-medium text-[#18181b]">{item.products?.name}</TableCell>
                            <TableCell className="text-center text-zinc-600">x{item.quantity}</TableCell>
                            <TableCell className="text-right font-bold text-[#18181b]">₹{parseFloat(item.unit_price).toLocaleString('en-IN')}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Pricing Summary Breakdown */}
                {(() => {
                  const subtotal = selectedOrder.items?.reduce((sum: number, item: any) => sum + (item.quantity * parseFloat(item.unit_price)), 0) || 0;
                  return (
                    <div className="border border-zinc-200 rounded-xl p-4 bg-zinc-50/50 space-y-2.5">
                      <div className="flex justify-between text-xs font-bold text-zinc-500">
                        <span>SUBTOTAL</span>
                        <span>₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      {parseFloat(selectedOrder.tax_amount || 0) > 0 && (
                        <div className="flex justify-between text-xs font-bold text-zinc-500">
                          <span>GST</span>
                          <span>₹{parseFloat(selectedOrder.tax_amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      )}
                      {parseFloat(selectedOrder.shipping_amount || 0) > 0 && (
                        <div className="flex justify-between text-xs font-bold text-zinc-500">
                          <span>DELIVERY CHARGE</span>
                          <span>₹{parseFloat(selectedOrder.shipping_amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      )}
                      {parseFloat(selectedOrder.discount_amount || 0) > 0 && (
                        <div className="flex justify-between text-xs font-bold text-rose-600">
                          <span>COUPON DISCOUNT</span>
                          <span>-₹{parseFloat(selectedOrder.discount_amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {(selectedOrder.tracking_id || selectedOrder.delivery_estimate) && (
                  <div className="grid grid-cols-2 gap-4">
                    {selectedOrder.delivery_estimate && (
                      <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 flex flex-col gap-1">
                        <span className="text-xs font-semibold text-zinc-505">Expected Arrival</span>
                        <span className="text-sm font-bold text-[#18181b]">{selectedOrder.delivery_estimate}</span>
                      </div>
                    )}
                    {selectedOrder.tracking_id && (
                      <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 flex flex-col gap-1">
                        <span className="text-xs font-semibold text-zinc-505">{selectedOrder.carrier}</span>
                        <span className="text-sm font-bold font-mono text-[#18181b]">{selectedOrder.tracking_id}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          <div className="p-6 bg-zinc-50 border-t border-zinc-200 flex items-center justify-between mt-auto">
            <span className="text-sm font-bold text-zinc-600">Total Invoice Amount</span>
            <span className="text-xl font-extrabold text-[#18181b]">
              ₹{selectedOrder ? parseFloat(selectedOrder.total_amount).toLocaleString('en-IN') : 0}
            </span>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}