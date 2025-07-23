import {
  ApolloClient,
  createHttpLink,
  InMemoryCache,
  split,
} from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { onError } from "@apollo/client/link/error";
import { GraphQLWsLink } from "@apollo/client/link/subscriptions";
import { getMainDefinition } from "@apollo/client/utilities";
import { createClient } from "graphql-ws";
import CryptoJS from "crypto-js";

//  ENV CONFIG
const BACKEND_URL = import.meta.env.VITE_APP_BACKEND_URL; // e.g., http://localhost:4000/graphql
const WS_URL = import.meta.env.VITE_APP_BACKEND_WS_URL; // e.g., ws://localhost:4000/graphql
const ENCRYPTION_KEY = import.meta.env.VITE_APP_ENCRYPTION_KEY || "default-key";

//  Decryption Utility
const decrypt = (encryptedData: string) => {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return JSON.parse(decrypted);
  } catch (error) {
    console.error("Token decryption failed:", error);
    return null;
  }
};

//  Public Operations
const PUBLIC_OPERATIONS = ["loginUser", "signupUser", "forgotPassword"];

//  HTTP Link
const httpLink = createHttpLink({ uri: BACKEND_URL });

//  Auth Middleware
const authLink = setContext((operation, { headers }) => {
  const encryptedToken = localStorage.getItem("token");
  const token = encryptedToken ? decrypt(encryptedToken) : null;

  // Allow public operations without token
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

//  Error Handling
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

//  WebSocket Link for Subscriptions
const wsLink = new GraphQLWsLink(
  createClient({
    url: WS_URL,
    connectionParams: () => {
      const encryptedToken = localStorage.getItem("token");
      const token = encryptedToken ? decrypt(encryptedToken) : null;

      return {
        authorization: token ? `Bearer ${token}` : "",
      };
    },
    retryAttempts: 5,
  })
);

// Split Link: Use WS for Subscriptions, HTTP
const splitLink = split(
  ({ query }) => {
    const def = getMainDefinition(query);
    return (
      def.kind === "OperationDefinition" && def.operation === "subscription"
    );
  },
  wsLink,
  errorLink.concat(authLink.concat(httpLink))
);

// Apollo Client
export const apolloClient = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: { fetchPolicy: "network-only", errorPolicy: "all" },
    query: { fetchPolicy: "network-only", errorPolicy: "all" },
    mutate: { errorPolicy: "all" },
  },
});
