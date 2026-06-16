"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MapPin, Plus, Edit2, Trash2, Home, Building2, CheckCircle2, Save, X, Briefcase, ArrowLeft, Loader2 } from "lucide-react";

import { createClient } from "@/utils/supabase/client";
import toast from "react-hot-toast";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function AddressBookPage() {
  const [addresses, setAddresses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [currentAddress, setCurrentAddress] = useState<any>({
    type: "Home",
    full_name: "",
    phone: "",
    address_line1: "",
    address_line2: "",
    city: "",
    state: "",
    postal_code: "",
    country: "India",
    is_default: false
  });
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo");

  useEffect(() => {
    fetchAddresses();
  }, []);

  useEffect(() => {
    const postalCode = currentAddress.postal_code;
    if (postalCode && postalCode.length === 6 && /^\d+$/.test(postalCode)) {
      const fetchPincodeDetails = async () => {
        try {
          const res = await fetch(`https://api.postalpincode.in/pincode/${postalCode}`);
          if (!res.ok) throw new Error("Pincode API failed");
          const data = await res.json();
          if (data && data[0] && data[0].Status === "Success" && data[0].PostOffice && data[0].PostOffice.length > 0) {
            const info = data[0].PostOffice[0];
            setCurrentAddress((prev: any) => ({
              ...prev,
              city: info.District || prev.city,
              state: info.State || prev.state
            }));
            toast.success(`Location auto-filled: ${info.District}, ${info.State}`);
          }
        } catch (err) {
          console.error("Error fetching pincode details:", err);
        }
      };
      fetchPincodeDetails();
    }
  }, [currentAddress.postal_code]);

  async function fetchAddresses() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("addresses")
        .select("*")
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAddresses(data || []);
    } catch (error: any) {
      toast.error(error.message || "Error fetching addresses");
    } finally {
      setLoading(false);
    }
  }

  const handleSave = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("addresses")
        .upsert({
          ...currentAddress,
          user_id: user.id,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      const isNew = !currentAddress.id;
      toast.success(isNew ? "Address added successfully!" : "Address updated");
      setIsEditing(false);
      setCurrentAddress({
        type: "Home",
        full_name: "",
        phone: "",
        address_line1: "",
        address_line2: "",
        city: "",
        state: "",
        postal_code: "",
        country: "India",
        is_default: false
      });

      // If we came from checkout (or any returnTo destination), go back there after saving
      if (isNew && returnTo) {
        toast.success("Redirecting back to checkout...");
        setTimeout(() => router.push(returnTo), 600);
        return;
      }

      fetchAddresses();
    } catch (error: any) {
      toast.error(error.message || "Error saving address");
    }
  };


  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("addresses")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Address deleted");
      setDeleteId(null);
      fetchAddresses();
    } catch (error: any) {
      toast.error(error.message || "Error deleting address");
    }
  };

  const setAsDefault = async (id: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from("addresses").update({ is_default: false }).eq("user_id", user.id);
      const { error } = await supabase.from("addresses").update({ is_default: true }).eq("id", id);

      if (error) throw error;
      toast.success("Default address updated");
      fetchAddresses();
    } catch (error: any) {
      toast.error(error.message || "Error setting default");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 animate-spin text-red-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-zinc-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-900">Address Book</h1>
          <p className="text-sm text-zinc-500 mt-1">Manage your delivery addresses</p>
          {returnTo && (
            <Link
              href={returnTo}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-600 hover:text-zinc-900 mt-2"
            >
              <ArrowLeft className="w-3 h-3" /> Back to Checkout
            </Link>
          )}
        </div>
        {!isEditing && (
          <Button
            onClick={() => {
              setCurrentAddress({
                type: "Home",
                full_name: "",
                phone: "",
                address_line1: "",
                address_line2: "",
                city: "",
                state: "",
                postal_code: "",
                country: "India",
                is_default: false
              });
              setIsEditing(true);
            }}
            className="h-9 bg-red-600 hover:bg-red-700 text-white text-sm font-medium animate-in fade-in duration-205"
          >
            <Plus className="w-4 h-4 mr-2" /> New Address
          </Button>
        )}
      </div>

      {/* Edit/Add Form Section */}
      {isEditing && (
        <Card className="border-zinc-200 animate-in zoom-in-95 duration-200">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>{currentAddress.id ? "Update Address" : "Add New Address"}</CardTitle>
            <button onClick={() => setIsEditing(false)} className="p-1.5 hover:bg-zinc-100 rounded-md transition-colors">
              <X className="w-4 h-4 text-zinc-500" />
            </button>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Address Type Selector */}
            <div className="space-y-3">
              <Label>Location Type</Label>
              <div className="flex flex-wrap gap-3">
                {[
                  { id: 'Home', icon: Home, desc: 'Residential' },
                  { id: 'Work', icon: Building2, desc: 'Corporate / Lab' }
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setCurrentAddress({ ...currentAddress, type: t.id })}
                    className={`flex items-center gap-3 px-5 py-3 rounded-lg border transition-all text-sm ${currentAddress.type === t.id
                      ? "border-red-600 bg-gray-50 text-red-650 font-bold"
                      : "border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300"
                      }`}
                  >
                    <t.icon className="w-4 h-4" />
                    <div className="text-left">
                      <p className="font-medium">{t.id}</p>
                      <p className="text-[10px] text-zinc-400">{t.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Form Fields - Premium Grid Layout */}
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              <div className="space-y-2 md:col-span-3">
                <Label className="text-sm">Full Name</Label>
                <Input
                  type="text"
                  value={currentAddress.full_name || ""}
                  onChange={(e) => setCurrentAddress({ ...currentAddress, full_name: e.target.value })}
                  className="h-10 border-zinc-200"
                />
              </div>

              <div className="space-y-2 md:col-span-3">
                <Label className="text-sm">Mobile Number</Label>
                <Input
                  type="text"
                  value={currentAddress.phone || ""}
                  onChange={(e) => setCurrentAddress({ ...currentAddress, phone: e.target.value })}
                  className="h-10 border-zinc-200"
                />
              </div>

              <div className="space-y-2 md:col-span-6">
                <Label className="text-sm">Address Line 1</Label>
                <Input
                  type="text"
                  value={currentAddress.address_line1 || ""}
                  onChange={(e) => setCurrentAddress({ ...currentAddress, address_line1: e.target.value })}
                  className="h-10 border-zinc-200"
                />
              </div>

              <div className="space-y-2 md:col-span-6">
                <Label className="text-sm">Address Line 2 (Optional)</Label>
                <Input
                  type="text"
                  value={currentAddress.address_line2 || ""}
                  onChange={(e) => setCurrentAddress({ ...currentAddress, address_line2: e.target.value })}
                  className="h-10 border-zinc-200"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label className="text-sm">City</Label>
                <Input
                  type="text"
                  value={currentAddress.city || ""}
                  onChange={(e) => setCurrentAddress({ ...currentAddress, city: e.target.value })}
                  className="h-10 border-zinc-200"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label className="text-sm">State</Label>
                <Input
                  type="text"
                  value={currentAddress.state || ""}
                  onChange={(e) => setCurrentAddress({ ...currentAddress, state: e.target.value })}
                  className="h-10 border-zinc-200"
                />
              </div>

              <div className="space-y-2 md:col-span-1">
                <Label className="text-sm">PIN Code</Label>
                <Input
                  type="text"
                  value={currentAddress.postal_code || ""}
                  onChange={(e) => setCurrentAddress({ ...currentAddress, postal_code: e.target.value })}
                  className="h-10 border-zinc-200"
                />
              </div>

              <div className="space-y-2 md:col-span-1">
                <Label className="text-sm">Country</Label>
                <Input
                  type="text"
                  value={currentAddress.country || ""}
                  onChange={(e) => setCurrentAddress({ ...currentAddress, country: e.target.value })}
                  className="h-10 border-zinc-200"
                />
              </div>
            </div>

            <Separator />

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <Button
                onClick={handleSave}
                className="h-9 bg-red-600 hover:bg-red-700 text-white w-full sm:w-auto text-sm"
              >
                <Save className="w-4 h-4 mr-2" /> Save Address
              </Button>
              <Button
                variant="ghost"
                onClick={() => setIsEditing(false)}
                className="h-9 w-full sm:w-auto text-sm text-zinc-600"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Address Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {addresses.map((addr) => (
          <Card key={addr.id} className={`border transition-all ${addr.is_default ? "border-red-600 shadow-md" : "border-zinc-200 hover:border-zinc-300"}`}>
            <CardContent className="py-5 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${addr.is_default ? "bg-red-600 text-white" : "bg-zinc-100 text-zinc-500"}`}>
                    {addr.type === "Work" ? <Briefcase className="w-4 h-4" /> : <Home className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-zinc-900">{addr.full_name}</h3>
                      <Badge variant="secondary" className="text-[10px] h-4">{addr.type}</Badge>
                    </div>
                  </div>
                </div>
                {addr.is_default && (
                  <Badge className="bg-red-600 text-white text-[10px]">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Primary
                  </Badge>
                )}
              </div>

              <div className="space-y-0.5 text-xs text-zinc-600 pl-12">
                <p className="flex items-center gap-1.5">
                  <MapPin className="w-3 h-3 text-zinc-400 shrink-0" /> {addr.address_line1}
                </p>
                {addr.address_line2 && <p className="pl-[18px]">{addr.address_line2}</p>}
                <p className="pl-[18px]">{addr.city}, {addr.state} — {addr.postal_code}</p>
                <p className="pl-[18px] text-zinc-400">{addr.country}</p>
                {addr.phone && <p className="pl-[18px] text-zinc-500 font-medium mt-1">Mobile: {addr.phone}</p>}
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setCurrentAddress(addr); setIsEditing(true); }}
                    className="text-xs h-7 text-zinc-600"
                  >
                    <Edit2 className="w-3 h-3 mr-1" /> Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteId(addr.id)}
                    className="text-xs h-7 text-zinc-600 hover:text-red-600"
                  >
                    <Trash2 className="w-3 h-3 mr-1" /> Delete
                  </Button>
                </div>

                {!addr.is_default && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAsDefault(addr.id)}
                    className="text-xs h-7"
                  >
                    Set as Primary
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Empty State */}
        {addresses.length === 0 && !isEditing && (
          <div className="md:col-span-2">
            <Card className="border-zinc-200 border-dashed">
              <CardContent className="py-16 text-center space-y-4">
                <div className="w-14 h-14 bg-zinc-100 rounded-full flex items-center justify-center mx-auto">
                  <MapPin className="w-6 h-6 text-zinc-400" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-zinc-900">No addresses yet</h3>
                  <p className="text-sm text-zinc-500 max-w-xs mx-auto mt-1">Add a shipping address to streamline your checkout.</p>
                </div>
                <Button
                  onClick={() => setIsEditing(true)}
                  className="bg-red-600 hover:bg-red-700 text-white h-9 px-6 text-sm"
                >
                  Add Your First Address
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Address</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this address? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setDeleteId(null)} className="h-9 text-sm">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteId && handleDelete(deleteId)}
              className="h-9 text-sm"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete Address
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
