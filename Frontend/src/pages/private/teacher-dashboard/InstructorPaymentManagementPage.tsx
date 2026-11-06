import InstructorSectionPage from "./InstructorSectionPage";
import { PaymentTab } from "./tabs/PaymentTab";

export default function InstructorPaymentManagementPage() {
  return (
    <InstructorSectionPage
      title="Payment Management"
      description="Manage your Stripe connection and check your instructor payment setup."
      className="dsp-payment-management-page"
    >
      <PaymentTab />
    </InstructorSectionPage>
  );
}
