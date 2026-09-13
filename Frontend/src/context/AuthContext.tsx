import type React from "react";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import Cookies from "js-cookie";
import {
  ApolloClient,
  createHttpLink,
  gql,
  InMemoryCache,
} from "@apollo/client";
import type { NormalizedCacheObject } from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import CryptoJS from "crypto-js";
import type { AuthPayload, TempAuthPayload } from "../types/auth";
import { clearAllOnboardingDrafts } from "../utils/onboardingDraft";

// Constants
const COOKIE_TOKEN_KEY = "token_dsp";
const COOKIE_USER_KEY = "user_dsp";
const COOKIE_EXPIRES = 1; // days
const PUBLIC_OPERATIONS = ["loginUser", "signupUser", "forgotPassword"];
const BACKEND_URL = import.meta.env.VITE_APP_BACKEND_URL;
const ENCRYPTION_KEY =
  import.meta.env.VITE_APP_ENCRYPTION_KEY || "your-fallback-key-secure";

const CURRENT_USER_QUERY = gql`
  query CurrentUser {
    me {
      id
      firstName
      lastName
      email
      role
      isProfileComplete
      isUserVerified
      isUserAuthenticated
      authProvider
      adminLevel
      createdAt
      updatedAt
    }
  }
`;

interface AuthContextType {
  isAuthenticated: boolean;
  isTempAuthenticated: boolean;
  isVerified: boolean;
  user: AuthPayload["user"] | null;
  tempUserData: TempAuthPayload["tempUserData"] | null;
  token: string | null; // ✅ Added token to the context
  login: (authPayload: AuthPayload) => void;
  tempUser: (authPayload: AuthPayload) => void;
  verifyUser: (authPayload: TempAuthPayload) => void;
  logout: () => void;
  client: ApolloClient<NormalizedCacheObject>;
  markUserProfileComplete: () => void;
  authLoading: boolean;
  authInitialized: boolean;
}

// Encryption utilities
const encrypt = (data: unknown): string => {
  return CryptoJS.AES.encrypt(JSON.stringify(data), ENCRYPTION_KEY).toString();
};

const decrypt = (encryptedData: string): unknown => {
  try {
    if (!encryptedData || typeof encryptedData !== "string") return null;
    const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
    const decryptedText = bytes.toString(CryptoJS.enc.Utf8);
    if (!decryptedText) return null;
    return JSON.parse(decryptedText);
  } catch (error) {
    console.error("Decryption error:", error);
    return null;
  }
};

const createApolloClient = () => {
  const httpLink = createHttpLink({ uri: BACKEND_URL });

  const authLink = setContext((operation, { headers }) => {
    const encryptedToken = Cookies.get(COOKIE_TOKEN_KEY);

    if (PUBLIC_OPERATIONS.includes(operation.operationName || "")) {
      return { headers };
    }

    let token: string | null = null;
    if (encryptedToken) {
      const decryptedToken = decrypt(encryptedToken);
      if (typeof decryptedToken === "string") token = decryptedToken;
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
  const [token, setToken] = useState<string | null>(null); // ✅ state to hold token
  const [tempUserData, setTempUserData] = useState<
    TempAuthPayload["tempUserData"] | null
  >(null);
  const [client] = useState(() => createApolloClient());
  const [isTempAuthenticated, setIsTempAuthenticated] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    void import("../utils/socket").then(({ disconnectSocket }) => {
      disconnectSocket();
    });
    Cookies.remove(COOKIE_TOKEN_KEY);
    Cookies.remove(COOKIE_USER_KEY);

    setIsAuthenticated(false);
    setUser(null);
    setToken(null); // ✅ clear token on logout
    setIsTempAuthenticated(false);
    setIsVerified(false);
    setTempUserData(null);
    clearAllOnboardingDrafts();

    client.resetStore();
  }, [client]);

  const login = useCallback((authPayload: AuthPayload) => {
    const encryptedToken = encrypt(authPayload.token);
    const encryptedUser = encrypt(authPayload.user);

    Cookies.set(COOKIE_TOKEN_KEY, encryptedToken, { expires: COOKIE_EXPIRES });
    Cookies.set(COOKIE_USER_KEY, encryptedUser, { expires: COOKIE_EXPIRES });

    setToken(authPayload.token); // ✅ set token
    setIsAuthenticated(true);
    setIsTempAuthenticated(false);
    setUser(authPayload.user);
    setIsVerified(Boolean(authPayload.user.isUserVerified));
    setTempUserData(null);
  }, []);

  const tempUser = useCallback((authPayload: AuthPayload) => {
    const encryptedToken = encrypt(authPayload.token);
    const encryptedUser = encrypt(authPayload.user);

    Cookies.set(COOKIE_TOKEN_KEY, encryptedToken, { expires: COOKIE_EXPIRES });
    Cookies.set(COOKIE_USER_KEY, encryptedUser, { expires: COOKIE_EXPIRES });

    setToken(authPayload.token); // ✅ set token for temp
    setIsAuthenticated(false);
    setIsTempAuthenticated(true);
    setIsVerified(Boolean(authPayload.user.isUserVerified));
    setUser(authPayload.user);
  }, []);

  const verifyUser = useCallback((authPayload: TempAuthPayload) => {
    const encryptedUser = encrypt(authPayload.tempUserData);
    localStorage.setItem(COOKIE_USER_KEY, encryptedUser);
    setTempUserData(authPayload.tempUserData);
  }, []);

  const markUserProfileComplete = useCallback(() => {
    if (user) {
      const updatedUser = { ...user, isProfileComplete: true };
      const encryptedUser = encrypt(updatedUser);
      Cookies.set(COOKIE_USER_KEY, encryptedUser, { expires: COOKIE_EXPIRES });
      setUser(updatedUser);
    }
  }, [user]);

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const encryptedToken = Cookies.get(COOKIE_TOKEN_KEY);
        const encryptedUser = Cookies.get(COOKIE_USER_KEY);

        if (encryptedToken && encryptedUser) {
          const decryptedUser = decrypt(encryptedUser) as AuthPayload["user"] | null;
          const decryptedToken = decrypt(encryptedToken);

          if (decryptedUser && typeof decryptedToken === "string") {
            setUser(decryptedUser);
            setToken(decryptedToken); // ✅ set token after decryption
            const verified = Boolean(decryptedUser.isUserVerified);
            setIsAuthenticated(verified);
            setIsTempAuthenticated(!verified);
            setIsVerified(verified);

            try {
              const { data } = await client.query({
                query: CURRENT_USER_QUERY,
                fetchPolicy: "network-only",
              });
              const currentUser = data?.me;

              if (currentUser) {
                const currentVerified = Boolean(currentUser.isUserVerified);
                Cookies.set(COOKIE_USER_KEY, encrypt(currentUser), {
                  expires: COOKIE_EXPIRES,
                });
                setUser(currentUser);
                setIsAuthenticated(currentVerified);
                setIsTempAuthenticated(!currentVerified);
                setIsVerified(currentVerified);
              }
            } catch (error) {
              const graphQLErrors = (error as { graphQLErrors?: Array<{ extensions?: { code?: string } }> })
                .graphQLErrors || [];
              const isAuthError = graphQLErrors.some((item) =>
                ["UNAUTHENTICATED", "FORBIDDEN"].includes(item.extensions?.code || "")
              );
              if (isAuthError) {
                Cookies.remove(COOKIE_TOKEN_KEY);
                Cookies.remove(COOKIE_USER_KEY);
                setUser(null);
                setToken(null);
                setIsAuthenticated(false);
                setIsTempAuthenticated(false);
                setIsVerified(false);
              } else {
                console.warn("Could not reconcile the restored session; retaining local session.", error);
              }
            }
          } else {
            Cookies.remove(COOKIE_TOKEN_KEY);
            Cookies.remove(COOKIE_USER_KEY);
          }
        }
      } catch (error) {
        console.error("Error decrypting auth data:", error);
        Cookies.remove(COOKIE_TOKEN_KEY);
        Cookies.remove(COOKIE_USER_KEY);
      } finally {
        setLoading(false);
      }
    };

    checkAuthStatus();
  }, [client]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen loading-spinner">
        <div className="w-16 h-16 border-4 rounded-full border-t-transparent border-blue-600 animate-spin"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isTempAuthenticated,
        isVerified,
        user,
        token, // ✅ exposed token here
        tempUserData,
        login,
        logout,
        client,
        tempUser,
        verifyUser,
        markUserProfileComplete,
        authLoading: loading,
        authInitialized: !loading,
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
