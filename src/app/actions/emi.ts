'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin-server'
import { revalidatePath } from 'next/cache'

// EMI Installment Calculator (Reducing Balance Interest Formula)
function calculateEMI(principal: number, interestRate: number, tenureMonths: number) {
  if (interestRate === 0) {
    const emi = principal / tenureMonths;
    return {
      emi: Math.round(emi * 100) / 100,
      totalPayable: principal,
      totalInterest: 0
    };
  }

  const monthlyRate = interestRate / 12 / 100;
  const power = Math.pow(1 + monthlyRate, tenureMonths);
  const emi = (principal * monthlyRate * power) / (power - 1);
  const totalPayable = emi * tenureMonths;
  const totalInterest = totalPayable - principal;

  return {
    emi: Math.round(emi * 100) / 100,
    totalPayable: Math.round(totalPayable * 100) / 100,
    totalInterest: Math.round(totalInterest * 100) / 100
  };
}

export async function getEligibleEMIOptions(amount: number) {
  try {
    const supabase = await createClient()

    // Verify if EMI option is active in site settings
    const { data: settings } = await supabase
      .from('site_settings')
      .select('emi_enabled')
      .maybeSingle()

    if (settings && settings.emi_enabled === false) {
      return { success: false, error: 'EMI option is currently disabled.' }
    }

    // 1. Fetch active EMI providers
    const { data: providers, error: providersError } = await supabase
      .from('emi_providers')
      .select('*')
      .eq('status', true)
      .lte('min_order_amount', amount)
      .order('name', { ascending: true })

    if (providersError) throw providersError

    if (!providers || providers.length === 0) {
      return { success: true, providers: [] }
    }

    // 2. Fetch active plans for those providers
    const providerIds = providers.map(p => p.id)
    const { data: plans, error: plansError } = await supabase
      .from('emi_plans')
      .select('*')
      .in('provider_id', providerIds)
      .eq('active', true)
      .order('tenure_months', { ascending: true })

    if (plansError) throw plansError

    // 3. Map plans to providers and calculate EMI figures
    const result = providers.map(provider => {
      const providerPlans = (plans || [])
        .filter(plan => plan.provider_id === provider.id)
        .map(plan => {
          const calculations = calculateEMI(amount, Number(plan.interest_rate), plan.tenure_months)
          return {
            id: plan.id,
            tenureMonths: plan.tenure_months,
            interestRate: Number(plan.interest_rate),
            ...calculations
          }
        })

      return {
        id: provider.id,
        name: provider.name,
        code: provider.code,
        logoUrl: provider.logo_url,
        minOrderAmount: Number(provider.min_order_amount),
        plans: providerPlans
      }
    }).filter(p => p.plans.length > 0) // Only return providers that have active plans

    return { success: true, providers: result }
  } catch (error: any) {
    console.error('getEligibleEMIOptions error:', error)
    return { success: false, error: error.message || 'Failed to fetch EMI options' }
  }
}

// ADMIN ACTIONS

async function checkAdminAuth() {
  const supabase = await createAdminClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return false

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  return profile?.role === 'admin'
}

export async function getEMIProvidersAdmin() {
  try {
    if (!(await checkAdminAuth())) {
      return { success: false, error: 'Unauthorized' }
    }

    const supabase = await createAdminClient()
    const { data, error } = await supabase
      .from('emi_providers')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return { success: true, providers: data || [] }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function createEMIProviderAction(data: {
  name: string
  code: string
  logo_url?: string
  status: boolean
  min_order_amount: number
}) {
  try {
    if (!(await checkAdminAuth())) {
      return { success: false, error: 'Unauthorized' }
    }

    const supabase = await createAdminClient()
    const { data: newProvider, error } = await supabase
      .from('emi_providers')
      .insert([data])
      .select()
      .single()

    if (error) throw error
    revalidatePath('/uc-admin-portal/emi')
    return { success: true, provider: newProvider }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function updateEMIProviderAction(
  id: string,
  data: {
    name?: string
    code?: string
    logo_url?: string
    status?: boolean
    min_order_amount?: number
  }
) {
  try {
    if (!(await checkAdminAuth())) {
      return { success: false, error: 'Unauthorized' }
    }

    const supabase = await createAdminClient()
    const { data: updatedProvider, error } = await supabase
      .from('emi_providers')
      .update(data)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    revalidatePath('/uc-admin-portal/emi')
    return { success: true, provider: updatedProvider }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function deleteEMIProviderAction(id: string) {
  try {
    if (!(await checkAdminAuth())) {
      return { success: false, error: 'Unauthorized' }
    }

    const supabase = await createAdminClient()
    const { error } = await supabase
      .from('emi_providers')
      .delete()
      .eq('id', id)

    if (error) throw error
    revalidatePath('/uc-admin-portal/emi')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function getEMIPlansAdmin(providerId: string) {
  try {
    if (!(await checkAdminAuth())) {
      return { success: false, error: 'Unauthorized' }
    }

    const supabase = await createAdminClient()
    const { data, error } = await supabase
      .from('emi_plans')
      .select('*')
      .eq('provider_id', providerId)
      .order('tenure_months', { ascending: true })

    if (error) throw error
    return { success: true, plans: data || [] }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function createEMIPlanAction(data: {
  provider_id: string
  tenure_months: number
  interest_rate: number
  active: boolean
}) {
  try {
    if (!(await checkAdminAuth())) {
      return { success: false, error: 'Unauthorized' }
    }

    const supabase = await createAdminClient()
    const { data: newPlan, error } = await supabase
      .from('emi_plans')
      .insert([data])
      .select()
      .single()

    if (error) throw error
    revalidatePath('/uc-admin-portal/emi')
    return { success: true, plan: newPlan }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function updateEMIPlanAction(
  id: string,
  data: {
    tenure_months?: number
    interest_rate?: number
    active?: boolean
  }
) {
  try {
    if (!(await checkAdminAuth())) {
      return { success: false, error: 'Unauthorized' }
    }

    const supabase = await createAdminClient()
    const { data: updatedPlan, error } = await supabase
      .from('emi_plans')
      .update(data)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    revalidatePath('/uc-admin-portal/emi')
    return { success: true, plan: updatedPlan }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function deleteEMIPlanAction(id: string) {
  try {
    if (!(await checkAdminAuth())) {
      return { success: false, error: 'Unauthorized' }
    }

    const supabase = await createAdminClient()
    const { error } = await supabase
      .from('emi_plans')
      .delete()
      .eq('id', id)

    if (error) throw error
    revalidatePath('/uc-admin-portal/emi')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
