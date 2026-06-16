import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import toast from "react-hot-toast";

export interface CartItem {
  id: string;
  slug: string;
  name: string;
  price: number;
  image_url: string;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  removeItem: (id: string, silent?: boolean) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  getCartCount: () => number;
  getCartTotal: () => number;
  isInCart: (id: string) => boolean;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item, quantity = 1) => {
        set((state) => {
          const existingItem = state.items.find((i) => i.id === item.id);
          if (existingItem) {
            toast.success("Updated item quantity in cart");
            return {
              items: state.items.map((i) =>
                i.id === item.id ? { ...i, quantity: i.quantity + quantity } : i
              ),
            };
          }
          toast.success("Added to cart");
          return { items: [...state.items, { ...item, quantity }] };
        });
      },
      removeItem: (id, silent = false) => {
        set((state) => ({
          items: state.items.filter((i) => i.id !== id),
        }));
        if (!silent) {
          toast.success("Removed from cart");
        }
      },
      updateQuantity: (id, quantity) => {
        if (quantity < 1) {
          get().removeItem(id);
          return;
        }
        set((state) => ({
          items: state.items.map((i) =>
            i.id === id ? { ...i, quantity } : i
          ),
        }));
      },
      clearCart: () => {
        set({ items: [] });
      },
      getCartCount: () => {
        return get().items.length;
      },
      getCartTotal: () => {
        return get().items.reduce((total, item) => total + item.price * item.quantity, 0);
      },
      isInCart: (id) => {
        return get().items.some((i) => i.id === id);
      },
    }),
    {
      name: "uc-cart-storage", // unique name
      storage: createJSONStorage(() => localStorage),
    }
  )
);
