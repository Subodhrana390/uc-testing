export type CartItem = {
  id: string;
  slug: string;
  name: string;
  price: number;
  image_url?: string | null;
  quantity: number;
};

const CART_STORAGE_KEY = "uce_cart_items";

function isBrowser() {
  return typeof window !== "undefined";
}

export function getCartItems(): CartItem[] {
  if (!isBrowser()) return [];

  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

export function saveCartItems(items: CartItem[]) {
  if (!isBrowser()) return;
  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent("cart-updated"));
}

export function addCartItem(item: Omit<CartItem, "quantity">, quantity?: number) {
  const items = getCartItems();
  const existing = items.find((entry) => entry.id === item.id);

  const amountToAdd = quantity ?? 1;

  if (existing) {
    existing.quantity += amountToAdd;
    saveCartItems([...items]);
    return;
  }

  saveCartItems([...items, { ...item, quantity: amountToAdd }]);
}

export function updateCartItemQuantity(id: string, quantity: number) {
  const items = getCartItems()
    .map((item) => {
      if (item.id === id) {
        return { ...item, quantity };
      }
      return item;
    })
    .filter((item) => item.quantity > 0);

  saveCartItems(items);
}

export function removeCartItem(id: string) {
  saveCartItems(getCartItems().filter((item) => item.id !== id));
}

export function getCartCount() {
  return getCartItems().length;
}

export function getCartTotal() {
  return getCartItems().reduce((total, item) => total + item.price * item.quantity, 0);
}

export function isInCart(id: string) {
  return getCartItems().some((item) => item.id === id);
}

export function clearCart() {
  if (!isBrowser()) return;
  window.localStorage.removeItem(CART_STORAGE_KEY);
  window.dispatchEvent(new CustomEvent("cart-updated"));
}
