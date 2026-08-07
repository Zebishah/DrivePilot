import { ApolloClient, InMemoryCache, HttpLink } from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { onError } from "@apollo/client/link/error";
import Cookies from "js-cookie";
import CryptoJS from "crypto-js";

// ✅ ENV
const BACKEND_URL = import.meta.env.VITE_APP_BACKEND_URL; // http://localhost:3000/graphql
const ENCRYPTION_KEY =
  import.meta.env.VITE_APP_ENCRYPTION_KEY || "your-fallback-key-secret";

// 🔓 Decrypt token utility
const decrypt = (encryptedData: string) => {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
    return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
  } catch (error) {
    console.error("❌ Failed to decrypt token:", error);
    return null;
  }
};

// 🔑 Get token from cookies
const getToken = (): string | null => {
  const encryptedToken = Cookies.get("token_dsp");
  if (!encryptedToken) return null;
  return decrypt(encryptedToken);
};

// 🛡 Public operations (no auth) — must match GraphQL operationName exactly
const PUBLIC_OPERATIONS = [
  "SignIn",
  "SignUp",
  "ForgotPassword",
  "ResetPassword",
  "VerifyUserOtp",
  "ResendOtp",
];

// 🌐 HTTP Link
const httpLink = new HttpLink({ uri: BACKEND_URL });

// 🔐 Auth Middleware
const authLink = setContext((operation, { headers }) => {
  const token = getToken();
  const isPublic = PUBLIC_OPERATIONS.includes(operation.operationName || "");
  // Never attach a stale Bearer token on public auth calls — backend throws
  // AuthenticationError on expired JWT during context creation, which blocks sign-in.
  return {
    headers: {
      ...headers,
      ...(isPublic
        ? { authorization: "" }
        : { authorization: token ? `Bearer ${token}` : "" }),
    },
  };
});

// 🚨 Error Link
const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message }) =>
      console.error("[GraphQL error]:", message)
    );
  }
  if (networkError) {
    console.error("[Network error]:", networkError);
  }
});

// ✅ Final Apollo Client
export const apolloClient = new ApolloClient({
  link: errorLink.concat(authLink.concat(httpLink)),
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: { fetchPolicy: "network-only", errorPolicy: "all" },
    query: { fetchPolicy: "network-only", errorPolicy: "all" },
  },
});
