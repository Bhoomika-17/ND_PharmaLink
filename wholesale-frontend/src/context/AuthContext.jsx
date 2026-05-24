import { createContext, useState, useContext } from 'react'; // Notice we removed useEffect

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  
  // 1. LAZY INITIALIZATION: Check localStorage immediately instead of using useEffect
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    
    if (storedUser && token) {
      return JSON.parse(storedUser);
    }
    return null;
  });

  const login = (userData, token) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', token);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// 2. Disable the Vite Fast Refresh warning for this specific line
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);