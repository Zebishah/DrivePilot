import React from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { Provider } from "react-redux";
import { store } from "./store";
import Home from "./pages/public/Home";
import PublicRoutes from "./routes/PublicRoutes";
import OurInstructor from "./pages/public/OurInstructor";
import NotFound from "./components/common/NotFound";

// Define the router with type safety
const router = createBrowserRouter([
  {
    path: "/",
    element: <PublicRoutes />,
    children: [
      { path: "", element: <Home /> }, // Route for Home at "/"
      { path: 'instructors', element: <OurInstructor /> },
    ],
  },
  {
    path: "*",
    element: <NotFound />,
  },
]);

const App: React.FC = () => {
  return (
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>
  );
};

export default App;
