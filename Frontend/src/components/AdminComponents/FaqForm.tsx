// components/FaqForm.tsx
import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  CircularProgress,
} from "@mui/material";
import { useMutation } from "@apollo/client";
import { GET_FAQS_BY_ADMIN } from "../../graphql/Queries/Faqs";
import { CREATE_FAQ } from "../../graphql/mutations/Faqs";
import { CreateFaqInput } from "../../types/Faq";
import toast from "react-hot-toast";

interface FaqFormProps {
  open: boolean;
  onClose: () => void;
  adminId: string;
}

const FaqForm: React.FC<FaqFormProps> = ({ open, onClose, adminId }) => {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");

  const [createFaq, { loading }] = useMutation(CREATE_FAQ, {
    refetchQueries: [{ query: GET_FAQS_BY_ADMIN, variables: { adminId } }],
    onCompleted: () => {
      handleClose();
    },
    onError: (error) => {
      console.error("Error creating FAQ:", error);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !answer.trim()) return;

    try {
      await createFaq({
        variables: {
          question: question.trim(),
          answer: answer.trim(),
          adminId,
        } as CreateFaqInput,
      });
      toast.success("FAQ added successfully!");
    } catch (error) {
      console.error("Error submitting FAQ:", error);
    }
  };

  const handleClose = () => {
    setQuestion("");
    setAnswer("");
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add New Question</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              label="Write Your Question"
              placeholder="Type Here"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              fullWidth
              required
              multiline
              rows={2}
            />
            <TextField
              label="Add Description"
              placeholder="Type Here"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              fullWidth
              required
              multiline
              rows={4}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading || !question.trim() || !answer.trim()}
            startIcon={loading ? <CircularProgress size={16} /> : null}
          >
            {loading ? "Adding..." : "Add Question"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default FaqForm;
