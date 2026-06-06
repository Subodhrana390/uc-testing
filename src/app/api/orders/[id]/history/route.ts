import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient as createAdminServerClient } from "@/utils/supabase/admin-server";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const orderId = params.id;
    if (!orderId) {
      return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
    }

    let supabase = await createClient();

    // Authenticate the user
    let { data: { user }, error: authError } = await supabase.auth.getUser();
    
    // If not authenticated, check if the admin cookie is present
    if (authError || !user) {
      const adminSupabase = await createAdminServerClient();
      const { data: { user: adminUser }, error: adminAuthError } = await adminSupabase.auth.getUser();
      if (!adminAuthError && adminUser) {
        user = adminUser;
        supabase = adminSupabase;
      }
    }

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch order history log
    const { data: history, error } = await supabase
      .from("order_status_history")
      .select("*, actor:actor_id(full_name, email)")
      .eq("order_id", orderId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, history });
  } catch (error: any) {
    console.error("Order History Retrieval Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
