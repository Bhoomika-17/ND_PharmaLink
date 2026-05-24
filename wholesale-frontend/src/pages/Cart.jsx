import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { Trash2, Plus, Minus } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast'; // <-- Import Toast

export default function Cart() {
  const { cart, removeFromCart, updateQuantity, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const totalAmount = cart.reduce((total, item) => total + item.price * item.quantity, 0);

  const handleCheckout = async () => {
    if (!user) {
      toast.error("Please log in to place an order.");
      navigate('/login');
      return;
    }

    try {
      const firmId = cart[0].firmId; 
      
      await axios.post(import.meta.env.VITE_API_URL +'/api/orders', {
        userId: user.id,
        firmId: firmId,
        items: cart 
      });

      toast.success("Order placed successfully! Gaurav Varshney has been notified.", { duration: 4000 });
      clearCart();
      navigate('/products');
    } catch (error) {
      toast.error("Failed to place order. Please try again.");
    }
  };

  if (cart.length === 0) return <div className="p-8 text-center text-xl mt-10 text-gray-500">Your cart is empty.</div>;

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Your Cart</h1>
      
      <div className="bg-white shadow-md rounded-lg overflow-hidden border border-gray-200">
        <ul className="divide-y divide-gray-200">
          {cart.map((item) => (
            <li key={item.id} className="p-4 flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-800">{item.name}</h3>
                <p className="text-sm text-gray-500">{item.firm?.name || 'Firm'}</p>
              </div>
              
              {/* --- NEW QUANTITY CONTROLS --- */}
              <div className="flex items-center gap-3 bg-gray-100 rounded-lg p-1">
                <button onClick={() => updateQuantity(item.id, -1)} className="p-1 bg-white rounded shadow-sm hover:bg-gray-200 text-gray-700">
                  <Minus size={16} />
                </button>
                <span className="font-bold w-6 text-center">{item.quantity}</span>
                <button onClick={() => updateQuantity(item.id, 1)} className="p-1 bg-white rounded shadow-sm hover:bg-gray-200 text-gray-700">
                  <Plus size={16} />
                </button>
              </div>

              <div className="flex items-center gap-6 w-32 justify-end">
                <span className="text-lg font-bold text-green-700">₹{item.price * item.quantity}</span>
                <button onClick={() => removeFromCart(item.id)} className="text-red-500 hover:text-red-700 p-2">
                  <Trash2 size={20} />
                </button>
              </div>
            </li>
          ))}
        </ul>
        
        <div className="bg-gray-50 p-6 flex justify-between items-center border-t border-gray-200">
          <span className="text-xl font-bold text-gray-800">Total: ₹{totalAmount}</span>
          <button onClick={handleCheckout} className="bg-blue-700 text-white px-6 py-2 rounded font-bold hover:bg-blue-800 transition">
            Place Order
          </button>
        </div>
      </div>
    </div>
  );
}