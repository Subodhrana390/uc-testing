"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import ProductCard from "@/components/storefront/ProductCard";

export default function CategoryPage() {
  const params = useParams();
  const slug = params.slug as string;
  const supabase = useMemo(() => createClient(), []);
  const [category, setCategory] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCategoryPage() {
      const { data: categoryData } = await supabase.from("categories").select("*").eq("slug", slug).single();

      if (categoryData) {
        // Fetch all subcategories if this is a parent category
        const { data: subCategories } = await supabase
          .from("categories")
          .select("id")
          .eq("parent_id", categoryData.id);

        const categoryIds = [categoryData.id, ...(subCategories?.map(s => s.id) || [])];

        const { data: productData } = await supabase
          .from("products")
          .select("id, name, slug, price, sale_price, image_url, status, stock_quantity, moq, categories(name, slug, parent:categories!parent_id(name, slug)), product_reviews(rating)")
          .in("category_id", categoryIds)
          .order("created_at", { ascending: false });

        setCategory(categoryData);
        setProducts(productData || []);
      }

      setLoading(false);
    }

    if (slug) {
      fetchCategoryPage();
    }
  }, [slug, supabase]);

  if (loading) {
    return <div className="container mx-auto px-4 py-20 text-center text-sm font-semibold text-zinc-500">Loading category...</div>;
  }

  if (!category) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-3xl font-black text-zinc-950">Category not found</h1>
        <Link href="/categories" className="mt-4 inline-block text-sm font-black uppercase tracking-widest text-primary">
          View all categories
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-[linear-gradient(180deg,#fff8ef_0%,#ffffff_100%)]">
      <section className="container mx-auto px-4 py-10">
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-zinc-400">
          <Link href="/">Home</Link>
          <ChevronRight className="h-3 w-3" />
          <Link href="/categories">Categories</Link>
          <ChevronRight className="h-3 w-3" />
          <span>{category.name}</span>
        </div>

        <div className="mt-6 border border-orange-100 bg-zinc-950 p-8 text-white">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-orange-300">Category</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight">{category.name}</h1>
          <p className="mt-3 max-w-2xl text-sm text-zinc-300">
            Explore live products under this category with updated pricing and storefront links.
          </p>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        {!products.length && (
          <div className="mt-10 border border-dashed border-orange-200 bg-white p-10 text-center text-sm font-semibold text-zinc-600">
            No products are currently published in this category.
          </div>
        )}
      </section>
    </div>
  );
}
