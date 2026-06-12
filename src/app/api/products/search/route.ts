import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q");

    if (!query || query.trim().length === 0) {
      return NextResponse.json({
        products: [],
        categories: [],
        brands: [],
        did_you_mean: null
      });
    }

    const supabase = await createClient();

    // Invoke the PostgreSQL RPC for dynamic aggregated search suggestions
    const { data, error } = await supabase.rpc("get_smart_search_suggestions", {
      search_query: query.trim()
    });

    if (error) {
      console.error("Database RPC error in search suggestions:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || {
      products: [],
      categories: [],
      brands: [],
      did_you_mean: null
    });
  } catch (error: any) {
    console.error("Unexpected error in search suggestions API:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
