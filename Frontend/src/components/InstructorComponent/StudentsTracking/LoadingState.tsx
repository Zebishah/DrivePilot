import type React from "react";
import DSPBrandLoader from "../../loaders/DSPBrandLoader";

export const LoadingState: React.FC = () => {
  return <DSPBrandLoader message="Loading student progress..." />;
};
