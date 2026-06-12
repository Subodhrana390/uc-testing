'use client'

import React, { useState, useEffect } from 'react'
import { Ticket, Plus, Trash2, Calendar, Lock, AlertCircle, ToggleLeft, ToggleRight, Loader2, Sparkles } from 'lucide-react'
import { getCouponsAction, createCouponAction, toggleCouponActiveAction, deleteCouponAction } from '@/app/actions/coupons'
import { formatCurrency } from '@/lib/format'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'

interface Coupon {
  id: string
  code: string
  discount_type: 'percentage' | 'fixed'
  discount_value: string | number
  min_order_amount: string | number
  max_discount_amount: string | number | null
  start_date: string | null
  expiration_date: string | null
  usage_limit: number | null
  usage_count: number
  active: boolean
  created_at: string
}

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Form state
  const [form, setForm] = useState({
    code: '',
    discount_type: 'percentage' as 'percentage' | 'fixed',
    discount_value: '',
    min_order_amount: '',
    max_discount_amount: '',
    start_date: '',
    expiration_date: '',
    usage_limit: '',
    active: true
  })

  const fetchCoupons = async () => {
    setLoading(true)
    try {
      const res = await getCouponsAction()
      if (res.success && res.coupons) {
        setCoupons(res.coupons as any)
      } else {
        toast.error(res.error || 'Failed to fetch coupons')
      }
    } catch (err: any) {
      toast.error(err.message || 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCoupons()
  }, [])

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const res = await toggleCouponActiveAction(id, !currentStatus)
      if (res.success) {
        setCoupons(prev => 
          prev.map(c => c.id === id ? { ...c, active: !currentStatus } : c)
        )
        toast.success(`Coupon ${currentStatus ? 'deactivated' : 'activated'} successfully!`)
      } else {
        toast.error(res.error || 'Failed to update coupon status')
      }
    } catch (err: any) {
      toast.error(err.message || 'An unexpected error occurred')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this coupon? This action cannot be undone.')) return
    try {
      const res = await deleteCouponAction(id)
      if (res.success) {
        setCoupons(prev => prev.filter(c => c.id !== id))
        toast.success('Coupon deleted successfully!')
      } else {
        toast.error(res.error || 'Failed to delete coupon')
      }
    } catch (err: any) {
      toast.error(err.message || 'An unexpected error occurred')
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.code.trim()) {
      toast.error('Coupon code is required.')
      return
    }
    const val = parseFloat(form.discount_value)
    if (isNaN(val) || val <= 0) {
      toast.error('Discount value must be greater than 0.')
      return
    }
    if (form.discount_type === 'percentage' && val > 100) {
      toast.error('Percentage discount cannot exceed 100%.')
      return
    }

    setSubmitting(true)
    try {
      const res = await createCouponAction({
        code: form.code,
        discount_type: form.discount_type,
        discount_value: val,
        min_order_amount: form.min_order_amount ? parseFloat(form.min_order_amount) : 0,
        max_discount_amount: form.max_discount_amount ? parseFloat(form.max_discount_amount) : undefined,
        start_date: form.start_date || undefined,
        expiration_date: form.expiration_date || undefined,
        usage_limit: form.usage_limit ? parseInt(form.usage_limit) : undefined,
        active: form.active
      })

      if (res.success && res.coupon) {
        toast.success('Coupon created successfully!')
        setIsModalOpen(false)
        setForm({
          code: '',
          discount_type: 'percentage',
          discount_value: '',
          min_order_amount: '',
          max_discount_amount: '',
          start_date: '',
          expiration_date: '',
          usage_limit: '',
          active: true
        })
        fetchCoupons()
      } else {
        toast.error(res.error || 'Failed to create coupon')
      }
    } catch (err: any) {
      toast.error(err.message || 'An unexpected error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusBadge = (coupon: Coupon) => {
    const now = new Date()
    const isExpired = coupon.expiration_date && now > new Date(coupon.expiration_date)
    const limitReached = coupon.usage_limit && coupon.usage_count >= coupon.usage_limit

    if (!coupon.active) {
      return <span className="bg-zinc-100 text-zinc-500 text-[10px] font-bold px-2 py-0.5 rounded-full border border-zinc-200">INACTIVE</span>
    }
    if (isExpired) {
      return <span className="bg-rose-50 text-rose-600 text-[10px] font-bold px-2 py-0.5 rounded-full border border-rose-100">EXPIRED</span>
    }
    if (limitReached) {
      return <span className="bg-amber-50 text-amber-600 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-100">LIMIT REACHED</span>
    }
    return <span className="bg-emerald-50 text-emerald-600 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-100">ACTIVE</span>
  }

  return (
    <div className="px-6 space-y-8 max-w-7xl mx-auto">
      {/* Header section with modern background blur */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 shadow-sm">
            <Ticket className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-800 uppercase flex items-center gap-2">
              Coupons & Promotions
              <Sparkles className="w-4 h-4 text-teal-500 animate-pulse" />
            </h1>
            <p className="text-xs font-semibold text-slate-400">Create, edit, and track promotional campaign discount codes</p>
          </div>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="rounded-xl h-11 px-5 bg-slate-900 hover:bg-teal-600 hover:shadow-lg hover:shadow-teal-500/10 text-white font-bold text-xs tracking-wide transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Create Coupon
        </button>
      </div>

      {/* Coupons List */}
      <div className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
            <p className="text-xs font-semibold text-slate-400 tracking-wider uppercase">Loading Coupon Data...</p>
          </div>
        ) : coupons.length === 0 ? (
          <div className="py-24 text-center space-y-4">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto border border-slate-100 shadow-inner">
              <Ticket className="w-8 h-8 text-slate-300" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-slate-800">No active campaigns</p>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">Create discount coupons to drive customer checkout conversion rates.</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  <th className="p-4 pl-6">Code</th>
                  <th className="p-4">Discount</th>
                  <th className="p-4">Min spend</th>
                  <th className="p-4">Limit / Usage</th>
                  <th className="p-4">Expires</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Toggle</th>
                  <th className="p-4 pr-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
                {coupons.map((coupon) => {
                  const now = new Date()
                  const isExpired = coupon.expiration_date && now > new Date(coupon.expiration_date)
                  return (
                    <tr key={coupon.id} className="hover:bg-slate-50/40 transition-colors">
                      <td className="p-4 pl-6">
                        <span className="font-mono font-black text-slate-900 bg-slate-100 border border-slate-200/50 px-2.5 py-1 rounded-lg">
                          {coupon.code}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-slate-800">
                        {coupon.discount_type === 'percentage' 
                          ? `${coupon.discount_value}%` 
                          : formatCurrency(coupon.discount_value)
                        }
                        {coupon.discount_type === 'percentage' && coupon.max_discount_amount && (
                          <span className="text-[10px] text-slate-400 block font-normal">
                            Max {formatCurrency(coupon.max_discount_amount)}
                          </span>
                        )}
                      </td>
                      <td className="p-4 font-semibold text-slate-500">
                        {parseFloat(coupon.min_order_amount as string) > 0 
                          ? formatCurrency(coupon.min_order_amount) 
                          : '₹0.00'
                        }
                      </td>
                      <td className="p-4 font-semibold text-slate-600">
                        <span className="text-slate-800">{coupon.usage_count}</span>
                        <span className="text-slate-400 font-normal">
                          {coupon.usage_limit ? ` / ${coupon.usage_limit}` : ' / ∞'}
                        </span>
                      </td>
                      <td className="p-4 font-medium text-slate-500">
                        {coupon.expiration_date ? (
                          <span className={cn("inline-flex items-center gap-1.5", isExpired && "text-rose-500")}>
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(coupon.expiration_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </span>
                        ) : (
                          <span className="text-slate-400">Never</span>
                        )}
                      </td>
                      <td className="p-4">{getStatusBadge(coupon)}</td>
                      <td className="p-4">
                        <button
                          onClick={() => handleToggleActive(coupon.id, coupon.active)}
                          className="text-slate-400 hover:text-slate-600 transition"
                        >
                          {coupon.active ? (
                            <ToggleRight className="w-7 h-7 text-teal-500" />
                          ) : (
                            <ToggleLeft className="w-7 h-7 text-slate-300" />
                          )}
                        </button>
                      </td>
                      <td className="p-4 pr-6 text-right">
                        <button
                          onClick={() => handleDelete(coupon.id)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition border border-transparent hover:border-rose-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Slide-over / Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity" onClick={() => setIsModalOpen(false)} />
          
          <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-white shadow-2xl rounded-l-3xl overflow-hidden flex flex-col border-l border-slate-200">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <Ticket className="w-5 h-5 text-teal-600" />
                  <h2 className="text-lg font-black text-slate-800 uppercase tracking-wide">Create Coupon</h2>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="w-8 h-8 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-50 cursor-pointer"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleCreate} className="flex-1 p-6 overflow-y-auto space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Coupon Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. WELCOME150"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                    className="w-full h-11 border border-slate-200 rounded-xl px-3.5 text-sm font-mono tracking-wider focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Type *</label>
                    <select
                      value={form.discount_type}
                      onChange={(e) => setForm({ ...form, discount_type: e.target.value as any })}
                      className="w-full h-11 border border-slate-200 rounded-xl px-3.5 text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 bg-white"
                    >
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed">Fixed Amount (₹)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                      {form.discount_type === 'percentage' ? 'Percentage *' : 'Value (₹) *'}
                    </label>
                    <input
                      type="number"
                      required
                      min="0.01"
                      step="any"
                      placeholder={form.discount_type === 'percentage' ? 'e.g. 10' : 'e.g. 150'}
                      value={form.discount_value}
                      onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
                      className="w-full h-11 border border-slate-200 rounded-xl px-3.5 text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Minimum Spend (₹)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 500"
                    value={form.min_order_amount}
                    onChange={(e) => setForm({ ...form, min_order_amount: e.target.value })}
                    className="w-full h-11 border border-slate-200 rounded-xl px-3.5 text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                  />
                </div>

                {form.discount_type === 'percentage' && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Max Discount (₹)</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="e.g. 250 (Optional)"
                      value={form.max_discount_amount}
                      onChange={(e) => setForm({ ...form, max_discount_amount: e.target.value })}
                      className="w-full h-11 border border-slate-200 rounded-xl px-3.5 text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Start Date</label>
                    <input
                      type="datetime-local"
                      value={form.start_date}
                      onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                      className="w-full h-11 border border-slate-200 rounded-xl px-3 text-xs focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Expiry Date</label>
                    <input
                      type="datetime-local"
                      value={form.expiration_date}
                      onChange={(e) => setForm({ ...form, expiration_date: e.target.value })}
                      className="w-full h-11 border border-slate-200 rounded-xl px-3 text-xs focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Usage Limit</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 500 (Optional)"
                    value={form.usage_limit}
                    onChange={(e) => setForm({ ...form, usage_limit: e.target.value })}
                    className="w-full h-11 border border-slate-200 rounded-xl px-3.5 text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="form-active"
                    checked={form.active}
                    onChange={(e) => setForm({ ...form, active: e.target.checked })}
                    className="rounded text-teal-600 focus:ring-teal-500 h-4 w-4"
                  />
                  <label htmlFor="form-active" className="text-xs font-bold text-slate-700">Activate coupon immediately</label>
                </div>

                <div className="pt-6">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full rounded-xl h-12 bg-slate-900 hover:bg-teal-600 hover:shadow-lg hover:shadow-teal-500/10 text-white font-bold text-xs tracking-wide transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                      </>
                    ) : (
                      'Save Coupon'
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
