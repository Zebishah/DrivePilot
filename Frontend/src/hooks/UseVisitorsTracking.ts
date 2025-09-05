// hooks/useVisitorTracking.js
import { useState, useCallback } from "react";
import { useMutation, gql } from "@apollo/client";

// GraphQL mutation
const RECORD_VISITOR = gql`
  mutation RecordVisitor($input: VisitorInput!) {
    recordVisitor(input: $input) {
      id
      visitorId
      visitCount
      isUniqueVisitor
      firstVisit
      lastVisit
    }
  }
`;

const useVisitorTracking = () => {
  const [isTracked, setIsTracked] = useState(false);
  const [trackingError, setTrackingError] = useState(null);

  const [recordVisitor] = useMutation(RECORD_VISITOR);

  // Function to detect device type
  const getDeviceType = () => {
    const userAgent = navigator.userAgent;
    if (/tablet|ipad|playbook|silk/i.test(userAgent)) {
      return "tablet";
    }
    if (
      /mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(
        userAgent
      )
    ) {
      return "mobile";
    }
    return "desktop";
  };

  // Function to detect browser
  const getBrowser = () => {
    const userAgent = navigator.userAgent;
    if (userAgent.includes("Chrome")) return "Chrome";
    if (userAgent.includes("Firefox")) return "Firefox";
    if (userAgent.includes("Safari")) return "Safari";
    if (userAgent.includes("Edge")) return "Edge";
    if (userAgent.includes("Opera")) return "Opera";
    return "Unknown";
  };

  // Function to get location data (optional)
  const getLocationData = async () => {
    try {
      const response = await fetch("https://ipapi.co/json/");
      if (response.ok) {
        const data = await response.json();
        return {
          country: data.country_name,
          city: data.city,
        };
      }
    } catch (error) {
      console.log("Location data not available:", error);
    }
    return {};
  };

  // Main tracking function - wrapped in useCallback to prevent unnecessary re-renders
  const trackVisitor = useCallback(async () => {
    try {
      setTrackingError(null);

      // Check if visitor was already tracked in this session (daily)
      const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD format
      const sessionKey = `visitor_tracked_${today}`;

      const alreadyTracked = sessionStorage.getItem(sessionKey);
      if (alreadyTracked) {
        setIsTracked(true);
        return { success: true, alreadyTracked: true };
      }

      // Get location data
      const locationData = await getLocationData();

      // Prepare visitor data
      const visitorData = {
        userAgent: navigator.userAgent,
        device: getDeviceType(),
        browser: getBrowser(),
        ...locationData,
      };

      // Call GraphQL mutation (Apollo)
      const result = await recordVisitor({
        variables: { input: visitorData },
      });

      // Mark as tracked
      sessionStorage.setItem(sessionKey, "true");
      setIsTracked(true);

      return { success: true, data: result.data };
    } catch (error) {
      console.error("Failed to track visitor:", error);
      setTrackingError(error.message);
      return { success: false, error: error.message };
    }
  }, [recordVisitor]);

  return {
    trackVisitor,
    isTracked,
    trackingError,
  };
};

export default useVisitorTracking;
