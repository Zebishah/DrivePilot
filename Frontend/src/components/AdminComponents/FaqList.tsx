// components/FaqList.tsx
import React, { useState } from "react";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Box,
  IconButton,
  CircularProgress,
  Alert,
} from "@mui/material";
import {
  ExpandMore as ExpandMoreIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import { useQuery, useMutation } from "@apollo/client";
import { GET_FAQS_BY_ADMIN } from "../../graphql/Queries/Faqs";
import { DELETE_FAQ, UPDATE_FAQ } from "../../graphql/mutations/Faqs";
import { Faq } from "../../types/Faq";
import { AdminButton } from "../admin/AdminPrimitives";
import { AdminModal } from "../admin/AdminModal";

interface FaqListProps {
  adminId: string;
}

interface EditFaqData {
  id: string;
  question: string;
  answer: string;
}

const FaqList: React.FC<FaqListProps> = ({ adminId }) => {
  const [expanded, setExpanded] = useState<string | false>(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [faqToDelete, setFaqToDelete] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<EditFaqData | null>(null);

  const { data, loading, error, refetch } = useQuery(GET_FAQS_BY_ADMIN, {
    variables: { adminId },
    fetchPolicy: "cache-and-network",
  });

  const [deleteFaq, { loading: deleteLoading }] = useMutation(DELETE_FAQ, {
    onCompleted: () => {
      setDeleteConfirmOpen(false);
      setFaqToDelete(null);
      refetch();
    },
    onError: (error) => {
      console.error("Error deleting FAQ:", error);
      setDeleteConfirmOpen(false);
      setFaqToDelete(null);
    },
  });

  const [updateFaq, { loading: updateLoading }] = useMutation(UPDATE_FAQ, {
    onCompleted: () => {
      setEditDialogOpen(false);
      setEditingFaq(null);
      refetch();
    },
    onError: (error) => {
      console.error("Error updating FAQ:", error);
    },
  });

  const handleChange =
    (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
      setExpanded(isExpanded ? panel : false);
    };

  const handleDeleteClick = (id: string) => {
    setFaqToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (faqToDelete) {
      try {
        await deleteFaq({ variables: { id: faqToDelete } });
      } catch (error) {
        console.error("Error deleting FAQ:", error);
      }
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmOpen(false);
    setFaqToDelete(null);
  };

  const handleEditClick = (faq: Faq) => {
    setEditingFaq({
      id: faq._id,
      question: faq.question,
      answer: faq.answer,
    });
    setEditDialogOpen(true);
  };

  const handleEditSave = async () => {
    if (editingFaq) {
      try {
        await updateFaq({
          variables: {
            id: editingFaq.id,
            question: editingFaq.question,
            answer: editingFaq.answer,
          },
        });
      } catch (error) {
        console.error("Error updating FAQ:", error);
      }
    }
  };

  const handleEditCancel = () => {
    setEditDialogOpen(false);
    setEditingFaq(null);
  };

  const handleEditInputChange = (
    field: "question" | "answer",
    value: string
  ) => {
    if (editingFaq) {
      setEditingFaq({
        ...editingFaq,
        [field]: value,
      });
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <CircularProgress size={40} />
        <Typography variant="body2" sx={{ ml: 2, alignSelf: "center" }}>
          Loading FAQs...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        Error loading FAQs: {error.message}
      </Alert>
    );
  }

  const faqs: Faq[] = data?.getFaqsByAdmin || [];

  if (faqs.length === 0) {
    return (
      <Box sx={{ p: 4, textAlign: "center" }}>
        <Typography variant="body1" color="text.secondary">
          No FAQs available. Click "Add question" to create your first FAQ.
        </Typography>
      </Box>
    );
  }

  return (
    <>
      <Box sx={{ p: 2 }}>
        {faqs.map((faq: Faq) => (
          <Accordion
            key={faq._id}
            expanded={expanded === faq._id}
            onChange={handleChange(faq._id)}
            sx={{ mb: 1, border: "1px solid var(--ws-border, #e0e0e0)", borderRadius: 1 }}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              sx={{
                "& .MuiAccordionSummary-content": {
                  alignItems: "center",
                  justifyContent: "space-between",
                },
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", flex: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 500, mr: 1 }}>
                  Q.
                </Typography>
                <Typography variant="body2">{faq.question}</Typography>
              </Box>
              <Box sx={{ display: "flex", gap: 1 }}>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditClick(faq);
                  }}
                  disabled={deleteLoading || updateLoading}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteClick(faq._id);
                  }}
                  disabled={deleteLoading || updateLoading}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" color="text.secondary">
                {faq.answer}
              </Typography>
            </AccordionDetails>
          </Accordion>
        ))}
      </Box>

      <AdminModal open={deleteConfirmOpen} onClose={handleDeleteCancel} title="Delete FAQ" subtitle="This action cannot be undone." size="sm" closeOnBackdrop={!deleteLoading} closeOnEscape={!deleteLoading} footer={<><AdminButton variant="secondary" onClick={handleDeleteCancel} disabled={deleteLoading}>Cancel</AdminButton><AdminButton variant="danger" onClick={handleDeleteConfirm} disabled={deleteLoading}>{deleteLoading ? "Deleting..." : "Delete FAQ"}</AdminButton></>}>
        <p className="dsp-admin-confirmation-copy">Are you sure you want to delete this FAQ?</p>
      </AdminModal>
      <AdminModal open={editDialogOpen} onClose={handleEditCancel} title="Edit FAQ" subtitle="Keep the answer clear and useful for the marketplace." size="md" footer={<><AdminButton variant="secondary" onClick={handleEditCancel} disabled={updateLoading}>Cancel</AdminButton><AdminButton onClick={handleEditSave} disabled={updateLoading || !editingFaq?.question.trim() || !editingFaq?.answer.trim()}>{updateLoading ? "Saving..." : "Save changes"}</AdminButton></>}>
        <div className="dsp-admin-form-stack"><label className="dsp-admin-form-field">Question<textarea className="dsp-admin-input" rows={3} value={editingFaq?.question || ""} onChange={(e) => handleEditInputChange("question", e.target.value)} disabled={updateLoading} /></label><label className="dsp-admin-form-field">Answer<textarea className="dsp-admin-input" rows={6} value={editingFaq?.answer || ""} onChange={(e) => handleEditInputChange("answer", e.target.value)} disabled={updateLoading} /></label></div>
      </AdminModal>
    </>
  );
};

export default FaqList;
