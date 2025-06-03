// components/FAQPage.tsx

import React, { useState, useEffect } from "react";
import { useQuery } from "@apollo/client";
import {
  Container,
  Typography,
  Button,
  Box,
  CircularProgress,
  Alert,
  Fab,
} from "@mui/material";
import {
  QuestionAnswer as QuestionAnswerIcon,
  ChatBubbleOutline as ChatIcon,
} from "@mui/icons-material";
import {
  ContactFormData,
  GetAllFaqsResponse,
  GetFaqsByAdminVariables,
} from "../../../types/Faq";
import { GET_ALL_FAQS } from "../../../graphql/Queries/Faqs";
import FAQAccordion from "../../../components/InstructorComponent/FaqAccordion";
import ContactModal from "../../../components/InstructorComponent/ContactForm";

const ITEMS_PER_LOAD = 5;

const FAQPage: React.FC = () => {
  const [displayCount, setDisplayCount] = useState(ITEMS_PER_LOAD);
  const [expandedPanel, setExpandedPanel] = useState<string | false>(false);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const { loading, error, data } = useQuery<
    GetAllFaqsResponse,
    GetFaqsByAdminVariables
  >(GET_ALL_FAQS, {
    errorPolicy: "all",
  });

  const faqs = data?.getAllFaqs || [];

  const displayedFaqs = faqs.slice(0, displayCount);
  const hasMore = displayCount < faqs.length;

  const handleAccordionChange =
    (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
      setExpandedPanel(isExpanded ? panel : false);
    };

  const handleLoadMore = () => {
    setDisplayCount((prev) => Math.min(prev + ITEMS_PER_LOAD, faqs.length));
  };

  const handleContactSubmit = (formData: ContactFormData) => {
    // Handle contact form submission here
    console.log("Contact form submitted:", formData);
    // You can add your submission logic here (e.g., send to API)
  };

  const handleContactModalOpen = () => {
    setContactModalOpen(true);
  };

  const handleContactModalClose = () => {
    setContactModalOpen(false);
  };

  // Auto-scroll to top when loading more items
  useEffect(() => {
    if (displayCount > ITEMS_PER_LOAD) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [displayCount]);

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="400px"
        >
          <CircularProgress size={48} sx={{ color: "#4DD0E1" }} />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          Error loading FAQs: {error.message}
        </Alert>
      </Container>
    );
  }

  if (faqs.length === 0) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Box textAlign="center" py={8}>
          <QuestionAnswerIcon sx={{ fontSize: 64, color: "#ccc", mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            No FAQs available at the moment.
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <>
      <Container
        sx={{
          py: 4,
          minHeight: "100vh",
          position: "relative",
        }}
      >
        <Typography
          variant="h4"
          component="h1"
          textAlign="center"
          sx={{
            fontWeight: "bold",
            mb: 4,
            color: "#333",
          }}
        >
          Frequently Asked Questions
        </Typography>

        <Box sx={{ mb: 4 }}>
          {displayedFaqs.map((faq) => (
            <FAQAccordion
              key={faq._id}
              faq={faq}
              expanded={expandedPanel === faq._id}
              onChange={handleAccordionChange}
            />
          ))}
        </Box>

        {hasMore && (
          <Box display="flex" justifyContent="center" sx={{ mt: 4, mb: 4 }}>
            <Button
              variant="outlined"
              onClick={handleLoadMore}
              sx={{
                borderColor: "#4DD0E1",
                color: "#4DD0E1",
                "&:hover": {
                  borderColor: "#26C6DA",
                  backgroundColor: "rgba(77, 208, 225, 0.04)",
                },
                px: 4,
                py: 1.5,
                borderRadius: 2,
                fontWeight: 500,
              }}
            >
              Load More
            </Button>
          </Box>
        )}

        {!hasMore && faqs.length > ITEMS_PER_LOAD && (
          <Box display="flex" justifyContent="center" sx={{ mt: 4, mb: 4 }}>
            <Typography variant="body2" color="text.secondary">
              All FAQs loaded ({faqs.length} total)
            </Typography>
          </Box>
        )}
      </Container>

      {/* Floating Action Button */}

      <Fab
        color="primary"
        aria-label="contact help"
        onClick={handleContactModalOpen}
        sx={{
          position: "fixed",
          bottom: 24,
          right: 24,
          backgroundColor: "#4DD0E1",
          "&:hover": {
            backgroundColor: "#26C6DA",
          },
          zIndex: 1000,
        }}
      >
        <ChatIcon />
      </Fab>

      {/* Contact Modal */}
      <ContactModal
        open={contactModalOpen}
        onClose={handleContactModalClose}
        onSubmit={handleContactSubmit}
      />
    </>
  );
};

export default FAQPage;
