import BrandLogo from "../BrandLogo";
import "./BrandActionSpinner.css";

export default function BrandActionSpinner({ label = "Processing" }: { label?: string }) {
  return <span className="dsp-brand-action-spinner" role="status" aria-label={label}>
    <span className="dsp-brand-action-spinner__ring" aria-hidden="true" />
    <BrandLogo variant="mark" size="sm" />
  </span>;
}
