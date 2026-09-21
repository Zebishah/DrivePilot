import React, { useState } from "react";
import { Paper, Tabs, Tab, Box } from "@mui/material";
import {
  QuestionAnswer as QuestionAnswerIcon,
  ContactMail as ContactIcon,
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

      <Paper sx={{ mb: 2, backgroundColor: "#f8f9fa", width: "100%" }}>
        <Box sx={{ borderBottom: 1, borderColor: "divider", width: "100%" }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            aria-label="help tabs"
            sx={{
              px: 2,
              "& .MuiTab-root": {
                textTransform: "none",
                fontWeight: 500,
                fontSize: "1rem",
                minHeight: 64,
                "&.Mui-selected": { color: "#4db6ac" },
              },
              "& .MuiTabs-indicator": { backgroundColor: "#4db6ac" },
            }}
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

export default FAQPage;
