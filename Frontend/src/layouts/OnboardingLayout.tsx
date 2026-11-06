import type { ReactNode } from "react";
import { Outlet, useLocation } from "react-router-dom";
import AuthLayout from "./AuthLayout";

export default function OnboardingLayout({
  children,
}: {
  children?: ReactNode;
}) {
  const { pathname } = useLocation();
  if (pathname === "/onboarding/role-selection")
    return <>{children || <Outlet />}</>;
  return (
    <div className="dsp-onboarding-frame">
      <AuthLayout>{children || <Outlet />}</AuthLayout>
    </div>
  );
}
