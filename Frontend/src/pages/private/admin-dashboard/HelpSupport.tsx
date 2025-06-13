// components/QuestionsAnswers.tsx
import React, { useState } from "react";
import { Box, Tabs, Tab, Paper, Typography } from "@mui/material";
import FaqTab from "../../../components/AdminComponents/FaqTab";
import ContactDetails from "../../../components/AdminComponents/ContactDetails";
import { useAuth } from "../../../context/AuthContext";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`qa-tabpanel-${index}`}
      aria-labelledby={`qa-tab-${index}`}
    >
      {value === index && <Box>{children}</Box>}
    </div>
  );
};

const a11yProps = (index: number) => {
  return {
    id: `qa-tab-${index}`,
    "aria-controls": `qa-tabpanel-${index}`,
  };
};

const QuestionsAnswers: React.FC = () => {
  const [value, setValue] = useState(0);
  const { user } = useAuth();
  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  return (
    <Box sx={{ width: "100%", mx: "auto", p: 6 }}>
      {/* Header */}
      <Paper sx={{ mb: 2 }}>
        <Box sx={{ p: 2, borderBottom: "1px solid #e0e0e0" }}>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            Questions & Answers
          </Typography>
        </Box>

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs
            value={value}
            onChange={handleChange}
            aria-label="questions and answers tabs"
            sx={{
              "& .MuiTab-root": {
                textTransform: "none",
                fontWeight: 500,
                fontSize: "0.95rem",
                minWidth: 120,
              },
              "& .Mui-selected": {
                fontWeight: 600,
              },
            }}
          >
            <Tab
              label="FAQ"
              {...a11yProps(0)}
              sx={{
                borderBottom: value === 0 ? "2px solid #1976d2" : "none",
              }}
            />
            <Tab
              label="Contact Details"
              {...a11yProps(1)}
              sx={{
                borderBottom: value === 1 ? "2px solid #1976d2" : "none",
              }}
            />
          </Tabs>
        </Box>
      </Paper>

      {/* Tab Panels */}
      <TabPanel value={value} index={0}>
        <FaqTab adminId={user?.id || ""} />
      </TabPanel>
      <TabPanel value={value} index={1}>
        <ContactDetails />
      </TabPanel>
    </Box>
  );
};

export default QuestionsAnswers;
