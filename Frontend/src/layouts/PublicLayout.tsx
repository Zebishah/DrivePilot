import React, { ReactNode, useEffect } from "react";
import { Outlet } from "react-router-dom";
import Navbar from "../components/common/Navbar";
import Footer from "../components/common/Footer";
import useVisitorTracking from "../hooks/UseVisitorsTracking";

// Define props for PublicLayout
interface PublicLayoutProps {
  children?: ReactNode; // Optional `children` prop
}

const PublicLayout: React.FC<PublicLayoutProps> = ({ children }) => {
  const { trackVisitor, isTracked, trackingError } = useVisitorTracking();

  useEffect(() => {
    // Track visitor when component mounts
    const handleVisitorTracking = async () => {
      try {
        // Fixed: removed the parameter as trackVisitor doesn't accept any
        const result = await trackVisitor();

        if (result?.success) {
          console.log("Visitor tracking successful:", result);
        } else {
          console.error("Visitor tracking failed:", result?.error);
        }
      } catch (error) {
        console.error("Visitor tracking failed:", error);
      }
    };

    handleVisitorTracking();
  }, [trackVisitor]);

  // Optional: You can add some debug info in development
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      if (isTracked) {
        console.log("✅ Visitor tracked successfully");
      }
      if (trackingError) {
        console.error("❌ Visitor tracking error:", trackingError);
      }
    }
  }, [isTracked, trackingError]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main>{children || <Outlet />}</main>
      <Footer />
    </div>
  );
};

export default PublicLayout;
