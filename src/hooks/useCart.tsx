import { createContext, useContext, useState, ReactNode, useCallback } from "react";
import { Worker } from "@/data/mockWorkers";

interface CartItem {
  id: string;
  name: string;
  role: string;
  avatar: string;
  monthlyRate: string;
}

interface CartContextType {
  items: CartItem[];
  addItem: (worker: Worker) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  isInCart: (id: string) => boolean;
  itemCount: number;
}

const CartContext = createContext<CartContextType>({
  items: [],
  addItem: () => {},
  removeItem: () => {},
  clearCart: () => {},
  isInCart: () => false,
  itemCount: 0,
});

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = useCallback((worker: Worker) => {
    setItems((prev) => {
      if (prev.some((i) => i.id === worker.id)) return prev;
      return [...prev, {
        id: worker.id,
        name: worker.name,
        role: worker.role,
        avatar: worker.avatar,
        monthlyRate: worker.monthlyRate,
      }];
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const isInCart = useCallback((id: string) => items.some((i) => i.id === id), [items]);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, clearCart, isInCart, itemCount: items.length }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
