import React, { ReactNode } from "react";
import { Outlet } from "react-router-dom";
import Navbar from "../components/common/Navbar";

// Define props for PublicLayout
interface PublicLayoutProps {
  children?: ReactNode; // Optional `children` prop
}

const PublicLayout: React.FC<PublicLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children || <Outlet />}
      </main>
    </div>
  );
};

export default PublicLayout;
