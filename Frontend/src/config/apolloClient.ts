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

// Environment Variables
const BACKEND_URL = import.meta.env.VITE_APP_BACKEND_URL;
const WS_URL = import.meta.env.VITE_APP_BACKEND_WS_URL;

// Get plain token from sessionStorage
function getToken(): string | null {
  return sessionStorage.getItem("token");
}

// Mutation/Query names that don’t require auth
const PUBLIC_OPS = ["loginUser", "signupUser", "forgotPassword"];

// HTTP Link
const httpLink = createHttpLink({ uri: BACKEND_URL });

// Auth Link
const authLink = setContext((operation, { headers }) => {
  const token = getToken();
  if (PUBLIC_OPS.includes(operation.operationName || "")) {
    return { headers };
  }
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : "",
    },
  };
});

// Error Logging
const errorLink = onError(({ graphQLErrors, networkError }) => {
  graphQLErrors?.forEach((err) =>
    console.error("[GraphQL Error]", err.message)
  );
  if (networkError) console.error("[Network Error]", networkError);
});

// WebSocket Link
const wsLink = new GraphQLWsLink(
  createClient({
    url: WS_URL,
    connectionParams: () => {
      const token = getToken();
      return {
        authorization: token ? `Bearer ${token}` : "",
      };
    },
    lazy: true,
    retryAttempts: 5,
  })
);

// Link Split between WS and HTTP
const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === "OperationDefinition" &&
      definition.operation === "subscription"
    );
  },
  wsLink,
  errorLink.concat(authLink.concat(httpLink))
);

// Apollo Client Export
export const apolloClient = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache(),
});
