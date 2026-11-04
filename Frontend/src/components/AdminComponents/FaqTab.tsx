// components/FaqTab.tsx
import React, { useState } from "react";
import { Box, Typography, Button, Paper } from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";
import FaqForm from "./FaqForm";
import FaqList from "./FaqList";

interface FaqTabProps {
  adminId: string;
}

const FaqTab: React.FC<FaqTabProps> = ({ adminId }) => {
  const [formOpen, setFormOpen] = useState(false);

  const handleOpenForm = () => {
    setFormOpen(true);
  };

  const handleCloseForm = () => {
    setFormOpen(false);
  };

  return (
    <Box>
      {/* Header */}
      <Paper sx={{ p: 2, mb: 2, backgroundColor: "var(--ws-surface, #f8f9fa)" }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Questions & Answers
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenForm}
            sx={{
              backgroundColor: "var(--ws-primary, #4db6ac)",
              "&:hover": {
                backgroundColor: "var(--ws-info-soft, #26a69a)",
              },
              borderRadius: 2,
              textTransform: "none",
              fontWeight: 500,
            }}
          >
            Add question
          </Button>
        </Box>
      </Paper>

      {/* FAQ Form */}
      <FaqForm open={formOpen} onClose={handleCloseForm} adminId={adminId} />

      {/* Questions & Answers Section */}
      <Paper sx={{ minHeight: 400 }}>
        <Box sx={{ p: 2, borderBottom: "1px solid var(--ws-border, #e0e0e0)" }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Questions & Answers
          </Typography>
        </Box>
        <FaqList adminId={adminId} />
      </Paper>
    </Box>
  );
};

export default FaqTab;
