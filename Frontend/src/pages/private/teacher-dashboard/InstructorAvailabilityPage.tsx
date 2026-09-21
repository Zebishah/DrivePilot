import InstructorSectionPage from "./InstructorSectionPage";
import { AvailabilityTab } from "./tabs/AvailabilityTab";

export default function InstructorAvailabilityPage() {
  return (
    <InstructorSectionPage
      title="Availability & Calendar"
      description="Keep your teaching availability current so students can book the right time."
      className="dsp-availability-page"
    >
      <AvailabilityTab />
    </InstructorSectionPage>
  );
}
