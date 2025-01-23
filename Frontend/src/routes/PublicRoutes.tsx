import React from "react";
import { Outlet } from "react-router-dom";
import PublicLayout from "../layouts/PublicLayout";

const PublicRoutes: React.FC = () => {
  return (
    <PublicLayout>
      <Outlet />
    </PublicLayout>
  );
};

export default PublicRoutes;
