import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Package, FileText, PlusCircle, CheckCircle, Clock, Upload, IndianRupee } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('inventory');
  const [firms, setFirms] = useState([]);
  const [orders, setOrders] = useState([]);
  const [formData, setFormData] = useState({ name: '', composition: '', price: '', stock: '', firmId: '' });
  const [ledgerUsers, setLedgerUsers] = useState([]);
  
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const fileInputRef = useRef(null);

  // NEW: Loading States
  const [isAdding, setIsAdding] = useState(false);
  const [loadingOrderId, setLoadingOrderId] = useState(null);
  const [paymentLoadingId, setPaymentLoadingId] = useState(null);

  const fetchData = async () => {
    try {
      const firmRes = await axios.get(import.meta.env.VITE_API_URL +'/api/firms');
      setFirms(firmRes.data);
      if (firmRes.data.length > 0) setFormData(prev => ({ ...prev, firmId: firmRes.data[0].id }));
      
      const orderRes = await axios.get(import.meta.env.VITE_API_URL +'/api/orders');
      setOrders(orderRes.data);
      
      const ledgerRes = await axios.get(import.meta.env.VITE_API_URL +'/api/users/ledger');
      setLedgerUsers(ledgerRes.data);
    } catch (err) {
      toast.error("Failed to load dashboard data");
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleAddMedicine = async (e) => {
    e.preventDefault();
    setIsAdding(true);
    try {
      await axios.post(import.meta.env.VITE_API_URL +'/api/medicines', formData);
      toast.success("Medicine added successfully!");
      setFormData({ name: '', composition: '', price: '', stock: '', firmId: formData.firmId });
    } catch (error) {
      toast.error("Failed to add medicine.");
    } finally {
      setIsAdding(false);
    }
  };

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    setLoadingOrderId(orderId);
    try {
      await axios.put(import.meta.env.VITE_API_URL +`/api/orders/${orderId}/status`, { status: newStatus });
      toast.success(`Order marked as ${newStatus}`);
      fetchData(); 
    } catch (error) {
      toast.error("Failed to update order status");
    } finally {
      setLoadingOrderId(null);
    }
  };

  const handleKhataUpdate = async (userId, e) => {
  e.preventDefault();
  setPaymentLoadingId(userId);

  const formData = new FormData(e.target);
  const amount = formData.get('amount');
  const khataNote = formData.get('khataNote');

  try {
    await axios.put(import.meta.env.VITE_API_URL +`/api/users/${userId}/khata`, { amount, khataNote });
    toast.success("Ledger updated successfully!");
    fetchData(); // Refresh the data to show updates
  } catch (error) {
    toast.error("Failed to update ledger");
  } finally {
    setPaymentLoadingId(null);
  }
};

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const uploadFormData = new FormData();
    uploadFormData.append('file', file);
    uploadFormData.append('firmId', formData.firmId); 

    const loadToast = toast.loading("Uploading medicines...");
    try {
      const res = await axios.post(import.meta.env.VITE_API_URL +'/api/medicines/bulk', uploadFormData);
      toast.success(res.data.message, { id: loadToast });
      e.target.value = null; 
    } catch (error) {
      toast.error("Upload failed.", { id: loadToast });
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-[80vh] mt-4 md:mt-8 gap-4 md:gap-6 p-2 md:p-4">
      
      <div className="w-full md:w-64 bg-white shadow-md rounded-lg p-2 md:p-4 flex flex-row md:flex-col gap-2 overflow-x-auto border border-gray-100 scrollbar-hide">
        <h2 className="hidden md:block text-xl font-bold text-blue-900 mb-4 px-2">Admin Panel</h2>
        
        <button onClick={() => setActiveTab('inventory')} className={`flex items-center gap-2 p-3 rounded-md transition whitespace-nowrap ${activeTab === 'inventory' ? 'bg-blue-100 text-blue-800 font-bold' : 'hover:bg-gray-50 text-gray-600'}`}>
          <Package size={20} /> Add Medicine
        </button>
        <button onClick={() => setActiveTab('orders')} className={`flex items-center gap-2 p-3 rounded-md transition whitespace-nowrap ${activeTab === 'orders' ? 'bg-blue-100 text-blue-800 font-bold' : 'hover:bg-gray-50 text-gray-600'}`}>
          <FileText size={20} /> View Orders
        </button>
        <button onClick={() => setActiveTab('khata')} className={`flex items-center gap-2 p-3 rounded-md transition whitespace-nowrap ${activeTab === 'khata' ? 'bg-blue-100 text-blue-800 font-bold' : 'hover:bg-gray-50 text-gray-600'}`}>
          <IndianRupee size={20} /> Khata Ledger
        </button>
      </div>

      <div className="flex-1 bg-white shadow-md rounded-lg p-4 md:p-6 border border-gray-100 w-full overflow-hidden">
        
        {activeTab === 'inventory' && (
          <div>
            <div className="flex justify-between items-center mb-6 border-b pb-2">
              <h3 className="text-xl md:text-2xl font-bold text-gray-800">Add New Medicine</h3>
              <div>
                <input type="file" accept=".xlsx, .csv" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                <button type="button" onClick={() => fileInputRef.current.click()} className="bg-green-100 text-green-800 hover:bg-green-200 px-4 py-2 rounded-md font-bold flex items-center gap-2 transition">
                  <Upload size={18} /> Bulk Excel Upload
                </button>
              </div>
            </div>
            
            <form onSubmit={handleAddMedicine} className="bg-gray-50 p-4 md:p-6 rounded-lg border border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Medicine Name</label>
                  <input type="text" name="name" value={formData.name} onChange={handleChange} required className="w-full border p-2 rounded" placeholder="e.g. Paracetamol" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Select Firm</label>
                  <select name="firmId" value={formData.firmId} onChange={handleChange} className="w-full border p-2 rounded bg-white">
                    {firms.map(firm => <option key={firm.id} value={firm.id}>{firm.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-bold text-gray-700 mb-1">Composition</label>
                <input type="text" name="composition" value={formData.composition} onChange={handleChange} className="w-full border p-2 rounded" placeholder="e.g. Acetaminophen" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Wholesale Price (₹)</label>
                  <input type="number" step="0.01" name="price" value={formData.price} onChange={handleChange} required className="w-full border p-2 rounded" placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Stock Quantity</label>
                  <input type="number" name="stock" value={formData.stock} onChange={handleChange} required className="w-full border p-2 rounded" placeholder="100" />
                </div>
              </div>

              <button type="submit" disabled={isAdding} className={`w-full text-white font-bold py-3 rounded flex justify-center items-center gap-2 transition ${isAdding ? 'bg-green-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}>
                <PlusCircle size={20} /> {isAdding ? 'Saving...' : 'Save to Database'}
              </button>
            </form>
          </div>
        )}

        {activeTab === 'orders' && (
          <div>
            <h3 className="text-xl md:text-2xl font-bold text-gray-800 mb-6 border-b pb-2">Customer Orders</h3>
            
            {orders.length === 0 ? (
              <p className="text-gray-500">No orders have been placed yet.</p>
            ) : (
              <div className="flex flex-col gap-6">
                {orders.map(order => {
                  const orderTotal = order.cartItems?.reduce((sum, item) => sum + (item.price * item.quantity), 0) || 0;
                  return (
                    <div key={order.id} className="border border-gray-200 rounded-lg p-4 md:p-6 bg-gray-50 shadow-sm flex flex-col md:flex-row justify-between gap-4">
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <h4 className="font-bold text-lg text-blue-900">Order #{order.id}</h4>
                          {/* FIX: Removed overall firm badge */}
                        </div>
                        
                        <div className="mb-4 bg-white p-3 rounded border border-gray-100 shadow-sm">
                          <p className="text-sm font-bold text-gray-800">{order.user?.name} <span className="font-normal text-gray-500">| Ph: {order.user?.phone}</span></p>
                          <p className="text-sm text-gray-600 mt-1">📍 <span className="font-semibold">Location:</span> {order.user?.address || "No address provided"}</p>
                          <p className="text-xs text-gray-400 mt-2">{new Date(order.createdAt).toLocaleString()}</p>
                        </div>

                        <div className="mb-4">
                          <h5 className="font-bold text-gray-700 mb-2">Items Ordered:</h5>
                          <ul className="bg-white border rounded p-3 text-sm divide-y">
                            {order.cartItems?.map((item, idx) => (
                              <li key={idx} className="py-2 flex justify-between items-start">
                                <div>
                                  <p className="font-semibold text-gray-800">{item.name} <span className="text-gray-500 font-normal ml-1">x {item.quantity}</span></p>
                                  {/* FIX: Showing the firm associated with each specific item! */}
                                  <p className="text-xs text-blue-600 font-medium">🏢 {item.firm?.name || item.company || 'Partner Firm'}</p>
                                </div>
                                <span className="font-bold text-gray-700">₹{item.price * item.quantity}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div className="flex flex-col items-start md:items-end justify-between min-w-[150px] border-t md:border-t-0 md:border-l border-gray-200 pt-4 md:pt-0 md:pl-6 gap-4">
                        <div className="text-left md:text-right w-full">
                          <p className="text-sm text-gray-500">Order Total</p>
                          <p className="text-2xl font-black text-green-700">₹{orderTotal.toFixed(2)}</p>
                        </div>

                        <div className="flex flex-col items-start md:items-end gap-3 w-full">
                          {order.status === 'PENDING' ? (
                            <span className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-bold">
                              <Clock size={16}/> Pending
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-bold">
                              <CheckCircle size={16}/> Fulfilled
                            </span>
                          )}

                          {order.status === 'PENDING' && (
                            <button 
                              onClick={() => handleUpdateOrderStatus(order.id, 'FULFILLED')}
                              disabled={loadingOrderId === order.id}
                              className={`text-white px-4 py-2 rounded font-bold transition w-full shadow-sm ${loadingOrderId === order.id ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                            >
                              {loadingOrderId === order.id ? 'Processing...' : 'Mark Fulfilled'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'khata' && (
  <div>
    <h3 className="text-xl md:text-2xl font-bold text-gray-800 mb-6 border-b pb-2">Manual Customer Ledger</h3>
    <div className="grid gap-4">
      {ledgerUsers.map(customer => (
        <div key={customer.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex flex-col md:flex-row justify-between items-start gap-4">

          <div className="w-full md:w-1/3">
            <h4 className="font-bold text-lg">{customer.name}</h4>
            <p className="text-sm text-gray-600">Ph: {customer.phone}</p>
          </div>

          <form onSubmit={(e) => handleKhataUpdate(customer.id, e)} className="flex flex-col gap-3 w-full md:w-2/3 bg-white p-4 rounded border shadow-sm">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1">
                <label className="block text-xs font-bold text-gray-500 mb-1">Set Amount (₹)</label>
                <input 
                  type="number" step="0.01" required 
                  defaultValue={customer.balance}
                  name="amount"
                  className="border rounded p-2 w-full outline-none focus:border-blue-500 font-bold text-gray-800"
                />
              </div>
              <div className="flex-[2]">
                <label className="block text-xs font-bold text-gray-500 mb-1">Notes to Customer (Optional)</label>
                <input 
                  type="text" 
                  defaultValue={customer.khataNote || ''}
                  name="khataNote"
                  placeholder="e.g. Received 5000 via UPI today..."
                  className="border rounded p-2 w-full outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <button type="submit" disabled={paymentLoadingId === customer.id} className={`text-white font-bold px-4 py-2 rounded transition mt-1 w-full md:w-auto self-end ${paymentLoadingId === customer.id ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}>
              {paymentLoadingId === customer.id ? 'Updating...' : 'Update Ledger'}
            </button>
          </form>

        </div>
      ))}
    </div>
  </div>
)}
      </div>
    </div>
  );
}