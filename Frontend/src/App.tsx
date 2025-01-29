import React from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { Provider } from "react-redux";
import { store } from "./store";
import Home from "./pages/public/Home";
import PublicRoutes from "./routes/PublicRoutes";
import OurInstructor from "./pages/public/OurInstructor";
import NotFound from "./components/common/NotFound";
import AboutUs from "./pages/public/AboutUs";
import Contact from "./pages/public/Contact";
import Professional from "./pages/public/Professional";

// Define the router with type safety
const router = createBrowserRouter([
  {
    path: "/",
    element: <PublicRoutes />,
    children: [
      { path: "instructors", element: <OurInstructor /> },
      { path: "", element: <Home /> },
      { path: "about", element: <AboutUs /> },
      { path: "contact", element: <Contact /> },
      { path: "professional", element: <Professional/> },
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
