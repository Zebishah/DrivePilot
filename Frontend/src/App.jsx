import { useState } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import PublicRoutes from "./routes/PublicRoutes";
import Home from "./pages/public/Home";
import NotFound from "./pages/public/NotFound";

const router = createBrowserRouter([
  {
    path: "/",
    element: <PublicRoutes />,
    children: [
      { path: "", element: <Home /> }, // This will show Home at "/"
    ],
  },
  {
    path: "*",
    element: <NotFound />,
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
