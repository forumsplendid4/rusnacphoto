export interface CartItem {
  photoId: string;
  photoUrl: string;
  filename: string;
  printSizeId: string;
  printSizeName: string;
  printSizePrice: number;
  quantity: number;
}

const CART_KEY = 'photo_cart';

export function getCart(eventId: string): CartItem[] {
  const data = localStorage.getItem(`${CART_KEY}_${eventId}`);
  return data ? JSON.parse(data) : [];
}

export function saveCart(eventId: string, items: CartItem[]): void {
  localStorage.setItem(`${CART_KEY}_${eventId}`, JSON.stringify(items));
}

export function clearCart(eventId: string): void {
  localStorage.removeItem(`${CART_KEY}_${eventId}`);
}

export function addToCart(eventId: string, item: Omit<CartItem, 'quantity'>, quantity: number): CartItem[] {
  const cart = getCart(eventId);
  const existing = cart.find(
    (c) => c.photoId === item.photoId && c.printSizeId === item.printSizeId
  );
  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.push({ ...item, quantity });
  }
  saveCart(eventId, cart);
  return cart;
}

export function removeFromCart(eventId: string, photoId: string, printSizeId: string): CartItem[] {
  let cart = getCart(eventId);
  cart = cart.filter((c) => !(c.photoId === photoId && c.printSizeId === printSizeId));
  saveCart(eventId, cart);
  return cart;
}

export function updateCartQuantity(eventId: string, photoId: string, printSizeId: string, quantity: number): CartItem[] {
  const cart = getCart(eventId);
  const item = cart.find((c) => c.photoId === photoId && c.printSizeId === printSizeId);
  if (item) {
    item.quantity = Math.max(1, quantity);
  }
  saveCart(eventId, cart);
  return cart;
}

export function getCartTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.printSizePrice * item.quantity, 0);
}
