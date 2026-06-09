"use client";

import { useState, useEffect } from "react";
import { createAdminClient as createClient } from "@/utils/supabase/admin-client";
import {
  Plus,
  Trash2,
  ChevronRight,
  Settings2,
  Layers,
  Grid,
  ListCollapse,
  Loader2,
  Edit,
  Check,
  X,
  AlertTriangle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

// UI components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import LogoLoader from "@/components/ui/LogoLoader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export default function AttributeManagementPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [attributes, setAttributes] = useState<any[]>([]);

  // Form states
  const [groupName, setGroupName] = useState("");
  const [isSavingGroup, setIsSavingGroup] = useState(false);
  const [isSavingAttribute, setIsSavingAttribute] = useState(false);

  // Group operations state
  const [editingGroup, setEditingGroup] = useState<any>(null);
  const [editGroupName, setEditGroupName] = useState("");
  const [isRenamingGroup, setIsRenamingGroup] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<any>(null);
  const [isDeletingGroup, setIsDeletingGroup] = useState(false);

  // Attribute operations state
  const [editingAttribute, setEditingAttribute] = useState<any>(null);
  const [isUpdatingAttribute, setIsUpdatingAttribute] = useState(false);
  const [attributeToDelete, setAttributeToDelete] = useState<any>(null);
  const [isDeletingAttribute, setIsDeletingAttribute] = useState(false);

  const [attrForm, setAttrForm] = useState({
    name: "",
    type: "text",
    is_required: false,
    is_filterable: false,
    is_searchable: false,
    has_variants: false,
    options: ""
  });

  const [editAttrForm, setEditAttrForm] = useState({
    name: "",
    type: "text",
    is_required: false,
    is_filterable: false,
    is_searchable: false,
    has_variants: false,
    options: ""
  });

  useEffect(() => {
    async function fetchCategories() {
      const { data } = await supabase.from("categories").select("*").order("name");
      if (data) setCategories(data);
      setLoading(false);
    }
    fetchCategories();
  }, [supabase]);

  useEffect(() => {
    if (selectedCategory) {
      fetchGroups(selectedCategory.id);
    } else {
      setGroups([]);
      setSelectedGroup(null);
    }
  }, [selectedCategory, supabase]);

  useEffect(() => {
    if (selectedGroup) {
      fetchAttributes(selectedGroup.id);
    } else {
      setAttributes([]);
    }
  }, [selectedGroup, supabase]);

  async function fetchGroups(catId: string) {
    const { data } = await supabase
      .from("attribute_groups")
      .select("*")
      .eq("category_id", catId)
      .order("display_order");
    setGroups(data || []);
  }

  async function fetchAttributes(groupId: string) {
    const { data } = await supabase
      .from("attributes")
      .select("*")
      .eq("group_id", groupId)
      .order("display_order");
    setAttributes(data || []);
  }

  const handleAddGroup = async () => {
    if (!groupName || !selectedCategory) return;
    setIsSavingGroup(true);
    const { data, error } = await supabase
      .from("attribute_groups")
      .insert([{
        name: groupName,
        category_id: selectedCategory.id,
        display_order: groups.length
      }])
      .select()
      .single();

    if (error) {
      toast.error(error.message);
    } else {
      setGroups([...groups, data]);
      setGroupName("");
      toast.success("Group successfully added");
    }
    setIsSavingGroup(false);
  };

  const handleRenameGroup = async () => {
    if (!editingGroup || !editGroupName.trim()) return;
    setIsRenamingGroup(true);
    const { error } = await supabase
      .from("attribute_groups")
      .update({ name: editGroupName })
      .eq("id", editingGroup.id);

    if (error) {
      toast.error(error.message);
    } else {
      setGroups(groups.map(g => g.id === editingGroup.id ? { ...g, name: editGroupName } : g));
      if (selectedGroup?.id === editingGroup.id) {
        setSelectedGroup({ ...selectedGroup, name: editGroupName });
      }
      toast.success("Group successfully renamed");
      setEditingGroup(null);
    }
    setIsRenamingGroup(false);
  };

  const handleDeleteGroup = async () => {
    if (!groupToDelete) return;
    setIsDeletingGroup(true);
    const { error } = await supabase
      .from("attribute_groups")
      .delete()
      .eq("id", groupToDelete.id);

    if (error) {
      toast.error(error.message);
    } else {
      setGroups(groups.filter(g => g.id !== groupToDelete.id));
      if (selectedGroup?.id === groupToDelete.id) {
        setSelectedGroup(null);
      }
      toast.success("Group successfully deleted");
      setGroupToDelete(null);
    }
    setIsDeletingGroup(false);
  };

  const handleAddAttribute = async () => {
    if (!attrForm.name || !selectedGroup) return;
    setIsSavingAttribute(true);

    const { data, error } = await supabase
      .from("attributes")
      .insert([{
        group_id: selectedGroup.id,
        name: attrForm.name,
        type: attrForm.type,
        is_required: attrForm.is_required,
        is_filterable: attrForm.is_filterable,
        is_searchable: attrForm.is_searchable,
        has_variants: attrForm.has_variants,
        display_order: attributes.length,
        options: attrForm.options ? attrForm.options.split(",").map(s => s.trim()) : []
      }])
      .select()
      .single();

    if (error) {
      toast.error(error.message);
    } else {
      setAttributes([...attributes, data]);
      setAttrForm({
        name: "",
        type: "text",
        is_required: false,
        is_filterable: false,
        is_searchable: false,
        has_variants: false,
        options: ""
      });
      toast.success("Attribute successfully added");
    }
    setIsSavingAttribute(false);
  };

  const handleStartEditAttribute = (attr: any) => {
    setEditingAttribute(attr);
    setEditAttrForm({
      name: attr.name,
      type: attr.type,
      is_required: !!attr.is_required,
      is_filterable: !!attr.is_filterable,
      is_searchable: !!attr.is_searchable,
      has_variants: !!attr.has_variants,
      options: Array.isArray(attr.options) ? attr.options.join(", ") : ""
    });
  };

  const handleSaveEditAttribute = async () => {
    if (!editingAttribute || !editAttrForm.name.trim()) return;
    setIsUpdatingAttribute(true);

    const updatedPayload = {
      name: editAttrForm.name,
      type: editAttrForm.type,
      is_required: editAttrForm.is_required,
      is_filterable: editAttrForm.is_filterable,
      is_searchable: editAttrForm.is_searchable,
      has_variants: editAttrForm.has_variants,
      options: editAttrForm.options ? editAttrForm.options.split(",").map(s => s.trim()) : []
    };

    const { error } = await supabase
      .from("attributes")
      .update(updatedPayload)
      .eq("id", editingAttribute.id);

    if (error) {
      toast.error(error.message);
    } else {
      setAttributes(attributes.map(a => a.id === editingAttribute.id ? { ...a, ...updatedPayload } : a));
      toast.success("Attribute successfully updated");
      setEditingAttribute(null);
    }
    setIsUpdatingAttribute(false);
  };

  const handleDeleteAttribute = async () => {
    if (!attributeToDelete) return;
    setIsDeletingAttribute(true);
    const { error } = await supabase
      .from("attributes")
      .delete()
      .eq("id", attributeToDelete.id);

    if (error) {
      toast.error(error.message);
    } else {
      setAttributes(attributes.filter(a => a.id !== attributeToDelete.id));
      toast.success("Attribute successfully deleted");
      setAttributeToDelete(null);
    }
    setIsDeletingAttribute(false);
  };

  if (loading) return <LogoLoader text="Loading specifications..." />;

  return (
    <div className="space-y-6 w-full px-4 sm:px-6 lg:px-8">
      {/* Fuchsia Gradient Banner */}
      <div className="bg-gradient-to-r from-fuchsia-600 via-fuchsia-700 to-pink-500 rounded-3xl p-6 text-white shadow-md relative overflow-hidden mb-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 relative z-10">
          <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center border border-white/20 shrink-0">
            <Settings2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight border-none p-0 !pl-0 before:hidden">Attribute Management</h1>
            <p className="text-sm font-medium text-fuchsia-50 mt-1">Define dynamic specifications and mapping structures for your product categories</p>
          </div>
        </div>
      </div>

      {/* 3-Column Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* Column 1: Categories */}
        <Card className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden flex flex-col h-[650px] py-0 gap-0">
          <CardHeader className="p-4 border-b border-zinc-100 bg-zinc-50/30 flex-row gap-2.5 items-center space-y-0">
            <Layers className="w-4 h-4 text-teal-600" />
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Categories Directory</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-3 space-y-1">
            {categories.map((cat) => {
              const isSelected = selectedCategory?.id === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategory(cat);
                    setSelectedGroup(null);
                  }}
                  className={cn(
                    "w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all flex items-center justify-between border",
                    isSelected
                      ? "bg-teal-50/50 text-teal-700 border-teal-150 shadow-sm"
                      : "border-transparent text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950"
                  )}
                >
                  <span className="truncate pr-2">{cat.name}</span>
                  <ChevronRight className={cn("w-4 h-4 transition-transform shrink-0", isSelected ? "translate-x-0.5 text-teal-600" : "text-zinc-400")} />
                </button>
              );
            })}
          </CardContent>
        </Card>

        {/* Column 2: Groups */}
        <Card className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden flex flex-col h-[650px] py-0 gap-0">
          <CardHeader className="p-4 border-b border-zinc-100 bg-zinc-50/30 flex-row gap-2.5 items-center space-y-0">
            <Grid className="w-4 h-4 text-teal-600" />
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Specs Groups</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
            {selectedCategory ? (
              <div className="space-y-4 h-full flex flex-col">
                <div className="flex gap-2 shrink-0">
                  <Input
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="New Group Name..."
                    className="h-10 border-zinc-200 rounded-xl text-sm focus-visible:ring-1 focus-visible:ring-teal-600 focus-visible:border-teal-600 placeholder:text-zinc-400"
                  />
                  <Button
                    onClick={handleAddGroup}
                    disabled={isSavingGroup || !groupName.trim()}
                    className="bg-zinc-900 hover:bg-zinc-800 text-white h-10 px-4 rounded-xl text-sm font-medium transition-all shadow-sm shrink-0"
                  >
                    {isSavingGroup ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add"}
                  </Button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5">
                  {groups.map((group) => {
                    const isSelected = selectedGroup?.id === group.id;
                    return (
                      <div
                        key={group.id}
                        className={cn(
                          "w-full flex items-center justify-between rounded-xl border text-sm font-medium transition-all group/item pr-2",
                          isSelected
                            ? "border-teal-600 bg-teal-50/20 text-teal-700 shadow-sm"
                            : "border-zinc-100 bg-white text-zinc-600 hover:border-zinc-350 hover:text-zinc-950"
                        )}
                      >
                        <button
                          onClick={() => setSelectedGroup(group)}
                          className="flex-1 text-left px-4 py-3 min-w-0"
                        >
                          <span className="block truncate">{group.name}</span>
                        </button>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover/item:opacity-100 transition-opacity shrink-0">
                          <button
                            onClick={() => {
                              setEditingGroup(group);
                              setEditGroupName(group.name);
                            }}
                            className="w-7 h-7 flex items-center justify-center text-zinc-400 hover:text-zinc-850 hover:bg-zinc-100 rounded-lg transition-colors"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setGroupToDelete(group)}
                            className="w-7 h-7 flex items-center justify-center text-zinc-400 hover:text-red-600 hover:bg-red-50/50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {groups.length === 0 && (
                    <div className="text-center py-12 text-zinc-400 text-xs font-medium">No specification groups set</div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-20 text-zinc-400 text-xs font-medium max-w-[200px] mx-auto leading-relaxed">
                Select a category directory first to configure parameters
              </div>
            )}
          </CardContent>
        </Card>

        {/* Column 3: Attributes */}
        <Card className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden flex flex-col h-[650px] py-0 gap-0">
          <CardHeader className="p-4 border-b border-zinc-100 bg-zinc-50/30 flex-row gap-2.5 items-center space-y-0">
            <ListCollapse className="w-4 h-4 text-teal-600" />
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Attributes Definition</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 flex flex-col">
            {selectedGroup ? (
              <div className="space-y-4 h-full flex flex-col min-h-0">
                <div className="bg-zinc-50/40 p-4 rounded-xl border border-zinc-100 space-y-3 shrink-0">
                  <Input
                    placeholder="Attribute Name (e.g. Volume)"
                    className="h-10 border-zinc-200 bg-white rounded-xl text-sm focus-visible:ring-1 focus-visible:ring-teal-600 focus-visible:border-teal-600 placeholder:text-zinc-400"
                    value={attrForm.name}
                    onChange={(e) => setAttrForm({ ...attrForm, name: e.target.value })}
                  />

                  <Select
                    value={attrForm.type}
                    onValueChange={(val) => setAttrForm({ ...attrForm, type: val || "text" })}
                  >
                    <SelectTrigger className="h-10 border-zinc-200 bg-white rounded-xl text-sm focus:ring-teal-600">
                      <SelectValue placeholder="Select Type" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-zinc-200 rounded-xl">
                      <SelectItem value="text" className="text-xs">Text value</SelectItem>
                      <SelectItem value="number" className="text-xs">Numeric value</SelectItem>
                      <SelectItem value="dropdown" className="text-xs">Dropdown choices</SelectItem>
                      <SelectItem value="boolean" className="text-xs">Yes/No flag</SelectItem>
                    </SelectContent>
                  </Select>

                  {attrForm.type === 'dropdown' && (
                    <Input
                      placeholder="Options (comma separated)"
                      className="h-10 border-zinc-200 bg-white rounded-xl text-sm focus-visible:ring-1 focus-visible:ring-teal-600 focus-visible:border-teal-600 placeholder:text-zinc-400"
                      value={attrForm.options}
                      onChange={(e) => setAttrForm({ ...attrForm, options: e.target.value })}
                    />
                  )}

                  {/* Metadata switches */}
                  <div className="grid grid-cols-2 gap-x-2 gap-y-2 p-2 bg-white rounded-xl border border-zinc-150">
                    <div className="flex items-center justify-between px-1">
                      <Label htmlFor="attr-req" className="text-[10px] text-zinc-500 font-semibold cursor-pointer">Required</Label>
                      <Switch
                        id="attr-req"
                        checked={attrForm.is_required}
                        onCheckedChange={(checked) => setAttrForm({ ...attrForm, is_required: checked })}
                        className="data-[state=checked]:bg-teal-600 scale-[0.7] origin-right"
                      />
                    </div>
                    <div className="flex items-center justify-between px-1">
                      <Label htmlFor="attr-filt" className="text-[10px] text-zinc-500 font-semibold cursor-pointer">Filterable</Label>
                      <Switch
                        id="attr-filt"
                        checked={attrForm.is_filterable}
                        onCheckedChange={(checked) => setAttrForm({ ...attrForm, is_filterable: checked })}
                        className="data-[state=checked]:bg-teal-600 scale-[0.7] origin-right"
                      />
                    </div>
                    <div className="flex items-center justify-between px-1">
                      <Label htmlFor="attr-srch" className="text-[10px] text-zinc-500 font-semibold cursor-pointer">Searchable</Label>
                      <Switch
                        id="attr-srch"
                        checked={attrForm.is_searchable}
                        onCheckedChange={(checked) => setAttrForm({ ...attrForm, is_searchable: checked })}
                        className="data-[state=checked]:bg-teal-600 scale-[0.7] origin-right"
                      />
                    </div>
                    <div className="flex items-center justify-between px-1">
                      <Label htmlFor="attr-var" className="text-[10px] text-zinc-500 font-semibold cursor-pointer">Variants</Label>
                      <Switch
                        id="attr-var"
                        checked={attrForm.has_variants}
                        onCheckedChange={(checked) => setAttrForm({ ...attrForm, has_variants: checked })}
                        className="data-[state=checked]:bg-teal-600 scale-[0.7] origin-right"
                      />
                    </div>
                  </div>

                  <Button
                    onClick={handleAddAttribute}
                    disabled={isSavingAttribute || !attrForm.name.trim()}
                    className="w-full bg-zinc-900 hover:bg-zinc-800 text-white h-10 rounded-xl text-sm font-medium transition-all shadow-sm gap-2"
                  >
                    {isSavingAttribute ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Save Attribute
                  </Button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 pr-0.5 min-h-0">
                  <AnimatePresence initial={false}>
                    {attributes.map((attr) => (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -8 }}
                        transition={{ duration: 0.15 }}
                        key={attr.id}
                        className="p-3 border border-zinc-100 rounded-xl flex items-center justify-between group bg-white shadow-sm hover:border-zinc-200 transition-all"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-sm text-zinc-800 truncate">{attr.name}</div>
                          <div className="text-[9px] text-zinc-400 uppercase font-semibold tracking-wider mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
                            <span className="text-teal-650">{attr.type}</span>
                            {attr.is_required && <span className="text-zinc-500">Required</span>}
                            {attr.is_filterable && <span className="text-zinc-500">Filterable</span>}
                            {attr.is_searchable && <span className="text-zinc-500">Searchable</span>}
                            {attr.has_variants && <span className="text-zinc-500">Variants</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
                          <button
                            onClick={() => handleStartEditAttribute(attr)}
                            className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-zinc-800 hover:bg-zinc-50 rounded-lg transition-all"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setAttributeToDelete(attr)}
                            className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-red-650 hover:bg-red-50 rounded-lg transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {attributes.length === 0 && (
                    <div className="text-center py-12 text-zinc-400 text-xs font-medium">No attributes configured yet</div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-20 text-zinc-400 text-xs font-medium max-w-[200px] mx-auto leading-relaxed">
                Select a specifications group to configure unique attributes
              </div>
            )}
          </CardContent>
        </Card>

      </div>

      {/* Modal Dialog: Rename Specs Group */}
      <Dialog open={!!editingGroup} onOpenChange={(open) => !open && setEditingGroup(null)}>
        <DialogContent className="sm:max-w-[420px] bg-white rounded-2xl border border-zinc-200 p-6 shadow-xl text-zinc-900 z-[700]">
          <DialogHeader className="space-y-1.5">
            <DialogTitle className="text-lg font-bold text-zinc-800">Rename Group</DialogTitle>
            <DialogDescription className="text-sm text-zinc-500">
              Update the identifier name of this specification group.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Group name"
              className="h-11 border-zinc-200 rounded-xl text-sm focus-visible:ring-1 focus-visible:ring-teal-600 focus-visible:border-teal-600"
              value={editGroupName}
              onChange={(e) => setEditGroupName(e.target.value)}
            />
          </div>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setEditingGroup(null)}
              className="h-10 border-zinc-200 text-zinc-700 hover:bg-zinc-50 rounded-xl text-sm"
              disabled={isRenamingGroup}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRenameGroup}
              disabled={isRenamingGroup || !editGroupName.trim()}
              className="h-10 rounded-xl gap-2 text-sm font-medium bg-zinc-900 hover:bg-zinc-800 text-white"
            >
              {isRenamingGroup ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Renaming...
                </>
              ) : (
                "Save Name"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Dialog: Delete Specs Group Confirmation */}
      <Dialog open={!!groupToDelete} onOpenChange={(open) => !open && setGroupToDelete(null)}>
        <DialogContent className="sm:max-w-[420px] bg-white rounded-2xl border border-zinc-200 p-6 shadow-xl text-zinc-900 z-[700]">
          <DialogHeader className="space-y-1.5">
            <div className="w-10 h-10 bg-red-50 border border-red-100 text-red-500 rounded-full flex items-center justify-center mb-2">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <DialogTitle className="text-lg font-bold text-zinc-800">Delete Specs Group</DialogTitle>
            <DialogDescription className="text-sm text-zinc-500 leading-relaxed">
              Are you sure you want to delete <span className="font-semibold text-zinc-700">{groupToDelete?.name}</span>? This action is permanent and will cascade to delete all mapped attributes in this group.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setGroupToDelete(null)}
              className="h-10 border-zinc-200 text-zinc-700 hover:bg-zinc-50 rounded-xl text-sm"
              disabled={isDeletingGroup}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteGroup}
              disabled={isDeletingGroup}
              variant="destructive"
              className="h-10 rounded-xl gap-2 text-sm font-medium bg-red-650 hover:bg-red-700 text-white"
            >
              {isDeletingGroup ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Group"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Dialog: Edit Attribute Details */}
      <Dialog open={!!editingAttribute} onOpenChange={(open) => !open && setEditingAttribute(null)}>
        <DialogContent className="sm:max-w-[440px] bg-white rounded-2xl border border-zinc-200 p-6 shadow-xl text-zinc-900 z-[700]">
          <DialogHeader className="space-y-1.5">
            <DialogTitle className="text-lg font-bold text-zinc-800">Edit Attribute</DialogTitle>
            <DialogDescription className="text-sm text-zinc-500">
              Modify the properties of attribute <span className="font-semibold text-zinc-700">{editingAttribute?.name}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-zinc-500">Attribute Name</Label>
              <Input
                placeholder="Attribute Name"
                className="h-10 border-zinc-200 rounded-xl text-sm focus-visible:ring-1 focus-visible:ring-teal-600 focus-visible:border-teal-600"
                value={editAttrForm.name}
                onChange={(e) => setEditAttrForm({ ...editAttrForm, name: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-zinc-500">Type</Label>
              <Select
                value={editAttrForm.type}
                onValueChange={(val) => setEditAttrForm({ ...editAttrForm, type: val || "text" })}
              >
                <SelectTrigger className="h-10 border-zinc-200 bg-white rounded-xl text-sm focus:ring-teal-600">
                  <SelectValue placeholder="Select Type" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-zinc-200 rounded-xl z-[800]">
                  <SelectItem value="text" className="text-xs">Text value</SelectItem>
                  <SelectItem value="number" className="text-xs">Numeric value</SelectItem>
                  <SelectItem value="dropdown" className="text-xs">Dropdown choices</SelectItem>
                  <SelectItem value="boolean" className="text-xs">Yes/No flag</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {editAttrForm.type === 'dropdown' && (
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-zinc-500">Dropdown Choices</Label>
                <Input
                  placeholder="Options (comma separated)"
                  className="h-10 border-zinc-200 rounded-xl text-sm focus-visible:ring-1 focus-visible:ring-teal-600 focus-visible:border-teal-600"
                  value={editAttrForm.options}
                  onChange={(e) => setEditAttrForm({ ...editAttrForm, options: e.target.value })}
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 p-3 bg-zinc-50/50 rounded-xl border border-zinc-150">
              <div className="flex items-center justify-between">
                <Label htmlFor="edit-attr-req" className="text-xs text-zinc-500 font-semibold cursor-pointer">Required</Label>
                <Switch
                  id="edit-attr-req"
                  checked={editAttrForm.is_required}
                  onCheckedChange={(checked) => setEditAttrForm({ ...editAttrForm, is_required: checked })}
                  className="data-[state=checked]:bg-teal-600 scale-[0.75] origin-right"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="edit-attr-filt" className="text-xs text-zinc-500 font-semibold cursor-pointer">Filterable</Label>
                <Switch
                  id="edit-attr-filt"
                  checked={editAttrForm.is_filterable}
                  onCheckedChange={(checked) => setEditAttrForm({ ...editAttrForm, is_filterable: checked })}
                  className="data-[state=checked]:bg-teal-600 scale-[0.75] origin-right"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="edit-attr-srch" className="text-xs text-zinc-500 font-semibold cursor-pointer">Searchable</Label>
                <Switch
                  id="edit-attr-srch"
                  checked={editAttrForm.is_searchable}
                  onCheckedChange={(checked) => setEditAttrForm({ ...editAttrForm, is_searchable: checked })}
                  className="data-[state=checked]:bg-teal-600 scale-[0.75] origin-right"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="edit-attr-var" className="text-xs text-zinc-500 font-semibold cursor-pointer">Variants</Label>
                <Switch
                  id="edit-attr-var"
                  checked={editAttrForm.has_variants}
                  onCheckedChange={(checked) => setEditAttrForm({ ...editAttrForm, has_variants: checked })}
                  className="data-[state=checked]:bg-teal-600 scale-[0.75] origin-right"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setEditingAttribute(null)}
              className="h-10 border-zinc-200 text-zinc-700 hover:bg-zinc-50 rounded-xl text-sm"
              disabled={isUpdatingAttribute}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEditAttribute}
              disabled={isUpdatingAttribute || !editAttrForm.name.trim()}
              className="h-10 rounded-xl gap-2 text-sm font-medium bg-zinc-900 hover:bg-zinc-800 text-white"
            >
              {isUpdatingAttribute ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Dialog: Delete Attribute Confirmation */}
      <Dialog open={!!attributeToDelete} onOpenChange={(open) => !open && setAttributeToDelete(null)}>
        <DialogContent className="sm:max-w-[420px] bg-white rounded-2xl border border-zinc-200 p-6 shadow-xl text-zinc-900 z-[700]">
          <DialogHeader className="space-y-1.5">
            <div className="w-10 h-10 bg-red-50 border border-red-100 text-red-500 rounded-full flex items-center justify-center mb-2">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <DialogTitle className="text-lg font-bold text-zinc-800">Delete Attribute</DialogTitle>
            <DialogDescription className="text-sm text-zinc-500 leading-relaxed">
              Are you sure you want to delete <span className="font-semibold text-zinc-700">{attributeToDelete?.name}</span>? This action is permanent and will remove this attribute definition from all products.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setAttributeToDelete(null)}
              className="h-10 border-zinc-200 text-zinc-700 hover:bg-zinc-50 rounded-xl text-sm"
              disabled={isDeletingAttribute}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteAttribute}
              disabled={isDeletingAttribute}
              variant="destructive"
              className="h-10 rounded-xl gap-2 text-sm font-medium bg-red-650 hover:bg-red-700 text-white"
            >
              {isDeletingAttribute ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Attribute"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}