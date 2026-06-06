import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q");

    if (!query || query.trim().length === 0) {
      return NextResponse.json([]);
    }

    const supabase = await createClient();

    // Query active products matching the search phrase.
    // Restrict fields to minimize payload size and improve execution speed.
    const { data: products, error } = await supabase
      .from("products")
      .select("id, name, slug, price, sale_price, image_url")
      .eq("status", "Active")
      .ilike("name", `%${query.trim()}%`)
      .limit(6);

    if (error) {
      console.error("Database query error in search suggestions:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(products || []);
  } catch (error: any) {
    console.error("Unexpected error in search suggestions API:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
