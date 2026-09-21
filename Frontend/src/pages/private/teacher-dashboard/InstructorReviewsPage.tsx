import InstructorSectionPage from "./InstructorSectionPage";
import { RatingsTab } from "./tabs/RatingsTab";

export default function InstructorReviewsPage() {
  return (
    <InstructorSectionPage
      title="Reviews & Ratings"
      description="Review student feedback and track the reputation of your teaching profile."
      className="dsp-reviews-page"
    >
      <RatingsTab />
    </InstructorSectionPage>
  );
}
