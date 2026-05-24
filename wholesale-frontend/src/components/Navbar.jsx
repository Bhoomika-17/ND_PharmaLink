import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ShoppingCart, LogOut, CircleUser, ShieldAlert, PackageSearch } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { cart } = useCart();
  const navigate = useNavigate();
  const location = useLocation(); // <-- Get current URL path
  const path = location.pathname; 

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const cartItemCount = cart.reduce((total, item) => total + item.quantity, 0);

  // Helper function to dynamically set classes based on active route
  const getLinkClass = (route) => {
    const baseClass = "flex flex-col items-center transition relative pb-1";
    const activeClass = "text-yellow-300 font-black"; // Highlight color
    const inactiveClass = "hover:text-blue-200 opacity-80 hover:opacity-100";
    
    return `${baseClass} ${path === route ? activeClass : inactiveClass}`;
  };

  return (
    <nav className="bg-blue-800 text-white p-3 shadow-md sticky top-0 z-50">
      <div className="container mx-auto flex justify-between items-center">
        
        <Link to="/" className="text-lg md:text-xl font-black leading-tight">
          ND<br className="md:hidden" />
          <span className="text-blue-300 text-sm md:text-base font-semibold md:ml-2">PharmaLink</span>
        </Link>

        <div className="flex items-center gap-4 md:gap-6">
          
          <Link to="/products" className={getLinkClass('/products')}>
            <PackageSearch size={20} className="md:hidden" />
            <span className="hidden md:inline font-bold">Medicines</span>
            {path === '/products' && <span className="absolute -bottom-1 left-0 w-full h-1 bg-yellow-300 rounded-t"></span>}
          </Link>
          
          {/* ONLY SHOW CART IF USER IS NOT ADMIN */}
          {user?.role !== 'ADMIN' && (
            <Link to="/cart" className={getLinkClass('/cart')}>
              <div className="relative">
                <ShoppingCart size={20} className="md:hidden" />
                <span className="hidden md:inline font-bold">Cart</span>
                {cartItemCount > 0 && (
                  <span className="absolute -top-2 -right-3 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full z-10">
                    {cartItemCount}
                  </span>
                )}
              </div>
              {path === '/cart' && <span className="absolute -bottom-1 left-0 w-full h-1 bg-yellow-300 rounded-t"></span>}
            </Link>
          )}

          {user?.role === 'ADMIN' && (
            <Link to="/admin" className={getLinkClass('/admin')}>
              <ShieldAlert size={20} className="md:hidden" />
              <span className="hidden md:inline font-bold">Admin</span>
              {path === '/admin' && <span className="absolute -bottom-1 left-0 w-full h-1 bg-yellow-300 rounded-t"></span>}
            </Link>
          )}

          <div className="flex items-center gap-3 border-l border-blue-700 pl-4 ml-1">
            <Link to="/profile" className={getLinkClass('/profile')}>
              <CircleUser size={24} />
              <span className="hidden lg:inline font-bold text-sm ml-1">{user?.name}</span>
            </Link>
            
            <button onClick={handleLogout} className="text-red-300 hover:text-red-100 transition" title="Logout">
              <LogOut size={20} />
            </button>
          </div>

        </div>
      </div>
    </nav>
  );
}