import React, { ReactNode } from "react";
import { Outlet } from "react-router-dom";
import Navbar from "../components/common/Navbar";
import Footer from "../components/common/Footer"

// Define props for PublicLayout
interface PublicLayoutProps {
  children?: ReactNode; // Optional `children` prop
}

const PublicLayout: React.FC<PublicLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main >
        {children || <Outlet />}
      </main>
      <Footer/>

    </div>
  );
};

export default PublicLayout;
