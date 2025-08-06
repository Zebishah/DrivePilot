import type React from "react";
import { useEffect } from "react";
import { RouterProvider } from "react-router-dom";
import { Provider } from "react-redux";
import { store } from "./store";
import { ThemeProvider } from "@mui/material";
import theme from "./themes/theme";
import router from "./routes";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ApolloProvider } from "@apollo/client";
import { Toaster } from "react-hot-toast";
import useSocket from "./hooks/useSockets";

const AppContent: React.FC = () => {
  const isSocketConnected = useSocket();
  const { client, token } = useAuth();

  useEffect(() => {
    if (token && isSocketConnected) {
      console.log("Socket is active and authenticated");
    }
  }, [token, isSocketConnected]);

  return (
    <ApolloProvider client={client}>
      <ThemeProvider theme={theme}>
        <Provider store={store}>
          <Toaster />
          <RouterProvider router={router} />
        </Provider>
      </ThemeProvider>
    </ApolloProvider>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
