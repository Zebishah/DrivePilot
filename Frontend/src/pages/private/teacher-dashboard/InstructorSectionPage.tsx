import type { ReactNode } from "react";
import { DashboardPageHeader } from "../../../components/dashboard/OverviewWidgets";

interface InstructorSectionPageProps {
  title: string;
  description: string;
  children: ReactNode;
  className?: string;
}

export default function InstructorSectionPage({
  title,
  description,
  children,
  className = "",
}: InstructorSectionPageProps) {
  return (
    <div className={`dsp-instructor-page dsp-instructor-section-page ${className}`.trim()}>
      <div className="dsp-instructor-page__content">
        <DashboardPageHeader title={title} description={description} />
        {children}
      </div>
    </div>
  );
}
