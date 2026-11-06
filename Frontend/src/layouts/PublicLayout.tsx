import React, { ReactNode, useEffect } from "react";
import { Outlet } from "react-router-dom";
import Navbar from "../components/common/Navbar";
import Footer from "../components/common/Footer";
import useVisitorTracking from "../hooks/UseVisitorsTracking";
import "../pages/public/landing.css";
import "../pages/public/marketplace.css";
import AssistantPanel from "../features/assistant/components/AssistantPanel";

// Define props for PublicLayout
interface PublicLayoutProps {
  children?: ReactNode; // Optional `children` prop
}

const PublicLayout: React.FC<PublicLayoutProps> = ({ children }) => {
  const { trackVisitor, isTracked, trackingError } = useVisitorTracking();

  useEffect(() => {
    document.title =
      "DSP Marketplace — Driving Lessons, Instructors & Learning Management";
    const description =
      "Find driving instructors, compare lesson options, and book driving lessons online. Manage payments, learning progress, and teaching with DSP Marketplace.";
    let descriptionTag = document.querySelector<HTMLMetaElement>(
      'meta[name="description"]',
    );
    if (!descriptionTag) {
      descriptionTag = document.createElement("meta");
      descriptionTag.name = "description";
      document.head.appendChild(descriptionTag);
    }
    descriptionTag.content = description;

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
    if (import.meta.env.DEV) {
      if (isTracked) {
        console.log("✅ Visitor tracked successfully");
      }
      if (trackingError) {
        console.error("❌ Visitor tracking error:", trackingError);
      }
    }
  }, [isTracked, trackingError]);

  return (
    <div className="dsp-ai-shell">
      <Navbar />
      <main>{children || <Outlet />}</main>
      <Footer />
      <AssistantPanel pageContext="public marketplace" publicMode />
    </div>
  );
};

export default PublicLayout;
