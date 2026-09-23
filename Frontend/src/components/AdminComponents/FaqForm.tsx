// components/FaqForm.tsx
import React, { useState } from "react";
import { AdminButton } from "../admin/AdminPrimitives";
import { AdminModal } from "../admin/AdminModal";
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
    <AdminModal open={open} onClose={handleClose} title="Add new question" subtitle="Create a FAQ entry for the Admin help center." size="md" footer={<><AdminButton type="button" variant="secondary" onClick={handleClose} disabled={loading}>Cancel</AdminButton><AdminButton type="submit" form="faq-create-form" disabled={loading || !question.trim() || !answer.trim()}>{loading ? "Adding..." : "Add question"}</AdminButton></>}>
      <form id="faq-create-form" onSubmit={handleSubmit} className="dsp-admin-form-stack">
        <label className="dsp-admin-form-field">Question<textarea className="dsp-admin-input" rows={3} placeholder="Write your question" value={question} onChange={(e) => setQuestion(e.target.value)} required /></label>
        <label className="dsp-admin-form-field">Answer<textarea className="dsp-admin-input" rows={6} placeholder="Add a helpful answer" value={answer} onChange={(e) => setAnswer(e.target.value)} required /></label>
      </form>
    </AdminModal>
  );
};

export default FaqForm;
