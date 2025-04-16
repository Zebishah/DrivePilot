import type React from "react";
import { createContext, useContext, useState, useEffect } from "react";
import Cookies from "js-cookie";
import { ApolloClient, createHttpLink, InMemoryCache } from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import CryptoJS from "crypto-js";
import type { AuthPayload, TempAuthPayload } from "../types/auth";

// Constants
const COOKIE_TOKEN_KEY = "token_dsp";
const COOKIE_USER_KEY = "user_dsp";
const COOKIE_EXPIRES = 1; // days
const PUBLIC_OPERATIONS = ["loginUser", "signupUser", "forgotPassword"];
const BACKEND_URL = import.meta.env.VITE_APP_BACKEND_URL;
const ENCRYPTION_KEY =
  import.meta.env.VITE_APP_ENCRYPTION_KEY || "your-fallback-key-secure";

interface AuthContextType {
  isAuthenticated: boolean;
  isTempAuthenticated: boolean;
  isVerified: boolean; // Added isVerified property
  user: AuthPayload["user"] | null;
  tempUserData: TempAuthPayload["tempUserData"] | null;
  login: (authPayload: AuthPayload) => void;
  tempUser: (authPayload: AuthPayload) => void;
  verifyUser: (authPayload: TempAuthPayload) => void;
  logout: () => void;
  client: ApolloClient<any>;
  markUserProfileComplete: () => void;
}

// Encryption utilities
const encrypt = (data: any): string => {
  return CryptoJS.AES.encrypt(JSON.stringify(data), ENCRYPTION_KEY).toString();
};

const decrypt = (encryptedData: string): any => {
  try {
    if (!encryptedData || typeof encryptedData !== "string") return null;

    const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
    const decryptedText = bytes.toString(CryptoJS.enc.Utf8);

    if (!decryptedText) return null; // Avoid parsing empty string

    return JSON.parse(decryptedText);
  } catch (error) {
    console.error("Decryption error:", error);
    return null;
  }
};
// Create Apollo Client
const createApolloClient = () => {
  const httpLink = createHttpLink({
    uri: BACKEND_URL,
  });

  const authLink = setContext((operation, { headers }) => {
    const encryptedToken = Cookies.get(COOKIE_TOKEN_KEY);

    // Skip auth for public operations
    if (PUBLIC_OPERATIONS.includes(operation.operationName || "")) {
      return { headers };
    }

    let token = null;
    if (encryptedToken) {
      token = decrypt(encryptedToken);
    }

    return {
      headers: {
        ...headers,
        authorization: token ? `Bearer ${token}` : "",
      },
    };
  });

  return new ApolloClient({
    link: authLink.concat(httpLink),
    cache: new InMemoryCache(),
  });
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<AuthPayload["user"] | null>(null);
  const [tempUserData, setTempUserData] = useState<
    TempAuthPayload["tempUserData"] | null
  >(null);
  const [client] = useState(() => createApolloClient());
  const [isTempAuthenticated, setIsTempAuthenticated] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  const login = (authPayload: AuthPayload) => {
    const encryptedToken = encrypt(authPayload.token);
    const encryptedUser = encrypt(authPayload.user);

    Cookies.set(COOKIE_TOKEN_KEY, encryptedToken, { expires: COOKIE_EXPIRES });
    Cookies.set(COOKIE_USER_KEY, encryptedUser, { expires: COOKIE_EXPIRES });

    setIsAuthenticated(true);
    setUser(authPayload.user);
  };

  const tempUser = (authPayload: AuthPayload) => {
    const encryptedToken = encrypt(authPayload.token);
    const encryptedUser = encrypt(authPayload.user);

    Cookies.set(COOKIE_TOKEN_KEY, encryptedToken, { expires: COOKIE_EXPIRES });

    Cookies.set(COOKIE_USER_KEY, encryptedUser, { expires: COOKIE_EXPIRES });
    setIsTempAuthenticated(true);
    setIsVerified(authPayload.user.isUserVerified);
    setUser(authPayload.user);
  };
  const verifyUser = (authPayload: TempAuthPayload) => {
    const encryptedUser = encrypt(authPayload.tempUserData);
    localStorage.setItem(COOKIE_USER_KEY, encryptedUser);
    setTempUserData(authPayload.tempUserData);
  };
  const markUserProfileComplete = () => {
    if (user) {
      const updatedUser = { ...user, isProfileComplete: true };
      const encryptedUser = encrypt(updatedUser);

      Cookies.set(COOKIE_USER_KEY, encryptedUser, { expires: COOKIE_EXPIRES });
      setUser(updatedUser);
    }
  };

  const logout = () => {
    Cookies.remove(COOKIE_TOKEN_KEY);
    Cookies.remove(COOKIE_USER_KEY);

    setIsAuthenticated(false);
    setUser(null);

    // Clear Apollo cache
    client.resetStore();
  };

  // Check authentication status on mount
  const [loading, setLoading] = useState(true); // Added loading state

  useEffect(() => {
    const encryptedToken = Cookies.get(COOKIE_TOKEN_KEY);
    const encryptedUser = Cookies.get(COOKIE_USER_KEY);

    if (encryptedToken && encryptedUser) {
      try {
        const decryptedUser = decrypt(encryptedUser);

        setIsAuthenticated(decryptedUser.isUserVerified);
        setUser(decryptedUser);
        setIsTempAuthenticated(decryptedUser.isUserVerified);
      } catch (error) {
        console.error("Error decrypting auth data:", error);
        logout();
      }
    }

    setLoading(false); // Mark auth check as complete
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen loading-spinner">
        {/* Spinner */}
        <div className="w-16 h-16 border-4 rounded-full border-t-transparent border-blue-600 animate-spin"></div>
      </div>
    ); // Replace with a spinner or skeleton UI
  }

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        login,
        logout,
        client,
        tempUser,
        verifyUser,
        isVerified,
        tempUserData,
        isTempAuthenticated,
        markUserProfileComplete,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
