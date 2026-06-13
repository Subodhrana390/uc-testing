"use client";

import { useState, useEffect, useMemo } from "react";
import ProductCard from "@/components/storefront/ProductCard";
import { fetchProductsPage } from "@/app/actions/products";
import { useInfiniteQuery } from "@tanstack/react-query";

export default function InfiniteProductList({
  initialProducts,
  searchParams,
  totalPages,
}: {
  initialProducts: any[];
  searchParams: Record<string, string>;
  totalPages: number;
}) {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["products-infinite", searchParams],
    queryFn: async ({ pageParam = 1 }) => {
      const { products } = await fetchProductsPage(pageParam, searchParams);
      return { products, page: pageParam };
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.page < totalPages) return lastPage.page + 1;
      return undefined;
    },
    initialPageParam: 1,
    initialData: {
      pages: [{ products: initialProducts, page: 1 }],
      pageParams: [1],
    },
    staleTime: 5 * 60 * 1000,
  });

  const allProducts = useMemo(() => {
    if (!isMobile) return initialProducts;
    return data ? data.pages.flatMap((page) => page.products) : initialProducts;
  }, [data, initialProducts, isMobile]);

  useEffect(() => {
    if (!isMobile || !hasNextPage || isFetchingNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchNextPage();
        }
      },
      { rootMargin: "200px" }
    );

    const target = document.getElementById("products-infinite-scroll-trigger");
    if (target) observer.observe(target);

    return () => {
      if (target) observer.unobserve(target);
    };
  }, [isMobile, hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:gap-6 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
        {allProducts.map((product) => (
          <ProductCard key={product.id} product={product as any} />
        ))}
      </div>
      {isMobile && hasNextPage && (
        <div id="products-infinite-scroll-trigger" className="w-full py-8 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}
    </>
  );
}
