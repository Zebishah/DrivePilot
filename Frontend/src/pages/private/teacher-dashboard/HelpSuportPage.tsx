import React, { useState } from "react";
import { Paper, Tabs, Tab, Box } from "@mui/material";
import {
  QuestionAnswer as QuestionAnswerIcon,
  ContactMail as ContactIcon,
  CalendarMonth,
  CreditCard,
  Description,
  PeopleAlt,
  Person,
} from "@mui/icons-material";
import { useFAQs } from "../../../hooks/UseFaqs's";
import { ContactFormData } from "../../../types/Faq";
import { TabPanel } from "../../../components/InstructorComponent/Help&Support/TabPanel";
import { FAQList } from "../../../components/InstructorComponent/Help&Support/FaqList";
import { ContactSection } from "../../../components/InstructorComponent/Help&Support/ContactSection";
import { DashboardPageHeader } from "../../../components/dashboard/OverviewWidgets";

const FAQPage: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const faqData = useFAQs(5);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleContactSubmit = (formData: ContactFormData) => {
    console.log("Contact form submitted:", formData);
    // Add your submission logic here
  };

  return (
    <div className="dsp-instructor-page dsp-help-page">
      <div className="dsp-instructor-page__content">
        <DashboardPageHeader title="Help & support" description="Find answers quickly or send the team a message when you need a hand." />

        <section className="dsp-support-hero" aria-labelledby="support-hero-title">
          <div className="dsp-support-hero__copy">
            <span className="dsp-dashboard-page-header__eyebrow">Support centre</span>
            <h2 id="support-hero-title">How can we help today?</h2>
            <p>Browse the areas below or send the support team a message with the contact form.</p>
          </div>
          <div className="dsp-support-hero__mark" aria-hidden="true"><QuestionAnswerIcon /></div>
        </section>

        <section className="dsp-support-categories" aria-label="Support categories">
          {[
            [CalendarMonth, "Bookings", "Manage lessons and schedule changes"],
            [PeopleAlt, "Students", "Keep learner communication on track"],
            [CreditCard, "Payments", "Stripe setup and payment questions"],
            [Description, "Documents", "Profile verification requirements"],
            [Person, "Profile", "Update your instructor details"],
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

      <Paper className="dsp-support-tabs" sx={{ width: "100%" }}>
        <Box sx={{ borderBottom: 1, borderColor: "divider", width: "100%" }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            aria-label="help tabs"
              sx={{ px: 2 }}
          >
            <Tab
              icon={<QuestionAnswerIcon />}
              iconPosition="start"
              label="FAQs"
              sx={{ mr: 2 }}
            />
            <Tab icon={<ContactIcon />} iconPosition="start" label="Contact" />
          </Tabs>
        </Box>
      </Paper>

      <TabPanel value={tabValue} index={0} className="dsp-support-tab-panel">
        <FAQList
          {...faqData}
          error={faqData.error ? faqData.error.message : undefined}
          onLoadMore={faqData.handleLoadMore}
          onShowLess={faqData.handleUnloadFaqs}
          onAccordionChange={faqData.handleAccordionChange}
        />
      </TabPanel>

      <TabPanel value={tabValue} index={1} className="dsp-support-tab-panel">
        <ContactSection onSubmit={handleContactSubmit} />
      </TabPanel>
      </div>
    </div>
  );
};

export default FAQPage;
