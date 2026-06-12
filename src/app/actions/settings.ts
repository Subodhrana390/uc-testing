'use server'

import { createAdminClient } from '@/utils/supabase/admin-server'
import { createClient } from '@/utils/supabase/server'
import { revalidateTag, revalidatePath, unstable_cache } from 'next/cache'

export interface SiteSettings {
  id: number
  site_name: string
  logo_url: string | null
  favicon_url: string | null
  contact_phone: string | null
  contact_email: string | null
  contact_address: string | null
  social_links: {
    facebook?: string
    twitter?: string
    instagram?: string
    linkedin?: string
    youtube?: string
  }
  seo_title_default: string | null
  seo_description_default: string | null
  seo_keywords_default: string[]
  whatsapp_number: string | null
  whatsapp_message: string | null
  whatsapp_enabled: boolean
  created_at?: string
  updated_at?: string
}

export interface NavigationLink {
  id: string
  label: string
  url: string
  order_index: number
  is_active: boolean
  is_external: boolean
  created_at?: string
  updated_at?: string
}

/**
 * Check if current user is authorized to perform administrative actions.
 */
async function checkAdmin(supabase: any) {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new Error('Unauthorized')
  }
  return user
}

/**
 * Fetch site settings. Cached globally via Next.js unstable_cache.
 */
export const getSiteSettings = unstable_cache(
  async () => {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('site_settings')
      .select('*')
      .eq('id', 1)
      .single()
    if (error) {
      console.error('Error fetching site settings from DB:', error)
      return null
    }
    return data as SiteSettings
  },
  ['site-settings'],
  { tags: ['site-settings'] }
)

/**
 * Fetch all navigation links, ordered by order_index. Cached globally.
 */
export const getNavigationLinks = unstable_cache(
  async () => {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('navigation_links')
      .select('*')
      .order('order_index', { ascending: true })
    if (error) {
      console.error('Error fetching navigation links from DB:', error)
      return []
    }
    return data as NavigationLink[]
  },
  ['navigation-links'],
  { tags: ['navigation-links'] }
)

/**
 * Admin action to update site settings.
 */
export async function updateSiteSettingsAction(data: Partial<SiteSettings>) {
  try {
    const supabase = await createAdminClient()
    await checkAdmin(supabase)

    // Sanitize WhatsApp number (digits only)
    let sanitizedWhatsapp = data.whatsapp_number
    if (sanitizedWhatsapp) {
      sanitizedWhatsapp = sanitizedWhatsapp.replace(/\D/g, '')
    }

    const updateData = {
      ...data,
      whatsapp_number: sanitizedWhatsapp,
      id: 1 // enforce single row
    }

    const { error } = await supabase
      .from('site_settings')
      .update(updateData)
      .eq('id', 1)

    if (error) throw error

    revalidateTag('site-settings')
    revalidatePath('/', 'layout')
    return { success: true }
  } catch (error: any) {
    console.error('Failed to update site settings:', error)
    return { success: false, error: error.message || 'Failed to update settings' }
  }
}

/**
 * Admin action to create a new navigation link.
 */
export async function createNavigationLinkAction(data: Omit<NavigationLink, 'id'>) {
  try {
    const supabase = await createAdminClient()
    await checkAdmin(supabase)

    const { error } = await supabase
      .from('navigation_links')
      .insert([data])

    if (error) throw error

    revalidateTag('navigation-links')
    revalidatePath('/', 'layout')
    return { success: true }
  } catch (error: any) {
    console.error('Failed to create navigation link:', error)
    return { success: false, error: error.message || 'Failed to create link' }
  }
}

/**
 * Admin action to update a navigation link (including status toggle).
 */
export async function updateNavigationLinkAction(id: string, data: Partial<NavigationLink>) {
  try {
    const supabase = await createAdminClient()
    await checkAdmin(supabase)

    const { error } = await supabase
      .from('navigation_links')
      .update(data)
      .eq('id', id)

    if (error) throw error

    revalidateTag('navigation-links')
    revalidatePath('/', 'layout')
    return { success: true }
  } catch (error: any) {
    console.error('Failed to update navigation link:', error)
    return { success: false, error: error.message || 'Failed to update link' }
  }
}

/**
 * Admin action to delete a navigation link.
 */
export async function deleteNavigationLinkAction(id: string) {
  try {
    const supabase = await createAdminClient()
    await checkAdmin(supabase)

    const { error } = await supabase
      .from('navigation_links')
      .delete()
      .eq('id', id)

    if (error) throw error

    revalidateTag('navigation-links')
    revalidatePath('/', 'layout')
    return { success: true }
  } catch (error: any) {
    console.error('Failed to delete navigation link:', error)
    return { success: false, error: error.message || 'Failed to delete link' }
  }
}

/**
 * Admin action to reorder multiple navigation links at once.
 */
export async function reorderNavigationLinksAction(items: { id: string; order_index: number }[]) {
  try {
    const supabase = await createAdminClient()
    await checkAdmin(supabase)

    const promises = items.map(item =>
      supabase
        .from('navigation_links')
        .update({ order_index: item.order_index })
        .eq('id', item.id)
    )

    const results = await Promise.all(promises)
    const error = results.find(r => r.error)?.error
    if (error) throw error

    revalidateTag('navigation-links')
    revalidatePath('/', 'layout')
    return { success: true }
  } catch (error: any) {
    console.error('Failed to reorder navigation links:', error)
    return { success: false, error: error.message || 'Failed to reorder links' }
  }
}
