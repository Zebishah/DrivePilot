import { useState } from "react";
import { MessageCircleQuestion, Mail, Plus } from "lucide-react";
import FaqTab from "../../../components/AdminComponents/FaqTab";
import ContactDetails from "../../../components/AdminComponents/ContactDetails";
import { useAuth } from "../../../context/AuthContext";
import { AdminPage, AdminPageHeader } from "../../../components/admin/AdminPrimitives";

export default function HelpSupport() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"faq" | "contact">("faq");
  return <AdminPage className="dsp-admin-support">
    <AdminPageHeader title="Help & support" description="Maintain the help content shown to Students and Instructors, and configure the support contact channel." action={tab === "faq" ? <span className="dsp-admin-support-note"><Plus size={15} />Add FAQs from this workspace</span> : undefined} />
    <div className="dsp-admin-tabs dsp-admin-support-tabs" role="tablist" aria-label="Help and support sections"><button type="button" role="tab" aria-selected={tab === "faq"} className={tab === "faq" ? "is-active" : ""} onClick={() => setTab("faq")}><MessageCircleQuestion size={17} />FAQ management</button><button type="button" role="tab" aria-selected={tab === "contact"} className={tab === "contact" ? "is-active" : ""} onClick={() => setTab("contact")}><Mail size={17} />Contact requests</button></div>
    <div className="dsp-admin-support-panel">{tab === "faq" ? <FaqTab adminId={user?.id || ""} /> : <ContactDetails />}</div>
  </AdminPage>;
}
