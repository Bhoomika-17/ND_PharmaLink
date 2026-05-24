import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Login() {
  // view can be: 'LOGIN', 'REGISTER', 'FORGOT_PHONE', 'FORGOT_OTP'
  const [view, setView] = useState('LOGIN'); 
  
  // States for different forms
  const [formData, setFormData] = useState({ name: '', phone: '', password: '', gstNumber: '', licenseNumber: '', address: '' });
  const [resetData, setResetData] = useState({ phone: '', otp: '', newPassword: '' });

  const navigate = useNavigate();
  const { login } = useAuth();

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handleResetChange = (e) => setResetData({ ...resetData, [e.target.name]: e.target.value });

  // --- STANDARD LOGIN & REGISTRATION ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (view === 'LOGIN') {
        const res = await axios.post(import.meta.env.VITE_API_URL +'/api/login', { phone: formData.phone, password: formData.password });
        login(res.data.user, res.data.token);
        toast.success("Welcome back!");
        navigate('/products');
      } else {
        await axios.post(import.meta.env.VITE_API_URL +'/api/register', formData);
        toast.success("Registration successful! Please log in.");
        setView('LOGIN');
      }
    } catch (error) {
      toast.error(error.response?.data?.error || "Something went wrong");
    }
  };

  // --- REQUEST OTP ---
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    try {
      await axios.post(import.meta.env.VITE_API_URL +'/api/auth/forgot-password', { phone: resetData.phone });
      toast.success("OTP generated! (Check backend console for code)");
      setView('FORGOT_OTP');
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to send OTP");
    }
  };

  // --- SUBMIT NEW PASSWORD ---
  const handlePasswordReset = async (e) => {
    e.preventDefault();
    try {
      await axios.post(import.meta.env.VITE_API_URL +'/api/auth/reset-password', resetData);
      toast.success("Password reset successful! Please login.");
      setView('LOGIN');
      setResetData({ phone: '', otp: '', newPassword: '' }); // Clear data
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to reset password");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-slate-900">
      
      {/* --- ANIMATED MOLECULAR BACKGROUND --- */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-600 rounded-full mix-blend-screen filter blur-[100px] opacity-60 animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[30rem] h-[30rem] bg-cyan-500 rounded-full mix-blend-screen filter blur-[120px] opacity-50 animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#ffffff 1.5px, transparent 1.5px)', backgroundSize: '30px 30px' }}></div>
      </div>

      {/* --- FROSTED GLASS LOGIN CARD --- */}
      <div className="bg-white/95 backdrop-blur-md p-8 rounded-2xl shadow-2xl w-full max-w-md border border-white/50 relative z-10 mx-4 transition-all duration-300">
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-blue-900 tracking-tight">ND PharmaLink</h1>
          <p className="text-cyan-700 font-bold text-sm mt-1 tracking-wider uppercase">Wholesale Portal</p>
        </div>

        {/* --- DYNAMIC HEADER --- */}
        <h2 className="text-xl font-bold text-gray-800 mb-6 text-center">
          {view === 'LOGIN' && 'Sign In to Your Account'}
          {view === 'REGISTER' && 'Register New Business'}
          {view === 'FORGOT_PHONE' && 'Reset Password'}
          {view === 'FORGOT_OTP' && 'Create New Password'}
        </h2>

        {/* --- DYNAMIC FORMS --- */}
        
        {/* FORM 1: LOGIN OR REGISTER */}
        {(view === 'LOGIN' || view === 'REGISTER') && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {view === 'REGISTER' && (
              <>
                <input type="text" name="name" placeholder="Business Name" onChange={handleChange} required className="w-full border-2 border-gray-200 p-3 rounded-lg focus:border-blue-500 outline-none transition" />
                <input type="text" name="licenseNumber" placeholder="Drug License Number (Required)" onChange={handleChange} required className="w-full border-2 border-gray-200 p-3 rounded-lg focus:border-blue-500 outline-none transition border-l-4 border-l-blue-500" />
                <input type="text" name="address" placeholder="Full Shop Address / City (Required)" onChange={handleChange} required className="w-full border-2 border-gray-200 p-3 rounded-lg focus:border-blue-500 outline-none transition border-l-4 border-l-blue-500" />
                <input type="text" name="gstNumber" placeholder="GST Number (Optional)" onChange={handleChange} className="w-full border-2 border-gray-200 p-3 rounded-lg focus:border-blue-500 outline-none transition" />
              </>
            )}
            <input type="tel" name="phone" placeholder="Registered Phone Number" onChange={handleChange} required className="w-full border-2 border-gray-200 p-3 rounded-lg focus:border-blue-500 outline-none transition" />
            <input type="password" name="password" placeholder="Password" onChange={handleChange} required className="w-full border-2 border-gray-200 p-3 rounded-lg focus:border-blue-500 outline-none transition" />
            
            {view === 'LOGIN' && (
              <div className="text-right">
                <button type="button" onClick={() => setView('FORGOT_PHONE')} className="text-sm text-blue-600 hover:text-blue-800 font-semibold hover:underline">
                  Forgot Password?
                </button>
              </div>
            )}

            <button type="submit" className="w-full bg-blue-700 text-white p-3 rounded-lg hover:bg-blue-800 font-bold mt-2 shadow-lg shadow-blue-700/30 transition transform active:scale-95">
              {view === 'LOGIN' ? 'Secure Login' : 'Submit Registration'}
            </button>
          </form>
        )}

        {/* FORM 2: FORGOT PASSWORD (PHONE INPUT) */}
        {view === 'FORGOT_PHONE' && (
          <form onSubmit={handleRequestOtp} className="flex flex-col gap-4">
            <p className="text-sm text-gray-600 text-center mb-2">Enter your registered phone number. We will verify your account and allow you to reset your password.</p>
            <input type="tel" name="phone" placeholder="Registered Phone Number" value={resetData.phone} onChange={handleResetChange} required className="w-full border-2 border-gray-200 p-3 rounded-lg focus:border-blue-500 outline-none transition" />
            <button type="submit" className="w-full bg-cyan-600 text-white p-3 rounded-lg hover:bg-cyan-700 font-bold mt-2 shadow-lg shadow-cyan-600/30 transition transform active:scale-95">
              Verify Number
            </button>
          </form>
        )}

        {/* FORM 3: FORGOT PASSWORD (OTP & NEW PASSWORD) */}
        {view === 'FORGOT_OTP' && (
          <form onSubmit={handlePasswordReset} className="flex flex-col gap-4">
            <p className="text-sm text-green-600 font-semibold text-center mb-2">Verification found! Please enter the 4-digit code provided to you.</p>
            <input type="text" name="otp" placeholder="Enter 4-Digit OTP" maxLength="4" value={resetData.otp} onChange={handleResetChange} required className="w-full border-2 border-gray-200 p-3 rounded-lg focus:border-blue-500 outline-none text-center font-bold tracking-[0.5em]" />
            <input type="password" name="newPassword" placeholder="Enter New Password" value={resetData.newPassword} onChange={handleResetChange} required className="w-full border-2 border-gray-200 p-3 rounded-lg focus:border-blue-500 outline-none transition" />
            <button type="submit" className="w-full bg-green-600 text-white p-3 rounded-lg hover:bg-green-700 font-bold mt-2 shadow-lg shadow-green-600/30 transition transform active:scale-95">
              Save New Password
            </button>
          </form>
        )}

        {/* --- DYNAMIC FOOTER TOGGLES --- */}
        <p className="text-center mt-6 text-sm text-gray-600 border-t pt-4">
          {view === 'LOGIN' && (
            <>Don't have an account? <button onClick={() => setView('REGISTER')} className="text-blue-700 font-bold hover:underline">Apply here</button></>
          )}
          {view === 'REGISTER' && (
            <>Already registered? <button onClick={() => setView('LOGIN')} className="text-blue-700 font-bold hover:underline">Log in here</button></>
          )}
          {(view === 'FORGOT_PHONE' || view === 'FORGOT_OTP') && (
            <button onClick={() => { setView('LOGIN'); setResetData({ phone: '', otp: '', newPassword: '' }); }} className="text-gray-500 font-bold hover:underline flex items-center justify-center gap-1 w-full">
              ← Back to Login
            </button>
          )}
        </p>

      </div>
    </div>
  );
}