import React, { useState } from "react";

import { useFeedback } from "../../../hooks/UseFeedBack";
import { SkillsDropdown } from "../../../components/InstructorComponent/SkillsDropdown";
import { FormInput } from "../../../components/InstructorComponent/FormInput";
import { RichTextEditor } from "../../../components/InstructorComponent/RichTextBox";
import { ActionButtons } from "../../../components/InstructorComponent/ActionButtons";
import { DeleteModal } from "../../../components/InstructorComponent/DeleteModal";
import { BackButton } from "../../../components/InstructorComponent/BackButton";

const FeedbackForm: React.FC = () => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const {
    viewMode,
    formData,
    setFormData,
    isLoading,
    isSubmitting,
    isDeleting,
    handleCreate,
    handleUpdate,
    handleDelete,
    handleEdit,
    handleCancelEdit,
    handleCancel,
  } = useFeedback();

  const isReadOnly = viewMode === "view";

  const handleSkillToggle = (skillValue: string) => {
    if (isReadOnly) return;

    setFormData((prev) => ({
      ...prev,
      skills: prev.skills.includes(skillValue)
        ? prev.skills.filter((skill) => skill !== skillValue)
        : [...prev.skills, skillValue],
    }));
  };

  const handleHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isReadOnly) return;
    setFormData((prev) => ({ ...prev, hoursRemaining: e.target.value }));
  };

  const handlePointsChange = (value: string) => {
    if (isReadOnly) return;
    setFormData((prev) => ({ ...prev, pointsToWorkOn: value }));
  };

  const generateUsingAI = () => {
    if (isReadOnly) return;

    const aiGeneratedText = `
      <p><strong>Focus Areas for Next Lesson:</strong></p>
      <ul>
        <li>Strengthen foundation in core concepts</li>
        <li>Practice more hands-on exercises</li>
        <li>Work on understanding complex scenarios</li>
      </ul>
      <p>Additional recommendations include reviewing previous materials and preparing questions for clarification.</p>
    `;
    handlePointsChange(aiGeneratedText);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50  px-4">
      <BackButton variant="outline" label="Default" />
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">
              {viewMode === "create"
                ? "Give Feedback"
                : viewMode === "edit"
                  ? "Edit Feedback"
                  : "View Feedback"}
            </h1>

            {viewMode === "view" && (
              <div className="flex space-x-2">
                <button
                  onClick={handleEdit}
                  className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors duration-200"
                  title="Edit Feedback"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                </button>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors duration-200"
                  title="Delete Feedback"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            )}
          </div>

          {/* Form Components */}
          <SkillsDropdown
            selectedSkills={formData.skills}
            onSkillToggle={handleSkillToggle}
            disabled={isReadOnly}
          />

          <FormInput
            label="Number of hours remaining"
            value={formData.hoursRemaining}
            onChange={handleHoursChange}
            disabled={isReadOnly}
          />

          <RichTextEditor
            value={formData.pointsToWorkOn}
            onChange={handlePointsChange}
            disabled={isReadOnly}
            showAIGenerate={!isReadOnly}
            onAIGenerate={generateUsingAI}
          />

          <ActionButtons
            viewMode={viewMode}
            isSubmitting={isSubmitting}
            onSubmit={handleCreate}
            onUpdate={handleUpdate}
            onCancel={handleCancel}
            onCancelEdit={handleCancelEdit}
          />
        </div>
      </div>

      <DeleteModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        isLoading={isDeleting}
      />
    </div>
  );
};

export default FeedbackForm;
