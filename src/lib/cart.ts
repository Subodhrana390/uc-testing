export type CartItem = {
  id: string;
  slug: string;
  name: string;
  price: number;
  image_url?: string | null;
  quantity: number;
  moq: number;
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

  // If no explicit quantity is provided, we add the MOQ amount.
  const amountToAdd = quantity ?? item.moq;

  if (existing) {
    existing.quantity += amountToAdd;
    // ensure quantity is at least moq
    if (existing.quantity < existing.moq) existing.quantity = existing.moq;
    saveCartItems([...items]);
    return;
  }

  const initialQty = Math.max(amountToAdd, item.moq);
  saveCartItems([...items, { ...item, quantity: initialQty }]);
}

export function updateCartItemQuantity(id: string, quantity: number) {
  const items = getCartItems()
    .map((item) => {
      if (item.id === id) {
        // Enforce MOQ floor if quantity is greater than 0
        const newQty = quantity > 0 && quantity < item.moq ? item.moq : quantity;
        return { ...item, quantity: newQty };
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
