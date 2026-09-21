import React, { useState } from "react";
import { Box, Paper, Tab, Tabs } from "@mui/material";
import {
  CalendarMonth,
  ContactMail,
  CreditCard,
  HelpOutline,
  PeopleAlt,
  Person,
  QuestionAnswer,
} from "@mui/icons-material";
import { useFAQs } from "../../../hooks/UseFaqs's";
import { ContactFormData } from "../../../types/Faq";
import { TabPanel } from "../../../components/InstructorComponent/Help&Support/TabPanel";
import { FAQList } from "../../../components/InstructorComponent/Help&Support/FaqList";
import { ContactSection } from "../../../components/InstructorComponent/Help&Support/ContactSection";
import { DashboardPageHeader } from "../../../components/dashboard/OverviewWidgets";

const StudentHelpSupportPage: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const faqData = useFAQs(5);

  const handleContactSubmit = (formData: ContactFormData) => {
    // Contact form submission remains owned by the existing support component.
    void formData;
  };

  return (
    <div className="dsp-student-page dsp-student-help-page">
      <div className="dsp-student-page__content">
        <DashboardPageHeader
          eyebrow="Student workspace"
          title="Help & support"
          description="Find answers about lessons, instructors, payments, and your account."
        />

        <section className="dsp-support-hero" aria-labelledby="student-support-title">
          <div className="dsp-support-hero__copy">
            <span className="dsp-dashboard-page-header__eyebrow">Support centre</span>
            <h2 id="student-support-title">How can we help today?</h2>
            <p>Browse common topics or contact the support team when you need a hand.</p>
          </div>
          <div className="dsp-support-hero__mark" aria-hidden="true"><HelpOutline /></div>
        </section>

        <section className="dsp-support-categories" aria-label="Student support categories">
          {[
            [CalendarMonth, "Bookings", "Schedule, changes, and lesson details"],
            [PeopleAlt, "Instructors", "Finding and messaging instructors"],
            [CreditCard, "Payments", "Checkout, refunds, and receipts"],
            [Person, "Profile", "Keep your personal details current"],
          ].map(([Icon, title, description]) => {
            const CategoryIcon = Icon as typeof CalendarMonth;
            return (
              <div className="dsp-support-category" key={title as string}>
                <span className="dsp-support-category__icon"><CategoryIcon /></span>
                <div><strong>{title as string}</strong><span>{description as string}</span></div>
              </div>
            );
          })}
        </section>

        <Paper className="dsp-support-tabs" sx={{ mb: 2, width: "100%" }}>
          <Box sx={{ borderBottom: 1, borderColor: "divider", width: "100%" }}>
            <Tabs value={tabValue} onChange={(_, value) => setTabValue(value)} aria-label="Student help tabs" sx={{ px: 2 }}>
              <Tab icon={<QuestionAnswer />} iconPosition="start" label="FAQs" />
              <Tab icon={<ContactMail />} iconPosition="start" label="Contact" />
            </Tabs>
          </Box>
        </Paper>

        <TabPanel value={tabValue} index={0}>
          <FAQList
            {...faqData}
            error={faqData.error ? faqData.error.message : undefined}
            onLoadMore={faqData.handleLoadMore}
            onShowLess={faqData.handleUnloadFaqs}
            onAccordionChange={faqData.handleAccordionChange}
          />
        </TabPanel>
        <TabPanel value={tabValue} index={1}>
          <ContactSection onSubmit={handleContactSubmit} />
        </TabPanel>
      </div>
    </div>
  );
};

export default StudentHelpSupportPage;
