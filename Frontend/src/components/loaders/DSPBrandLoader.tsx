import type React from "react";
import BrandLogo from "../BrandLogo";

interface DSPBrandLoaderProps {
  message?: string;
  className?: string;
}

const DSPBrandLoader: React.FC<DSPBrandLoaderProps> = ({
  message = "Preparing your workspace...",
  className = "",
}) => (
  <div className={`dsp-brand-loader ${className}`.trim()} role="status" aria-live="polite" aria-label="Loading DSP Marketplace">
    <div className="dsp-brand-loader__content">
      <BrandLogo size="lg" />
      <span className="dsp-brand-loader__name">DSP Marketplace</span>
      <p>{message}</p>
      <div className="dsp-brand-loader__progress" aria-hidden="true"><span /></div>
      <span className="dsp-sr-only">Loading DSP Marketplace</span>
    </div>
  </div>
);

export default DSPBrandLoader;
