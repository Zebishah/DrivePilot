import React from "react";
import { ViewMode } from "../../../types/LessonFeedback";

interface ActionButtonsProps {
  viewMode: ViewMode;
  isSubmitting: boolean;
  onSubmit: () => void;
  onUpdate: () => void;
  onCancel: () => void;
  onCancelEdit: () => void;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({
  viewMode,
  isSubmitting,
  onSubmit,
  onUpdate,
  onCancel,
  onCancelEdit,
}) => {
  const LoadingSpinner = () => (
    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
  );

  return (
    <div className="dsp-feedback-form__footer">
      {viewMode === "create" && (
        <>
          <button
            type="button"
            onClick={onSubmit}
            disabled={isSubmitting}
            className="dsp-dashboard-button dsp-dashboard-button--primary"
          >
            {isSubmitting && <LoadingSpinner />}
            <span>{isSubmitting ? "Saving feedback..." : "Save feedback"}</span>
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="dsp-dashboard-button dsp-dashboard-button--secondary"
          >
            Cancel
          </button>
        </>
      )}

      {viewMode === "edit" && (
        <>
          <button
            type="button"
            onClick={onUpdate}
            disabled={isSubmitting}
            className="dsp-dashboard-button dsp-dashboard-button--primary"
          >
            {isSubmitting && <LoadingSpinner />}
            <span>{isSubmitting ? "Saving feedback..." : "Save feedback"}</span>
          </button>
          <button
            type="button"
            onClick={onCancelEdit}
            disabled={isSubmitting}
            className="dsp-dashboard-button dsp-dashboard-button--secondary"
          >
            Cancel
          </button>
        </>
      )}

      {viewMode === "view" && (
        <button
          type="button"
          onClick={onCancel}
          className="dsp-dashboard-button dsp-dashboard-button--secondary"
        >
          Back to Dashboard
        </button>
      )}
    </div>
  );
};
