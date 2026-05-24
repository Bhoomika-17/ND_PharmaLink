import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { CheckCircle, Clock, PackageOpen, Download, Sparkles, ShoppingCart, ShieldAlert, Settings, LayoutDashboard } from 'lucide-react'; 
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import autoTable from 'jspdf-autotable';
import jsPDF from 'jspdf';

export default function CustomerDashboard() {
  const { user } = useAuth();
  const { addToCart } = useCart(); 
  const [myOrders, setMyOrders] = useState([]);
  const [recommendations, setRecommendations] = useState([]); 
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      // Only fetch order history and recommendations if the user is a CUSTOMER
      if (user.role === 'CUSTOMER') {
        axios.get(import.meta.env.VITE_API_URL +`/api/users/${user.id}`)
          .then(res => user.balance = res.data.balance) 
          .catch(console.error);

        axios.get(import.meta.env.VITE_API_URL +`/api/users/${user.id}/orders`)
          .then(res => { setMyOrders(res.data); setLoading(false); })
          .catch(err => { console.error(err); setLoading(false); });

        axios.get(import.meta.env.VITE_API_URL +`/api/users/${user.id}/recommendations`)
          .then(res => setRecommendations(res.data))
          .catch(err => console.error(err));
          
        axios.get(import.meta.env.VITE_API_URL +`/api/users/${user.id}`)
        .then(res => user.balance = res.data.balance) // Quick patch to context
        .catch(console.error);
      } else {
        // If Admin, just stop loading
        setLoading(false);
      }
    }
  }, [user]);

  // --- PDF GENERATION FUNCTION (Customer Only) ---
  const generateInvoice = (order) => {
    const doc = new jsPDF();
    const orderTotal = order.cartItems?.reduce((sum, item) => sum + (item.price * item.quantity), 0) || 0;

    doc.setFontSize(22);
    doc.setTextColor(30, 64, 175); 
    doc.text("Nirmal & Durga Wholesale", 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Order ID: #${order.id}`, 14, 30);
    doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`, 14, 35);
    doc.text(`Status: ${order.status}`, 14, 40);

    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text("Billed To:", 14, 55);
    doc.setFontSize(10);
    doc.text(`Firm: ${user.name}`, 14, 62);
    doc.text(`Phone: ${user.phone}`, 14, 67);
    doc.text(`Drug License: ${user.licenseNumber}`, 14, 72);
    doc.text(`Address: ${user.address}`, 14, 77);

    const tableColumn = ["Medicine Name", "Firm", "Quantity", "Unit Price", "Total"];
    const tableRows = [];

    order.cartItems.forEach(item => {
      tableRows.push([
        item.name,
        item.firm?.name || order.firm?.name || "N/A",
        item.quantity,
        `Rs. ${item.price.toFixed(2)}`,
        `Rs. ${(item.price * item.quantity).toFixed(2)}`
      ]);
    });

    autoTable(doc, {
      startY: 85,
      head: [tableColumn],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [30, 64, 175] }
    });

    const finalY = doc.lastAutoTable.finalY || 85;
    doc.setFontSize(14);
    doc.setTextColor(21, 128, 61); 
    doc.text(`Grand Total: Rs. ${orderTotal.toFixed(2)}`, 14, finalY + 15);
    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text("Thank you for your business!", 105, 280, { align: 'center' });
    
    doc.save(`Invoice_Order_${order.id}.pdf`);
    toast.success("Invoice Downloaded!");
  };

  if (loading) return <div className="text-center mt-20 text-xl font-bold">Loading your profile...</div>;

  // ==========================================
  //         ADMIN PROFILE VIEW
  // ==========================================
  if (user?.role === 'ADMIN') {
    return (
      <div className="p-4 md:p-8 max-w-4xl mx-auto">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row items-center gap-6 mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
            <ShieldAlert size={150} />
          </div>
          <div className="bg-blue-900 text-white p-4 rounded-full shadow-lg z-10">
            <ShieldAlert size={48} />
          </div>
          <div className="z-10 text-center md:text-left">
            <h1 className="text-3xl font-black text-gray-800">Master Admin Profile</h1>
            <p className="text-gray-500 mt-1">System Administrator & Owner</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Admin Details Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2 border-b pb-2">
              <Settings size={20} className="text-blue-600"/> Security Details
            </h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Authorized Name</p>
                <p className="font-bold text-gray-800 text-lg">{user.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Registered Phone (Login ID)</p>
                <p className="font-bold text-gray-800 text-lg">{user.phone}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">System Role</p>
                <span className="inline-block mt-1 bg-red-100 text-red-800 font-black px-3 py-1 rounded-full text-xs tracking-wider">
                  SUPER ADMIN
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions Card */}
          <div className="bg-blue-50 rounded-xl shadow-sm border border-blue-100 p-6 flex flex-col justify-center">
            <h2 className="text-lg font-bold text-blue-900 mb-4 flex items-center gap-2">
              <LayoutDashboard size={20}/> Business Management
            </h2>
            <p className="text-sm text-blue-700 mb-6">
              All inventory, order tracking, and Khata ledger management is handled in your dedicated Admin Control Panel.
            </p>
            <Link to="/admin" className="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold py-4 rounded-lg flex items-center justify-center gap-2 transition shadow-md">
              <LayoutDashboard size={20} /> Launch Admin Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  //         CUSTOMER PROFILE VIEW
  // ==========================================
  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      {/* Profile Header */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8 flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-blue-900">{user.name}</h1>
          <p className="text-gray-600 mt-2">Phone: <span className="font-semibold">{user.phone}</span></p>
          <p className="text-gray-600">License: <span className="font-semibold">{user.licenseNumber}</span></p>
          <p className="text-gray-600">Location: <span className="font-semibold">{user.address}</span></p>
        </div>
        <div className="flex gap-4 w-full md:w-auto">
          <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex-1 text-center">
            <p className="text-xs text-blue-800 font-bold uppercase tracking-wider mb-1">Total Orders</p>
            <p className="text-3xl font-black text-blue-600">{myOrders.length}</p>
          </div>
          <div className="bg-red-50 p-4 rounded-xl border border-red-100 flex-1 text-center">
            <p className="text-xs text-red-800 font-bold uppercase tracking-wider mb-1">Total Due (Khata)</p>
            <p className="text-3xl font-black text-red-600">₹{user.balance?.toFixed(0) || 0}</p>
          </div>
        </div>
      </div>

      {/* --- RESTOCK PREDICTOR AGENT UI --- */}
      {recommendations.length > 0 && (
        <div className="mb-10 bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-xl border border-indigo-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
            <Sparkles size={100} />
          </div>
          <h2 className="text-xl font-bold text-indigo-900 mb-4 flex items-center gap-2 relative z-10">
            <Sparkles size={20} className="text-indigo-600" />
            Smart Restock Suggestions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
            {recommendations.map(item => (
              <div key={item.id} className="bg-white p-4 rounded-lg shadow-sm border border-indigo-50 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-gray-800">{item.name}</h3>
                  <p className="text-sm text-gray-500 mb-3">Frequently Ordered</p>
                </div>
                <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-50">
                  <span className="font-bold text-green-700">₹{item.price}</span>
                  <button 
                    onClick={() => {
                      addToCart(item);
                      toast.success(`${item.name} added to cart!`);
                    }}
                    className="flex items-center gap-1 bg-indigo-100 hover:bg-indigo-600 text-indigo-700 hover:text-white px-3 py-1.5 rounded text-sm font-bold transition"
                  >
                    <ShoppingCart size={16} /> Re-Order
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Order History */}
      <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-6 border-b pb-2">My Order History</h2>

      {myOrders.length === 0 ? (
        <div className="text-center p-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
          <PackageOpen size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500 text-lg">You haven't placed any orders yet.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {myOrders.map(order => {
            const orderTotal = order.cartItems?.reduce((sum, item) => sum + (item.price * item.quantity), 0) || 0;
            return (
              <div key={order.id} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col md:flex-row justify-between gap-6 hover:shadow-md transition">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="font-bold text-lg text-gray-800">Order #{order.id}</h3>
                    <span className="text-xs font-bold text-blue-600 bg-blue-100 px-3 py-1 rounded-full">
                      {order.firm?.name || "Multiple"}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mb-4">{new Date(order.createdAt).toLocaleString()}</p>
                  
                  <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <span className="font-bold block mb-1">Items:</span> 
                    {order.cartItems?.map(i => `${i.name} (x${i.quantity})`).join(', ')}
                  </div>
                </div>

                <div className="flex flex-col items-start md:items-end justify-between border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-6 min-w-[160px] gap-4">
                  <div className="text-left md:text-right w-full">
                    <p className="text-sm text-gray-500">Order Total</p>
                    <p className="text-2xl font-black text-green-700">₹{orderTotal.toFixed(2)}</p>
                  </div>
                  
                  <div className="flex flex-col gap-2 w-full">
                    <div className="text-left md:text-right">
                      {order.status === 'PENDING' ? (
                        <span className="inline-flex items-center justify-center gap-1 bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-bold w-full md:w-auto">
                          <Clock size={16}/> Pending
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center gap-1 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-bold w-full md:w-auto">
                          <CheckCircle size={16}/> Fulfilled
                        </span>
                      )}
                    </div>
                    
                    <button 
                      onClick={() => generateInvoice(order)}
                      className="flex items-center justify-center gap-2 text-sm font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded transition w-full md:w-auto"
                    >
                      <Download size={16} /> Bill / Invoice
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  );
}