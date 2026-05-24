import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Login() {
  const [view, setView] = useState('LOGIN'); 
  const [isLoading, setIsLoading] = useState(false); // NEW: Loading state
  const [showPassword, setShowPassword] = useState(false); // NEW: Password visibility state
  
  const [formData, setFormData] = useState({ name: '', phone: '', password: '', gstNumber: '', licenseNumber: '', address: '' });
  const [resetData, setResetData] = useState({ phone: '', otp: '', newPassword: '' });

  const navigate = useNavigate();
  const { login } = useAuth();

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handleResetChange = (e) => setResetData({ ...resetData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true); // Start Loader
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
    } finally {
      setIsLoading(false); // Stop Loader
    }
  };

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await axios.post(import.meta.env.VITE_API_URL +'/api/auth/forgot-password', { phone: resetData.phone });
      toast.success("OTP generated! (Check backend console for code)");
      setView('FORGOT_OTP');
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to send OTP");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await axios.post(import.meta.env.VITE_API_URL +'/api/auth/reset-password', resetData);
      toast.success("Password reset successful! Please login.");
      setView('LOGIN');
      setResetData({ phone: '', otp: '', newPassword: '' });
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to reset password");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-slate-900">
      
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-600 rounded-full mix-blend-screen filter blur-[100px] opacity-60 animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[30rem] h-[30rem] bg-cyan-500 rounded-full mix-blend-screen filter blur-[120px] opacity-50 animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#ffffff 1.5px, transparent 1.5px)', backgroundSize: '30px 30px' }}></div>
      </div>

      <div className="bg-white/95 backdrop-blur-md p-8 rounded-2xl shadow-2xl w-full max-w-md border border-white/50 relative z-10 mx-4 transition-all duration-300">
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-blue-900 tracking-tight">ND PharmaLink</h1>
          <p className="text-cyan-700 font-bold text-sm mt-1 tracking-wider uppercase">Wholesale Portal</p>
        </div>

        <h2 className="text-xl font-bold text-gray-800 mb-6 text-center">
          {view === 'LOGIN' && 'Sign In to Your Account'}
          {view === 'REGISTER' && 'Register New Business'}
          {view === 'FORGOT_PHONE' && 'Reset Password'}
          {view === 'FORGOT_OTP' && 'Create New Password'}
        </h2>

        {(view === 'LOGIN' || view === 'REGISTER') && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {view === 'REGISTER' && (
              <>
                <input type="text" name="name" placeholder="Business Name" onChange={handleChange} required className="w-full border-2 border-gray-200 p-3 rounded-lg focus:border-blue-500 outline-none transition" />
                {/* REMOVED BLUE BORDERS BELOW */}
                <input type="text" name="licenseNumber" placeholder="Drug License Number (Required)" onChange={handleChange} required className="w-full border-2 border-gray-200 p-3 rounded-lg focus:border-blue-500 outline-none transition" />
                <input type="text" name="address" placeholder="Full Shop Address / City (Required)" onChange={handleChange} required className="w-full border-2 border-gray-200 p-3 rounded-lg focus:border-blue-500 outline-none transition" />
                <input type="text" name="gstNumber" placeholder="GST Number (Optional)" onChange={handleChange} className="w-full border-2 border-gray-200 p-3 rounded-lg focus:border-blue-500 outline-none transition" />
              </>
            )}
            <input type="tel" name="phone" placeholder="Registered Phone Number" onChange={handleChange} required className="w-full border-2 border-gray-200 p-3 rounded-lg focus:border-blue-500 outline-none transition" />
            
            {/* NEW PASSWORD EYE ICON LOGIC */}
            <div className="relative w-full">
              <input 
                type={showPassword ? "text" : "password"} 
                name="password" 
                placeholder="Password" 
                onChange={handleChange} 
                required 
                className="w-full border-2 border-gray-200 p-3 pr-12 rounded-lg focus:border-blue-500 outline-none transition" 
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600 focus:outline-none"
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                )}
              </button>
            </div>
            
            {view === 'LOGIN' && (
              <div className="text-right">
                <button type="button" onClick={() => setView('FORGOT_PHONE')} className="text-sm text-blue-600 hover:text-blue-800 font-semibold hover:underline">
                  Forgot Password?
                </button>
              </div>
            )}

            <button type="submit" disabled={isLoading} className={`w-full text-white p-3 rounded-lg font-bold mt-2 shadow-lg transition transform ${isLoading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-700 hover:bg-blue-800 active:scale-95 shadow-blue-700/30'}`}>
              {isLoading ? 'Processing...' : (view === 'LOGIN' ? 'Secure Login' : 'Submit Registration')}
            </button>
          </form>
        )}

        {/* FORM 2: FORGOT PASSWORD (PHONE INPUT) */}
        {view === 'FORGOT_PHONE' && (
          <form onSubmit={handleRequestOtp} className="flex flex-col gap-4">
            <p className="text-sm text-gray-600 text-center mb-2">Enter your registered phone number. We will verify your account and allow you to reset your password.</p>
            <input type="tel" name="phone" placeholder="Registered Phone Number" value={resetData.phone} onChange={handleResetChange} required className="w-full border-2 border-gray-200 p-3 rounded-lg focus:border-blue-500 outline-none transition" />
            <button type="submit" disabled={isLoading} className={`w-full text-white p-3 rounded-lg font-bold mt-2 shadow-lg transition transform ${isLoading ? 'bg-cyan-400 cursor-not-allowed' : 'bg-cyan-600 hover:bg-cyan-700 active:scale-95 shadow-cyan-600/30'}`}>
              {isLoading ? 'Verifying...' : 'Verify Number'}
            </button>
          </form>
        )}

        {view === 'FORGOT_OTP' && (
          <form onSubmit={handlePasswordReset} className="flex flex-col gap-4">
            <p className="text-sm text-green-600 font-semibold text-center mb-2">Verification found! Please enter the 4-digit code provided to you.</p>
            <input type="text" name="otp" placeholder="Enter 4-Digit OTP" maxLength="4" value={resetData.otp} onChange={handleResetChange} required className="w-full border-2 border-gray-200 p-3 rounded-lg focus:border-blue-500 outline-none text-center font-bold tracking-[0.5em]" />
            
            <div className="relative w-full">
               <input type={showPassword ? "text" : "password"} name="newPassword" placeholder="Enter New Password" value={resetData.newPassword} onChange={handleResetChange} required className="w-full border-2 border-gray-200 p-3 pr-12 rounded-lg focus:border-blue-500 outline-none transition" />
               {/* Use the exact same SVG button logic from above here for the new password eye icon! */}
            </div>

            <button type="submit" disabled={isLoading} className={`w-full text-white p-3 rounded-lg font-bold mt-2 shadow-lg transition transform ${isLoading ? 'bg-green-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 active:scale-95 shadow-green-600/30'}`}>
              {isLoading ? 'Saving...' : 'Save New Password'}
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