'use server'

import { createAdminClient } from '@/utils/supabase/admin-server'
import { revalidatePath } from 'next/cache'

export async function toggleBrandStatus(brandId: string, currentStatus: boolean) {
  try {
    const supabase = await createAdminClient();
    const newStatus = !currentStatus;
    
    // Validate admin using auth.getUser() or let RLS handle it
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Unauthorized" };
    }

    const { error } = await supabase.from('brands').update({ status: newStatus }).eq('id', brandId);
    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/uc-admin-portal/brands');
    return { success: true, newStatus };
  } catch (err: any) {
    return { success: false, error: err.message || "An unexpected error occurred" };
  }
}

export async function toggleCategoryStatus(categoryId: string, currentStatus: boolean) {
  try {
    const supabase = await createAdminClient();
    const newStatus = !currentStatus;
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Unauthorized" };
    }

    const { error } = await supabase.from('categories').update({ status: newStatus }).eq('id', categoryId);
    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/uc-admin-portal/categories');
    return { success: true, newStatus };
  } catch (err: any) {
    return { success: false, error: err.message || "An unexpected error occurred" };
  }
}
