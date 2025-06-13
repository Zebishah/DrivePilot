// src/routes/SuperAdminRoute.tsx
import { useAuth } from "../context/AuthContext";
import { Navigate } from "react-router-dom";

interface Props {
  children: JSX.Element;
}

export default function SuperAdminRoute({ children }: Props) {
  const { user } = useAuth();

  if (user?.adminLevel !== "super") {
    return <Navigate to="/admin-dashboard/overview" replace />;
  }

  return children;
}
