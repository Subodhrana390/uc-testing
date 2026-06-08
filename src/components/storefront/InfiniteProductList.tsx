"use client";

import { useState, useEffect } from "react";
import ProductCard from "@/components/storefront/ProductCard";
import { fetchProductsPage } from "@/app/actions/products";

export default function InfiniteProductList({
  initialProducts,
  searchParams,
  totalPages,
}: {
  initialProducts: any[];
  searchParams: Record<string, string>;
  totalPages: number;
}) {
  const [products, setProducts] = useState(initialProducts);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Update initialProducts if search params change (Next.js server navigation)
  useEffect(() => {
    setProducts(initialProducts);
    setPage(1);
  }, [initialProducts]);

  useEffect(() => {
    if (!isMobile || page >= totalPages || loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: "200px" }
    );

    const target = document.getElementById("products-infinite-scroll-trigger");
    if (target) observer.observe(target);

    return () => {
      if (target) observer.unobserve(target);
    };
  }, [isMobile, page, totalPages, loading]);

  const loadMore = async () => {
    if (loading || page >= totalPages) return;
    setLoading(true);
    try {
      const nextPage = page + 1;
      const { products: newProducts } = await fetchProductsPage(nextPage, searchParams);
      if (newProducts.length > 0) {
        setProducts((prev) => [...prev, ...newProducts]);
        setPage(nextPage);
      }
    } catch (err) {
      console.error("Failed to load more products:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {(isMobile ? products : initialProducts).map((product) => (
          <ProductCard key={product.id} product={product as any} />
        ))}
      </div>
      {isMobile && page < totalPages && (
        <div id="products-infinite-scroll-trigger" className="w-full py-8 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}
    </>
  );
}
