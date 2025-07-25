import { ApolloClient, InMemoryCache, HttpLink, split } from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { onError } from "@apollo/client/link/error";
import { getMainDefinition } from "@apollo/client/utilities";
import { GraphQLWsLink } from "@apollo/client/link/subscriptions";
import { createClient } from "graphql-ws";
import Cookies from "js-cookie";
import CryptoJS from "crypto-js";

// 📍 ENV
const BACKEND_URL = import.meta.env.VITE_APP_BACKEND_URL; // http://localhost:3000/graphql
const WS_URL = import.meta.env.VITE_APP_BACKEND_WS_URL; // ws://localhost:3000/graphql
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
  console.log("🔑 Token:", encryptedToken);
  if (!encryptedToken) return null;
  return decrypt(encryptedToken);
};

// 🛡 Public ops that don't need auth
const PUBLIC_OPERATIONS = ["loginUser", "signupUser", "forgotPassword"];

// 🌐 HTTP Link for Queries/Mutations
const httpLink = new HttpLink({ uri: BACKEND_URL });

// 🔐 Auth Middleware
const authLink = setContext((operation, { headers }) => {
  const token = getToken();
  const isPublic = PUBLIC_OPERATIONS.includes(operation.operationName || "");
  return {
    headers: {
      ...headers,
      ...(isPublic ? {} : { authorization: token ? `Bearer ${token}` : "" }),
    },
  };
});

// 🚨 Error Link
const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors)
    graphQLErrors.forEach(({ message }) =>
      console.error("[GraphQL error]:", message)
    );
  if (networkError) console.error("[Network error]:", networkError);
});

// 🔌 WebSocket Link for Subscriptions
const wsLink = new GraphQLWsLink(
  createClient({
    url: WS_URL,
    lazy: true,
    retryAttempts: 5,
    connectionParams: () => {
      const token = getToken();
      console.log("🔗 WS connectionParams:", { token });
      return {
        authorization: token ? `Bearer ${token}` : "",
      };
    },
    on: {
      connected: () => console.log("✅ WS Connected"),
      connecting: () => console.log("🔄 WS Connecting..."),
      closed: (event) =>
        console.log("❌ WS Closed", {
          code: event.code,
          reason: event.reason,
        }),
      error: (err) => console.error("🚨 WS Error", err),
    },
  })
);

// 🔀 Split HTTP & WS based on operation type
const splitLink = split(
  ({ query }) => {
    const def = getMainDefinition(query);
    console.log("🔍 Operation Type:", def.kind, def.operation); // 👈 Add this
    return (
      def.kind === "OperationDefinition" && def.operation === "subscription"
    );
  },
  wsLink,
  errorLink.concat(authLink.concat(httpLink))
);

// 🚀 Apollo Client Instance
export const apolloClient = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: { fetchPolicy: "network-only", errorPolicy: "all" },
    query: { fetchPolicy: "network-only", errorPolicy: "all" },
  },
});
