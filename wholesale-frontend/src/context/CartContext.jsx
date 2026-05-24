import { createContext, useState, useContext } from 'react';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);

  const addToCart = (medicine) => {
    setCart((prevCart) => {
      // Check if item is already in cart
      const existingItem = prevCart.find((item) => item.id === medicine.id);
      if (existingItem) {
        return prevCart.map((item) =>
          item.id === medicine.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prevCart, { ...medicine, quantity: 1 }];
    });
  };
const updateQuantity = (medicineId, change) => {
    setCart((prevCart) => prevCart.map((item) => {
      if (item.id === medicineId) {
        const newQuantity = item.quantity + change;
        // Don't allow quantity to go below 1 (use remove for that)
        return newQuantity > 0 ? { ...item, quantity: newQuantity } : item;
      }
      return item;
    }));
  };
  const removeFromCart = (medicineId) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== medicineId));
  };

  const clearCart = () => setCart([]);

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQuantity, clearCart }}>
      {children}
    </CartContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useCart = () => useContext(CartContext);