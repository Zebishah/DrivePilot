// components/FAQAccordion.tsx

import React from "react";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Box,
} from "@mui/material";
import { Add as AddIcon, Remove as RemoveIcon } from "@mui/icons-material";
import { FAQAccordionProps } from "../../types/Faq";

const FAQAccordion: React.FC<FAQAccordionProps> = ({
  faq,
  expanded,
  onChange,
}) => {
  return (
    <Accordion
      expanded={expanded}
      onChange={onChange(faq._id)}
      sx={{
        mb: 1,
        borderRadius: "8px !important",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        "&:before": {
          display: "none",
        },
        "& .MuiAccordionSummary-root": {
          backgroundColor: "#f8f9fa",
          borderRadius: expanded ? "8px 8px 0 0" : "8px",
          minHeight: "64px",
          "&:hover": {
            backgroundColor: "#e9ecef",
          },
        },
        "& .MuiAccordionDetails-root": {
          backgroundColor: "white",
          borderRadius: "0 0 8px 8px",
        },
      }}
    >
      <AccordionSummary
        expandIcon={
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 32,
              height: 32,
              borderRadius: "50%",
              backgroundColor: "#4DD0E1",
              color: "white",
            }}
          >
            {expanded ? <RemoveIcon /> : <AddIcon />}
          </Box>
        }
        aria-controls={`panel-${faq._id}-content`}
        id={`panel-${faq._id}-header`}
      >
        <Box sx={{ display: "flex", alignItems: "center", width: "100%" }}>
          <Typography
            variant="body1"
            sx={{
              fontWeight: 500,
              color: "#333",
              pr: 2,
              flex: 1,
            }}
          >
            Q. {faq.question}
          </Typography>
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        <Typography
          variant="body2"
          sx={{
            color: "#666",
            lineHeight: 1.6,
            pl: 2,
          }}
        >
          {faq.answer}
        </Typography>
      </AccordionDetails>
    </Accordion>
  );
};

export default FAQAccordion;
