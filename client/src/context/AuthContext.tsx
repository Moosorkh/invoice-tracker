import React, { createContext, useState, useEffect, ReactNode } from "react";

interface User {
  id: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (token: string, userData?: { userId: string; email: string }) => void;
  logout: () => void;
  isAuthenticated: boolean;
  checkTokenExpiration: () => boolean;
}

const defaultContext: AuthContextType = {
  user: null,
  token: null,
  loading: true,
  login: () => {},
  logout: () => {},
  isAuthenticated: false,
  checkTokenExpiration: () => false
};

export const AuthContext = createContext<AuthContextType>(defaultContext);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

   // Function to check if a token is expired
   const isTokenExpired = (token: string): boolean => {
    try {
      // Decode the JWT token (split by dot, get the middle part which is the payload)
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(
        decodeURIComponent(
          atob(base64)
            .split('')
            .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        )
      );

      // Check if the expiration time has passed
      return payload.exp * 1000 < Date.now();
    } catch (e) {
      console.error('Error checking token expiration:', e);
      return true; // If there's any error, consider the token expired
    }
  };

  // Function to check token expiration that can be called from components
  const checkTokenExpiration = (): boolean => {
    if (!token) return true;
    const expired = isTokenExpired(token);
    if (expired) {
      // Automatically logout if token is expired
      logout();
    }
    return expired;
  };

  useEffect(() => {
    // Check if user is logged in when app loads
    const storedToken = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");

    if (storedToken) {
      // Check if the stored token is expired
      if (isTokenExpired(storedToken)) {
        // Token is expired, clean up
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      } else {
        // Token is valid
        setToken(storedToken);
        
        if (storedUser) {
          try {
            setUser(JSON.parse(storedUser));
          } catch (e) {
            // Handle potential JSON parse error
            console.error("Failed to parse stored user data", e);
            localStorage.removeItem("user");
          }
        }
      }
    }
    
    setLoading(false);
  }, []);

  // Set up periodic token expiration check
  useEffect(() => {
    if (!token) return;
    
    // Check token expiration every 30 seconds
    const interval = setInterval(() => {
      if (isTokenExpired(token)) {
        console.log("Token has expired, logging out...");
        logout();
      }
    }, 30000); // 30 seconds
    
    return () => clearInterval(interval);
  }, [token]);

  const login = (token: string, userData?: { userId: string; email: string }) => {
    localStorage.setItem("token", token);
    
    if (userData) {
      // Convert from API response format to our User interface
      const user: User = {
        id: userData.userId,
        email: userData.email
      };
      localStorage.setItem("user", JSON.stringify(user));
      setUser(user);
    }
    
    setToken(token);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        logout,
        isAuthenticated: !!token,
        checkTokenExpiration
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the auth context
export const useAuth = () => React.useContext(AuthContext);