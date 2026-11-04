import React from "react";
import { Box, Paper, Typography } from "@mui/material";
import ContactForm from "./ContactForm";
import { ContactFormData } from "../../../types/Faq";

interface ContactSectionProps {
  onSubmit: (formData: ContactFormData) => void;
  title?: string;
  subtitle?: string;
}

export const ContactSection: React.FC<ContactSectionProps> = ({
  onSubmit,
  title = "Contact Us",
  subtitle = "Need more help? Send us a message and we'll get back to you soon.",
}) => (
  <Paper sx={{ minHeight: 400 }}>
    <Box sx={{ p: 2, borderBottom: "1px solid var(--ws-border, #e0e0e0)" }}>
      <Typography variant="h6" sx={{ fontWeight: 600 }}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
        {subtitle}
      </Typography>
    </Box>
    <Box sx={{ p: 3 }}>
      <ContactForm onSubmit={onSubmit} />
    </Box>
  </Paper>
);
