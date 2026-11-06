import DSPBrandLoader from "./DSPBrandLoader";
import { useLocation } from "react-router-dom";

export default function RouteLoadingFallback() {
  const { pathname } = useLocation();
  if (/^\/(student|teacher|admin)-dashboard(?:\/|$)/.test(pathname)) {
    return (
      <div
        className="dsp-route-content-loader"
        role="status"
        aria-live="polite"
        aria-label="Loading workspace content"
      >
        <div className="dsp-route-content-loader__heading">
          <span />
          <div>
            <strong>Loading this section</strong>
            <p>Your workspace is getting ready.</p>
          </div>
        </div>
        <div className="dsp-route-content-loader__cards" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
        <div className="dsp-route-content-loader__rows" aria-hidden="true">
          {[0, 1, 2, 3].map((row) => (
            <i key={row} />
          ))}
        </div>
      </div>
    );
  }
  return <DSPBrandLoader message="Preparing your workspace..." />;
}
