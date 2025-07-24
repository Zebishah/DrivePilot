import { ApolloClient, InMemoryCache, split, HttpLink } from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { onError } from "@apollo/client/link/error";
import { GraphQLWsLink } from "@apollo/client/link/subscriptions";
import { createClient } from "graphql-ws";
import { getMainDefinition } from "@apollo/client/utilities";

// Environment vars
const BACKEND_URL = import.meta.env.VITE_APP_BACKEND_URL; // http://localhost:4000/graphql
const WS_URL = import.meta.env.VITE_APP_BACKEND_WS_URL; // ws://localhost:4000/graphql

function getToken(): string | null {
  return sessionStorage.getItem("token");
}

const PUBLIC_OPS = ["loginUser", "signupUser", "forgotPassword"];

// HTTP link for queries/mutations
const httpLink = new HttpLink({
  uri: BACKEND_URL,
});

// WebSocket link for subscriptions
const wsLink = new GraphQLWsLink(
  createClient({
    url: WS_URL,
    lazy: true,
    retryAttempts: 5,
    connectionParams: () => {
      const token = getToken();
      return {
        authorization: token ? `Bearer ${token}` : "",
      };
    },
  })
);

// Auth link
const authLink = setContext((operation, { headers }) => {
  const token = getToken();
  const isPublic = PUBLIC_OPS.includes(operation.operationName || "");
  return {
    headers: {
      ...headers,
      ...(isPublic ? {} : { authorization: token ? `Bearer ${token}` : "" }),
    },
  };
});

// Error handler
const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors) {
    for (let err of graphQLErrors) {
      console.error("[GraphQL error]", err.message);
    }
  }
  if (networkError) {
    console.error("[Network error]", networkError);
  }
});

// Split link to route between http/ws
const splitLink = split(
  ({ query }) => {
    const def = getMainDefinition(query);
    return (
      def.kind === "OperationDefinition" && def.operation === "subscription"
    );
  },
  wsLink, // for subscriptions
  errorLink.concat(authLink.concat(httpLink)) // for query/mutation
);

export const apolloClient = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache(),
});
