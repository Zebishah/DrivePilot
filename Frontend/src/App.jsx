import { useState } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import PublicRoutes from "./routes/PublicRoutes";
import Home from "./pages/public/Home";

const router = createBrowserRouter([
  {
    path: "/",
    element: <PublicRoutes />,
    children: [{ path: "", element: <Home /> }],
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
