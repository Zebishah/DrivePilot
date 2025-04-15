import { ApolloClient, createHttpLink, InMemoryCache } from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { onError } from "@apollo/client/link/error";
import CryptoJS from "crypto-js";
import { useCookies } from "react-cookie"; // No need for useCookies in Apollo setup

const BACKEND_URL = import.meta.env.VITE_APP_BACKEND_URL;
const ENCRYPTION_KEY =
  import.meta.env.VITE_APP_ENCRYPTION_KEY || "your-fallback-key-secret";

// Utility function to decrypt the token
const decrypt = (encryptedData: string) => {
  const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
  return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
};

// List of public operations (no auth required)
const PUBLIC_OPERATIONS = ["loginUser", "signupUser", "forgotPassword"];

// Create the HTTP link
const httpLink = createHttpLink({ uri: BACKEND_URL });

// Middleware to attach token
const authLink = setContext((operation, { headers }) => {
  const cookies = useCookies(); // Get cookies
  const encryptedToken = cookies;
  const token = decrypt(encryptedToken); // Decrypt token

  // Skip auth for public operations
  if (PUBLIC_OPERATIONS.includes(operation.operationName || "")) {
    return { headers };
  }

  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : "",
    },
  };
});

// Handle errors (e.g., invalid token)
const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message }) => {
      console.error(`[GraphQL error]: ${message}`);
    });
  }
  if (networkError) {
    console.error(`[Network error]: ${networkError}`);
  }
});

// Create Apollo Client
export const apolloClient = new ApolloClient({
  link: errorLink.concat(authLink.concat(httpLink)),
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: { fetchPolicy: "network-only", errorPolicy: "all" },
    query: { fetchPolicy: "network-only", errorPolicy: "all" },
  },
});
