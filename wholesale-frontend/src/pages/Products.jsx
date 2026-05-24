import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { ShoppingCart, Search, Sparkles, XCircle, Camera, Edit, X, Mic } from 'lucide-react'; 
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext'; 
import toast from 'react-hot-toast';

export default function Products() {
  const { user } = useAuth(); 
  const { addToCart } = useCart();
  
  const [allMedicines, setAllMedicines] = useState([]); 
  const [displayMedicines, setDisplayMedicines] = useState([]); 
  const [firms, setFirms] = useState([]); 
  
  const [selectedFirm, setSelectedFirm] = useState('ALL'); 
  const [selectedCompany, setSelectedCompany] = useState('ALL'); 
  
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isAiSearching, setIsAiSearching] = useState(false); 
  const [isAiMode, setIsAiMode] = useState(false); 
  const [isVisionScanning, setIsVisionScanning] = useState(false);
  const [isListening, setIsListening] = useState(false);
  
  const [isSaving, setIsSaving] = useState(false); // NEW: Loader for editing
  
  const fileInputRef = useRef(null); 
  const [editingMed, setEditingMed] = useState(null);

  const fetchMedicines = () => {
    setLoading(true);
    axios.get(import.meta.env.VITE_API_URL +'/api/medicines')
      .then(res => { 
        setAllMedicines(res.data); 
        setDisplayMedicines(res.data); 
        setIsAiMode(false);
        setLoading(false); 
      })
      .catch(err => { console.error(err); setLoading(false); });
  };
  
  useEffect(() => { 
    fetchMedicines(); 
    axios.get(import.meta.env.VITE_API_URL +'/api/firms').then(res => setFirms(res.data));
  }, [user]);

  const uniqueCompanies = [...new Set(allMedicines.map(med => med.company))].filter(c => c && c !== 'Unknown');

  const applyFilters = (text, firmId, companyName) => {
    let filtered = allMedicines;
    if (text !== '') {
      filtered = filtered.filter(med => 
        med.name.toLowerCase().includes(text.toLowerCase()) || 
        med.composition?.toLowerCase().includes(text.toLowerCase()) ||
        med.company?.toLowerCase().includes(text.toLowerCase())
      );
    }
    if (firmId !== 'ALL') filtered = filtered.filter(med => med.firmId === parseInt(firmId));
    if (companyName !== 'ALL') filtered = filtered.filter(med => med.company === companyName);
    setDisplayMedicines(filtered);
  };

  const handleTyping = (e) => {
    const text = e.target.value;
    setSearchTerm(text);
    setIsAiMode(false);
    applyFilters(text, selectedFirm, selectedCompany);
  };

  const handleFirmChange = (e) => {
    const firmId = e.target.value;
    setSelectedFirm(firmId);
    applyFilters(searchTerm, firmId, selectedCompany);
  };

  const handleCompanyChange = (e) => {
    const companyName = e.target.value;
    setSelectedCompany(companyName);
    applyFilters(searchTerm, selectedFirm, companyName);
  };

  const clearSearch = () => {
    setSearchTerm('');
    setSelectedFirm('ALL');
    setSelectedCompany('ALL');
    setIsAiMode(false);
    setDisplayMedicines(allMedicines);
  };

  const handleAiSearch = async () => {
    if (!searchTerm) return;
    setIsAiSearching(true);
    try {
      const res = await axios.post(import.meta.env.VITE_API_URL +'/api/ai/search', { prompt: searchTerm });
      setDisplayMedicines(res.data.results); 
      setIsAiMode(true); 
      toast.success(`AI searched for: ${res.data.aiInterpretedAs.join(', ')}`);
    } catch (error) {
      toast.error("AI Assistant unavailable right now.");
    }
    setIsAiSearching(false);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsVisionScanning(true);
    const loadingToast = toast.loading("Scanning handwritten list... Please wait."); 
    
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = async () => {
      try {
        const res = await axios.post(import.meta.env.VITE_API_URL +'/api/ai/vision-order', { imageBase64: reader.result });
        setDisplayMedicines(res.data.results);
        setIsAiMode(true);
        setSearchTerm(`Scanned List: ${res.data.aiInterpretedAs.join(', ')}`);
        toast.dismiss(loadingToast);

        if (res.data.results.length > 0) {
          res.data.results.forEach(med => addToCart(med));
          toast.success(`Magic! ${res.data.results.length} items automatically added to your cart.`);
        } else {
          toast.error("Couldn't match any items to your inventory.");
        }
      } catch (error) {
        toast.dismiss(loadingToast); 
        toast.error("Failed to read the image. Please try again.");
      }
      setIsVisionScanning(false);
      e.target.value = null; 
    };
  };

  const handleFindSubstitute = async () => {
    setIsAiSearching(true);
    try {
      const res = await axios.post(import.meta.env.VITE_API_URL +'/api/ai/substitute', { medicineName: searchTerm });
      setDisplayMedicines(res.data.results);
      setIsAiMode(true);
      setSearchTerm(`Substitutes for: ${searchTerm}`);
      if (res.data.results.length > 0) toast.success(`Found substitutes containing: ${res.data.aiInterpretedAs.join(', ')}`);
      else toast.error(`No substitutes found in your inventory.`);
    } catch (error) {
      toast.error("Substitute Assistant unavailable.");
    }
    setIsAiSearching(false);
  };

  const handleVoiceOrder = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return toast.error("Your browser does not support Voice Search.");
    
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN'; 
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
      toast("Listening... Speak your order!", { icon: "🎙️", duration: 3000 });
    };

    recognition.onresult = async (event) => {
      const transcript = event.results[0][0].transcript;
      setIsListening(false);
      setSearchTerm(`Voice: "${transcript}"`);
      setIsAiSearching(true);

      try {
        const res = await axios.post(import.meta.env.VITE_API_URL +'/api/ai/voice-order', { transcript });
        setDisplayMedicines(res.data.results);
        setIsAiMode(true);
        
        if (res.data.results.length > 0) {
          res.data.results.forEach(med => {
            for(let i=0; i < med.spokenQty; i++) addToCart(med); 
          });
          toast.success(`Magic! Added ${res.data.results.length} matched items to cart.`);
        } else {
          toast.error("Couldn't find those medicines in your inventory.");
        }
      } catch (error) {
        toast.error("Failed to process voice order.");
      }
      setIsAiSearching(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
      toast.error("Failed to hear you. Please try again.");
    };

    recognition.start();
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    setIsSaving(true); // Disable button
    try {
      await axios.put(import.meta.env.VITE_API_URL +`/api/medicines/${editingMed.id}`, editingMed);
      toast.success("Medicine updated successfully!");
      
      // FIX: Update the items locally instead of re-fetching. This preserves your filter!
      const matchedFirm = firms.find(f => f.id === parseInt(editingMed.firmId));
      const updatedMed = { ...editingMed, firm: matchedFirm };

      setAllMedicines(prev => prev.map(m => m.id === editingMed.id ? updatedMed : m));
      setDisplayMedicines(prev => prev.map(m => m.id === editingMed.id ? updatedMed : m));
      
      setEditingMed(null); 
    } catch (error) {
      toast.error("Failed to update medicine.");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <div className="text-center mt-20 text-xl font-bold">Loading Medicines...</div>;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto relative">
      <div className="flex flex-col xl:flex-row justify-between items-center mb-8 gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="w-full xl:w-auto text-center xl:text-left">
          <h1 className="text-2xl md:text-3xl font-black text-gray-800 tracking-tight">Available Medicines</h1>
          <p className="text-sm text-gray-500 mt-1">Live Wholesale Inventory</p>
        </div>
        
        <div className="flex flex-wrap items-center w-full xl:w-auto gap-2 justify-center xl:justify-end">
          <select value={selectedFirm} onChange={handleFirmChange} className="w-full md:w-36 border-2 border-gray-200 rounded-lg py-2.5 px-3 focus:outline-none focus:border-blue-500 bg-white font-semibold text-gray-700 cursor-pointer shadow-inner text-sm">
            <option value="ALL">All Firms</option>
            {firms.map(firm => <option key={firm.id} value={firm.id}>{firm.name}</option>)}
          </select>

          <select value={selectedCompany} onChange={handleCompanyChange} className="w-full md:w-44 border-2 border-gray-200 rounded-lg py-2.5 px-3 focus:outline-none focus:border-purple-500 bg-white font-semibold text-gray-700 cursor-pointer shadow-inner text-sm">
            <option value="ALL">All Companies</option>
            {uniqueCompanies.map((comp, idx) => <option key={idx} value={comp}>{comp}</option>)}
          </select>

          <div className="relative w-full md:w-64">
            <input 
              type="text" placeholder="Search..." value={searchTerm} onChange={handleTyping}
              className="w-full border-2 border-gray-200 rounded-lg py-2.5 pl-10 pr-10 focus:outline-none focus:border-blue-500 transition shadow-inner" 
            />
            {isListening ? (
              <div className="absolute left-3 top-3.5 flex items-end gap-[2px] h-4">
                <span className="w-1 bg-red-500 rounded-full animate-bounce h-2" style={{ animationDelay: '0ms' }}></span>
                <span className="w-1 bg-red-500 rounded-full animate-bounce h-4" style={{ animationDelay: '150ms' }}></span>
                <span className="w-1 bg-red-500 rounded-full animate-bounce h-3" style={{ animationDelay: '300ms' }}></span>
              </div>
            ) : (
              <Search className="absolute left-3 top-3.5 text-gray-400" size={18} />
            )}
            {(searchTerm || selectedFirm !== 'ALL' || selectedCompany !== 'ALL') && (
              <button onClick={clearSearch} className="absolute right-3 top-3 text-gray-400 hover:text-red-500 transition">
                <XCircle size={18} />
              </button>
            )}
          </div>
          
          <div className="flex gap-2 w-full md:w-auto justify-center">
            <input type="file" accept="image/*" capture="environment" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
            <button onClick={() => fileInputRef.current.click()} disabled={isVisionScanning} className="bg-slate-800 hover:bg-slate-900 text-white px-3 py-2 rounded-lg font-bold flex items-center justify-center transition disabled:opacity-70 shadow-sm">
              <Camera size={20} className={isVisionScanning ? "animate-pulse text-yellow-400" : ""} />
            </button>
            <button onClick={handleVoiceOrder} disabled={isListening || isAiSearching} className={`px-3 py-2 rounded-lg font-bold flex items-center justify-center transition shadow-sm ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-rose-100 text-rose-700 hover:bg-rose-200'}`}>
              <Mic size={20} />
            </button>
            <button onClick={handleAiSearch} disabled={isAiSearching || !searchTerm || isAiMode} className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition transform active:scale-95 ${isAiMode ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg' : 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:shadow-lg text-white disabled:opacity-70'}`}>
              <Sparkles size={18} className={isAiSearching ? "animate-spin" : ""} /> 
              <span className="hidden sm:inline">{isAiSearching ? 'Thinking...' : isAiMode ? 'AI Active' : 'Ask AI'}</span>
            </button>
          </div>
        </div>
      </div>
      
      {displayMedicines.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 px-4 flex flex-col items-center">
          <p className="text-gray-500 text-lg mb-6">{isAiMode ? `We couldn't find any exact matches for that in your inventory.` : `No medicines found matching your filters.`}</p>
          {!isAiMode && searchTerm && (
            <button onClick={handleFindSubstitute} disabled={isAiSearching} className="bg-purple-100 text-purple-700 hover:bg-purple-200 border border-purple-300 px-6 py-3 rounded-lg font-bold transition flex items-center gap-2 shadow-sm disabled:opacity-70">
              <Sparkles size={20} className={isAiSearching ? "animate-spin" : ""} />
              {isAiSearching ? "Finding matches..." : "Find Alternative Substitutes"}
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {displayMedicines.map((med) => (
            <div key={med.id} className="bg-white border rounded-lg p-3 shadow-sm hover:shadow-md transition flex flex-col h-full relative overflow-hidden group">
              <div className="flex-1">
                <div className="flex flex-wrap gap-1 mb-2">
                  <span className="text-[9px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 uppercase tracking-wider truncate max-w-[100%]">
                    {med.firm?.name || "Unknown Firm"}
                  </span>
                  <span className="text-[9px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200 uppercase tracking-wider flex items-center gap-1 truncate max-w-[100%]">
                    🏢 {med.company || "Unknown"}
                  </span>
                </div>
                <h2 className="text-sm font-bold text-gray-800 mt-1 group-hover:text-blue-700 transition leading-tight">{med.name}</h2>
                <p className="text-[11px] text-gray-500 mt-1 leading-snug">{med.composition}</p>
              </div>
              <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100">
                <span className="text-base font-black text-green-700">₹{med.price}</span>
                {user?.role === 'ADMIN' ? (
                  <button onClick={() => setEditingMed({ ...med, firmId: med.firmId || firms[0]?.id })} className="flex items-center gap-1 bg-yellow-50 hover:bg-yellow-500 border border-yellow-200 hover:border-yellow-500 text-yellow-700 hover:text-white px-2.5 py-1.5 rounded text-xs font-bold transition duration-300">
                    <Edit size={14} /> Edit
                  </button>
                ) : (
                  <button onClick={() => { addToCart(med); toast.success(`${med.name} added!`); }} className="flex items-center gap-1 bg-blue-50 hover:bg-blue-600 border border-blue-200 hover:border-blue-600 text-blue-700 hover:text-white px-2.5 py-1.5 rounded text-xs font-bold transition duration-300">
                    <ShoppingCart size={14} /> Add
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {editingMed && user?.role === 'ADMIN' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-blue-900 p-4 flex justify-between items-center">
              <h2 className="text-white font-bold text-lg flex items-center gap-2"><Edit size={20}/> Edit Medicine</h2>
              <button onClick={() => setEditingMed(null)} className="text-blue-200 hover:text-white transition"><X size={24}/></button>
            </div>
            
            <form onSubmit={submitEdit} className="p-6 flex flex-col gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Name</label>
                <input type="text" required value={editingMed.name} onChange={e => setEditingMed({...editingMed, name: e.target.value})} className="w-full border-2 border-gray-200 p-2 rounded focus:border-blue-500 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Company</label>
                  <input type="text" value={editingMed.company} onChange={e => setEditingMed({...editingMed, company: e.target.value})} className="w-full border-2 border-gray-200 p-2 rounded focus:border-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Composition</label>
                  <input type="text" value={editingMed.composition || ''} onChange={e => setEditingMed({...editingMed, composition: e.target.value})} className="w-full border-2 border-gray-200 p-2 rounded focus:border-blue-500 outline-none" placeholder="Optional" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Price (₹)</label>
                  <input type="number" step="0.01" required value={editingMed.price} onChange={e => setEditingMed({...editingMed, price: e.target.value})} className="w-full border-2 border-gray-200 p-2 rounded focus:border-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Stock</label>
                  <input type="number" required value={editingMed.stock} onChange={e => setEditingMed({...editingMed, stock: e.target.value})} className="w-full border-2 border-gray-200 p-2 rounded focus:border-blue-500 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Billing Firm</label>
                <select value={editingMed.firmId} onChange={e => setEditingMed({...editingMed, firmId: e.target.value})} className="w-full border-2 border-gray-200 p-2 rounded focus:border-blue-500 outline-none bg-white">
                  {firms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
              <div className="flex gap-3 mt-4">
                <button type="button" onClick={() => setEditingMed(null)} className="flex-1 bg-gray-100 text-gray-700 font-bold py-2 rounded hover:bg-gray-200 transition">Cancel</button>
                <button type="submit" disabled={isSaving} className={`flex-1 text-white font-bold py-2 rounded transition ${isSaving ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}>
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}