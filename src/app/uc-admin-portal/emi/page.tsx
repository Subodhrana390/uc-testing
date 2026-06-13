'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { CreditCard, Plus, Trash2, Edit, AlertCircle, ToggleLeft, ToggleRight, Loader2, Sparkles } from 'lucide-react'
import { createAdminClient } from '@/utils/supabase/admin-client'
import Link from 'next/link'
import {
  getEMIProvidersAdmin,
  createEMIProviderAction,
  updateEMIProviderAction,
  deleteEMIProviderAction,
  getEMIPlansAdmin,
  createEMIPlanAction,
  updateEMIPlanAction,
  deleteEMIPlanAction
} from '@/app/actions/emi'
import { formatCurrency } from '@/lib/format'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'

interface EMIProvider {
  id: string
  name: string
  code: string
  logo_url: string | null
  status: boolean
  min_order_amount: string | number
  created_at: string
}

interface EMIPlan {
  id: string
  provider_id: string
  tenure_months: number
  interest_rate: string | number
  active: boolean
  created_at: string
}

export default function AdminEMIPage() {
  const [providers, setProviders] = useState<EMIProvider[]>([])
  const [plans, setPlans] = useState<Record<string, EMIPlan[]>>({})
  const [loading, setLoading] = useState(true)
  const [emiEnabled, setEmiEnabled] = useState(true)

  const supabase = useMemo(() => createAdminClient(), [])
  const [submittingProvider, setSubmittingProvider] = useState(false)
  const [submittingPlan, setSubmittingPlan] = useState(false)
  
  // Modal/Drawer controls
  const [isProviderModalOpen, setIsProviderModalOpen] = useState(false)
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false)
  const [editingProvider, setEditingProvider] = useState<EMIProvider | null>(null)
  const [selectedProviderForPlans, setSelectedProviderForPlans] = useState<EMIProvider | null>(null)

  // Provider Form State
  const [providerForm, setProviderForm] = useState({
    name: '',
    code: '',
    min_order_amount: '',
    status: true
  })

  // Plan Form State
  const [planForm, setPlanForm] = useState({
    tenure_months: '',
    interest_rate: '',
    active: true
  })

  const fetchProviders = async () => {
    setLoading(true)
    try {
      // Fetch emi_enabled toggle status
      const { data: settingsData } = await supabase
        .from('site_settings')
        .select('emi_enabled')
        .maybeSingle()
      if (settingsData) {
        setEmiEnabled(settingsData.emi_enabled ?? true)
      }

      const res = await getEMIProvidersAdmin()
      if (res.success && res.providers) {
        setProviders(res.providers)
        
        // Fetch plans for all providers parallelly
        const plansMap: Record<string, EMIPlan[]> = {}
        await Promise.all(
          res.providers.map(async (p: EMIProvider) => {
            const planRes = await getEMIPlansAdmin(p.id)
            if (planRes.success && planRes.plans) {
              plansMap[p.id] = planRes.plans
            }
          })
        )
        setPlans(plansMap)
      } else {
        toast.error(res.error || 'Failed to fetch EMI providers')
      }
    } catch (err: any) {
      toast.error(err.message || 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProviders()
  }, [])

  // Provider Handlers
  const handleToggleProviderStatus = async (id: string, currentStatus: boolean) => {
    try {
      const res = await updateEMIProviderAction(id, { status: !currentStatus })
      if (res.success) {
        setProviders(prev =>
          prev.map(p => p.id === id ? { ...p, status: !currentStatus } : p)
        )
        toast.success(`Provider ${currentStatus ? 'suspended' : 'activated'} successfully!`)
      } else {
        toast.error(res.error || 'Failed to update provider status')
      }
    } catch (err: any) {
      toast.error(err.message || 'An unexpected error occurred')
    }
  }

  const handleDeleteProvider = async (id: string) => {
    if (!confirm('Are you sure you want to delete this provider? All its tenure plans will be deleted too.')) return
    try {
      const res = await deleteEMIProviderAction(id)
      if (res.success) {
        setProviders(prev => prev.filter(p => p.id !== id))
        toast.success('Provider deleted successfully!')
      } else {
        toast.error(res.error || 'Failed to delete provider')
      }
    } catch (err: any) {
      toast.error(err.message || 'An unexpected error occurred')
    }
  }

  const handleOpenProviderModal = (provider: EMIProvider | null = null) => {
    if (provider) {
      setEditingProvider(provider)
      setProviderForm({
        name: provider.name,
        code: provider.code,
        min_order_amount: String(provider.min_order_amount),
        status: provider.status
      })
    } else {
      setEditingProvider(null)
      setProviderForm({
        name: '',
        code: '',
        min_order_amount: '3000',
        status: true
      })
    }
    setIsProviderModalOpen(true)
  }

  const handleSubmitProvider = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!providerForm.name.trim() || !providerForm.code.trim()) {
      toast.error('Name and Unique Code are required.')
      return
    }

    setSubmittingProvider(true)
    try {
      const payload = {
        name: providerForm.name,
        code: providerForm.code.toLowerCase().trim(),
        min_order_amount: providerForm.min_order_amount ? parseFloat(providerForm.min_order_amount) : 0,
        status: providerForm.status
      }

      let res
      if (editingProvider) {
        res = await updateEMIProviderAction(editingProvider.id, payload)
      } else {
        res = await createEMIProviderAction(payload)
      }

      if (res.success) {
        toast.success(editingProvider ? 'Provider updated successfully!' : 'Provider created successfully!')
        setIsProviderModalOpen(false)
        fetchProviders()
      } else {
        toast.error(res.error || 'Failed to save provider')
      }
    } catch (err: any) {
      toast.error(err.message || 'An unexpected error occurred')
    } finally {
      setSubmittingProvider(false)
    }
  }

  // Plan Handlers
  const handleTogglePlanActive = async (providerId: string, planId: string, currentActive: boolean) => {
    try {
      const res = await updateEMIPlanAction(planId, { active: !currentActive })
      if (res.success) {
        setPlans(prev => ({
          ...prev,
          [providerId]: prev[providerId].map(pl => pl.id === planId ? { ...pl, active: !currentActive } : pl)
        }))
        toast.success(`Plan tenure ${currentActive ? 'deactivated' : 'activated'} successfully!`)
      } else {
        toast.error(res.error || 'Failed to update plan status')
      }
    } catch (err: any) {
      toast.error(err.message || 'An unexpected error occurred')
    }
  }

  const handleDeletePlan = async (providerId: string, planId: string) => {
    if (!confirm('Are you sure you want to delete this tenure option?')) return
    try {
      const res = await deleteEMIPlanAction(planId)
      if (res.success) {
        setPlans(prev => ({
          ...prev,
          [providerId]: prev[providerId].filter(pl => pl.id !== planId)
        }))
        toast.success('Tenure option deleted!')
      } else {
        toast.error(res.error || 'Failed to delete plan')
      }
    } catch (err: any) {
      toast.error(err.message || 'An unexpected error occurred')
    }
  }

  const handleOpenPlanModal = (provider: EMIProvider) => {
    setSelectedProviderForPlans(provider)
    setPlanForm({
      tenure_months: '',
      interest_rate: '0',
      active: true
    })
    setIsPlanModalOpen(true)
  }

  const handleSubmitPlan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProviderForPlans) return

    const tenure = parseInt(planForm.tenure_months)
    const rate = parseFloat(planForm.interest_rate)

    if (isNaN(tenure) || tenure <= 0) {
      toast.error('Please enter a valid tenure in months.')
      return
    }
    if (isNaN(rate) || rate < 0) {
      toast.error('Interest rate cannot be negative.')
      return
    }

    setSubmittingPlan(true)
    try {
      const res = await createEMIPlanAction({
        provider_id: selectedProviderForPlans.id,
        tenure_months: tenure,
        interest_rate: rate,
        active: planForm.active
      })

      if (res.success && res.plan) {
        toast.success('Tenure plan added successfully!')
        setIsPlanModalOpen(false)
        
        // Refresh plans for this provider
        const plansRes = await getEMIPlansAdmin(selectedProviderForPlans.id)
        if (plansRes.success && plansRes.plans) {
          setPlans(prev => ({
            ...prev,
            [selectedProviderForPlans.id]: plansRes.plans
          }))
        }
      } else {
        toast.error(res.error || 'Failed to add tenure plan')
      }
    } catch (err: any) {
      toast.error(err.message || 'An unexpected error occurred')
    } finally {
      setSubmittingPlan(false)
    }
  }

  return (
    <div className="px-6 space-y-8 max-w-7xl mx-auto">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-650 shadow-sm">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-800 uppercase flex items-center gap-2">
              EMI configurations
              <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" />
            </h1>
            <p className="text-xs font-semibold text-slate-400">Configure EMI lenders, interest rates, eligibility criteria, and payment periods</p>
          </div>
        </div>

        <button
          onClick={() => handleOpenProviderModal()}
          className="rounded-xl h-11 px-5 bg-slate-900 hover:bg-indigo-600 hover:shadow-lg hover:shadow-indigo-500/10 text-white font-bold text-xs tracking-wide transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Add Provider
        </button>
      </div>

      {!emiEnabled && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3 text-amber-800 text-xs font-semibold shadow-sm animate-in fade-in duration-300">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
          <div>
            <span>EMI payments are currently <strong>disabled</strong> on the storefront. You can change this in </span>
            <Link href="/uc-admin-portal/settings" className="text-indigo-650 hover:underline font-bold">Site Settings</Link>.
          </div>
        </div>
      )}

      {/* Main content grid */}
      {loading ? (
        <div className="bg-white border border-slate-200/80 rounded-3xl py-24 flex flex-col items-center justify-center gap-3 shadow-sm">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
          <p className="text-xs font-semibold text-slate-400 tracking-wider uppercase">Loading EMI settings...</p>
        </div>
      ) : providers.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-3xl py-24 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto border border-slate-100 shadow-inner">
            <CreditCard className="w-8 h-8 text-slate-300" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-bold text-slate-800">No EMI Providers Configured</p>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">Create lender configurations to allow customers to choose installment checkout plans.</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {providers.map((provider) => {
            const providerPlans = plans[provider.id] || []
            return (
              <div 
                key={provider.id} 
                className={cn(
                  "bg-white border rounded-[2rem] p-6 shadow-sm flex flex-col justify-between transition-all hover:shadow-md",
                  provider.status ? "border-slate-200" : "border-slate-100 bg-slate-50/30 opacity-75"
                )}
              >
                <div>
                  {/* Provider Details Header */}
                  <div className="flex justify-between items-start gap-4 pb-4 border-b border-slate-100">
                    <div>
                      <h2 className="text-lg font-black text-slate-850 truncate max-w-[220px]">{provider.name}</h2>
                      <span className="font-mono text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-500 font-bold tracking-wide uppercase mt-1 inline-block">
                        code: {provider.code}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => handleToggleProviderStatus(provider.id, provider.status)}
                        className="text-slate-400 hover:text-slate-600 transition"
                        title={provider.status ? "Suspend Provider" : "Activate Provider"}
                      >
                        {provider.status ? (
                          <ToggleRight className="w-7 h-7 text-indigo-500" />
                        ) : (
                          <ToggleLeft className="w-7 h-7 text-slate-300" />
                        )}
                      </button>
                      <button 
                        onClick={() => handleOpenProviderModal(provider)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition"
                        title="Edit Provider"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteProvider(provider.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50/55 transition"
                        title="Delete Provider"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Settings Panel */}
                  <div className="py-4 space-y-2.5 text-xs text-slate-650 font-semibold border-b border-slate-100">
                    <div className="flex justify-between items-center">
                      <span>Minimum Purchase Limit:</span>
                      <span className="font-bold text-slate-900">{formatCurrency(provider.min_order_amount)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Current Status:</span>
                      {provider.status ? (
                        <span className="bg-emerald-50 border border-emerald-100 text-emerald-600 text-[9px] font-black uppercase px-2 py-0.5 rounded-full">ACTIVE</span>
                      ) : (
                        <span className="bg-zinc-100 border border-zinc-200 text-zinc-500 text-[9px] font-black uppercase px-2 py-0.5 rounded-full">SUSPENDED</span>
                      )}
                    </div>
                  </div>

                  {/* Plans list */}
                  <div className="py-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Tenure Plans</h3>
                      <button 
                        onClick={() => handleOpenPlanModal(provider)}
                        className="text-[10px] font-black text-indigo-600 hover:text-indigo-800 transition flex items-center gap-0.5"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add tenure
                      </button>
                    </div>

                    {providerPlans.length === 0 ? (
                      <p className="text-[10px] font-bold text-slate-400 italic py-2">No active tenure plans configured.</p>
                    ) : (
                      <div className="grid gap-2">
                        {providerPlans.map((plan) => (
                          <div 
                            key={plan.id}
                            className={cn(
                              "p-3 rounded-2xl border text-xs font-semibold flex items-center justify-between",
                              plan.active ? "border-slate-100 bg-slate-50/50" : "border-slate-100 bg-zinc-50 text-zinc-400"
                            )}
                          >
                            <div>
                              <span className="font-black text-slate-800">{plan.tenure_months} Months</span>
                              <span className="text-slate-400 text-[10px] ml-2">
                                Interest Rate: <strong className="text-slate-700 font-bold">{plan.interest_rate}% p.a.</strong>
                                {Number(plan.interest_rate) === 0 && <strong className="text-green-600 ml-1">No Cost</strong>}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleTogglePlanActive(provider.id, plan.id, plan.active)}
                                className="text-slate-400 hover:text-slate-600 transition"
                              >
                                {plan.active ? (
                                  <ToggleRight className="w-6 h-6 text-indigo-500" />
                                ) : (
                                  <ToggleLeft className="w-6 h-6 text-slate-300" />
                                )}
                              </button>
                              <button
                                onClick={() => handleDeletePlan(provider.id, plan.id)}
                                className="p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create/Edit Provider Drawer */}
      {isProviderModalOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity" onClick={() => setIsProviderModalOpen(false)} />
          
          <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-white shadow-2xl rounded-l-3xl overflow-hidden flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-350">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-indigo-650" />
                  <h2 className="text-lg font-black text-slate-800 uppercase tracking-wide">
                    {editingProvider ? 'Edit Provider' : 'Add EMI Provider'}
                  </h2>
                </div>
                <button
                  onClick={() => setIsProviderModalOpen(false)}
                  className="w-8 h-8 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-50 cursor-pointer"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleSubmitProvider} className="flex-1 p-6 overflow-y-auto space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Provider Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. State Bank of India"
                    value={providerForm.name}
                    onChange={(e) => setProviderForm({ ...providerForm, name: e.target.value })}
                    className="w-full h-11 border border-slate-200 rounded-xl px-3.5 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Unique Code *</label>
                  <input
                    type="text"
                    required
                    disabled={!!editingProvider}
                    placeholder="e.g. sbi_cc"
                    value={providerForm.code}
                    onChange={(e) => setProviderForm({ ...providerForm, code: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                    className="w-full h-11 border border-slate-200 rounded-xl px-3.5 text-sm font-mono tracking-wider focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Minimum Purchase Limit (₹) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="e.g. 3000"
                    value={providerForm.min_order_amount}
                    onChange={(e) => setProviderForm({ ...providerForm, min_order_amount: e.target.value })}
                    className="w-full h-11 border border-slate-200 rounded-xl px-3.5 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-bold"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="prov-status"
                    checked={providerForm.status}
                    onChange={(e) => setProviderForm({ ...providerForm, status: e.target.checked })}
                    className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                  />
                  <label htmlFor="prov-status" className="text-xs font-bold text-slate-700">Activate provider immediately</label>
                </div>

                <div className="pt-6">
                  <button
                    type="submit"
                    disabled={submittingProvider}
                    className="w-full rounded-xl h-12 bg-slate-900 hover:bg-indigo-600 hover:shadow-lg hover:shadow-indigo-500/10 text-white font-bold text-xs tracking-wide transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {submittingProvider ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                      </>
                    ) : (
                      'Save Provider'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Add Plan Modal */}
      {isPlanModalOpen && selectedProviderForPlans && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity" onClick={() => setIsPlanModalOpen(false)} />
          
          <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-white shadow-2xl rounded-l-3xl overflow-hidden flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-350">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-indigo-650" />
                  <h2 className="text-lg font-black text-slate-800 uppercase tracking-wide">
                    Add Plan Tenure
                  </h2>
                </div>
                <button
                  onClick={() => setIsPlanModalOpen(false)}
                  className="w-8 h-8 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-50 cursor-pointer"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleSubmitPlan} className="flex-1 p-6 overflow-y-auto space-y-5">
                <div className="p-4 bg-zinc-50 border border-zinc-150 rounded-xl space-y-1 mb-2 text-xs">
                  <p className="text-zinc-400 font-bold uppercase tracking-wider text-[10px]">Target Provider</p>
                  <p className="font-bold text-zinc-850 text-sm">{selectedProviderForPlans.name}</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Tenure in Months *</label>
                  <select
                    required
                    value={planForm.tenure_months}
                    onChange={(e) => setPlanForm({ ...planForm, tenure_months: e.target.value })}
                    className="w-full h-11 border border-slate-200 rounded-xl px-3.5 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white font-bold text-zinc-900"
                  >
                    <option value="">Select Tenure...</option>
                    <option value="3">3 Months</option>
                    <option value="6">6 Months</option>
                    <option value="9">9 Months</option>
                    <option value="12">12 Months</option>
                    <option value="18">18 Months</option>
                    <option value="24">24 Months</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Annual Interest Rate (%) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    placeholder="e.g. 14.5 (Enter 0 for No-Cost EMI)"
                    value={planForm.interest_rate}
                    onChange={(e) => setPlanForm({ ...planForm, interest_rate: e.target.value })}
                    className="w-full h-11 border border-slate-200 rounded-xl px-3.5 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-bold"
                  />
                  <p className="text-[10px] text-zinc-400 font-semibold">Enter 0 to configure interest-free **No Cost EMI** for customers.</p>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="plan-status"
                    checked={planForm.active}
                    onChange={(e) => setPlanForm({ ...planForm, active: e.target.checked })}
                    className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                  />
                  <label htmlFor="plan-status" className="text-xs font-bold text-slate-700">Activate tenure plan immediately</label>
                </div>

                <div className="pt-6">
                  <button
                    type="submit"
                    disabled={submittingPlan}
                    className="w-full rounded-xl h-12 bg-slate-900 hover:bg-indigo-600 hover:shadow-lg hover:shadow-indigo-500/10 text-white font-bold text-xs tracking-wide transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {submittingPlan ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                      </>
                    ) : (
                      'Save Tenure Plan'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
