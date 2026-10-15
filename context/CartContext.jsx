"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

const parseCartItems = (serializedItems) => {
  if (typeof serializedItems !== "string") return null;

  try {
    const items = JSON.parse(serializedItems);
    if (
      !Array.isArray(items) ||
      !items.every(
        (item) =>
          item &&
          typeof item === "object" &&
          item.id !== undefined &&
          Number.isFinite(Number(item.price)),
      )
    ) {
      return null;
    }

    return items;
  } catch {
    return null;
  }
};

const getCartSummary = (items) => ({
  itemCount: items.length,
  totalPrice: items.reduce((total, item) => total + Number(item.price), 0),
});

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const [itemCount, setItemCount] = useState(0);
  const [totalPrice, setTotalPrice] = useState(0);
  const cartItemsRef = useRef([]);

  const updateCartState = useCallback((items) => {
    const summary = getCartSummary(items);
    cartItemsRef.current = items;
    setCartItems(items);
    setItemCount(summary.itemCount);
    setTotalPrice(summary.totalPrice);
  }, []);

  const persistCart = (items) => {
    const summary = getCartSummary(items);
    localStorage.setItem("cartItems", JSON.stringify(items));
    localStorage.setItem("itemCount", String(summary.itemCount));
    localStorage.setItem("totalPrice", String(summary.totalPrice));
  };

  useEffect(() => {
    const storedItems = localStorage.getItem("cartItems");
    const parsedItems = storedItems === null ? [] : parseCartItems(storedItems);
    if (parsedItems) updateCartState(parsedItems);

    const handleStorage = (event) => {
      if (event.storageArea && event.storageArea !== window.localStorage) return;
      if (event.key !== null && event.key !== "cartItems") return;

      if (event.key === null) {
        updateCartState([]);
        return;
      }

      // Read the current value so a delayed event cannot replace a newer cart.
      const latestValue = window.localStorage.getItem("cartItems");
      const latestItems = latestValue === null ? [] : parseCartItems(latestValue);
      if (latestItems) updateCartState(latestItems);
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [updateCartState]);

  const addToCart = (product) => {
    const updatedItems = [...cartItemsRef.current, product];
    updateCartState(updatedItems);
    persistCart(updatedItems);
  };

  const removeFromCart = (product) => {
    const index = cartItemsRef.current.findIndex((item) => item.id === product.id);
    if (index === -1) return;

    const updatedItems = [...cartItemsRef.current];
    updatedItems.splice(index, 1);
    updateCartState(updatedItems);
    persistCart(updatedItems);
  };

  const clearCart = () => {
    updateCartState([]);
    localStorage.removeItem("cartItems");
    localStorage.removeItem("itemCount");
    localStorage.removeItem("totalPrice");
  };

  return (
    <CartContext.Provider
      value={{
        cartItems,
        itemCount,
        totalPrice,
        addToCart,
        removeFromCart,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
