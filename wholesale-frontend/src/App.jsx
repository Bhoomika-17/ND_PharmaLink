import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Products from './pages/Products';
import AdminDashboard from './pages/AdminDashboard';
import Cart from './pages/Cart';
import CustomerDashboard from './pages/CustomerDashboard';

// --- ROUTE GUARDS ---
// 1. Forces users to log in before seeing anything
const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

// 2. Protects the Admin panel
const AdminRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user || user.role !== 'ADMIN') return <Navigate to="/products" replace />;
  return children;
};

// --- LAYOUT WRAPPER ---
// Hides Navbar on the Login page for a clean landing screen
const AppLayout = () => {
  const { user } = useAuth();
  const location = useLocation();
  const hideNavbar = location.pathname === '/login' || !user;

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-16 md:pb-0">
      <Toaster position="top-right" />
      {!hideNavbar && <Navbar />}
      
      <main className="container mx-auto">
        <Routes>
          {/* Redirect the root URL to products (which will redirect to login if not authenticated) */}
          <Route path="/" element={<Navigate to="/products" replace />} />
          
          {/* Public Login Route (Redirects to products if already logged in) */}
          <Route path="/login" element={user ? <Navigate to="/products" replace /> : <Login />} />
          
          {/* Protected Customer Routes */}
          <Route path="/products" element={<ProtectedRoute><Products /></ProtectedRoute>} />
          <Route path="/cart" element={<ProtectedRoute><Cart /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><CustomerDashboard /></ProtectedRoute>} />
          
          {/* Protected Admin Route */}
          <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        </Routes>
      </main>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Router>
          <AppLayout />
        </Router>
      </CartProvider>
    </AuthProvider>
  );
}