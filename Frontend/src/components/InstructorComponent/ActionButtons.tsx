import React from "react";
import { ViewMode } from "../../types/LessonFeedback";

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
    <div className="flex space-x-4 pt-4">
      {viewMode === "create" && (
        <>
          <button
            onClick={onSubmit}
            disabled={isSubmitting}
            className="bg-[#5FC2D3] hover:bg-[#65a8b4] disabled:bg-[#6ce9ff77] text-white font-medium py-3 px-8 rounded-lg transition-colors duration-200 flex items-center space-x-2"
          >
            {isSubmitting && <LoadingSpinner />}
            <span>{isSubmitting ? "Submitting..." : "Submit"}</span>
          </button>
          <button
            onClick={onCancel}
            disabled={isSubmitting}
            className="bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 text-gray-700 font-medium py-3 px-8 rounded-lg transition-colors duration-200"
          >
            Cancel
          </button>
        </>
      )}

      {viewMode === "edit" && (
        <>
          <button
            onClick={onUpdate}
            disabled={isSubmitting}
            className="bg-[#5FC2D3] hover:bg-[#65a8b4] disabled:bg-[#6ce9ff77] text-white font-medium py-3 px-8 rounded-lg transition-colors duration-200 flex items-center space-x-2"
          >
            {isSubmitting && <LoadingSpinner />}
            <span>{isSubmitting ? "Updating..." : "Save Changes"}</span>
          </button>
          <button
            onClick={onCancelEdit}
            disabled={isSubmitting}
            className="bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 text-gray-700 font-medium py-3 px-8 rounded-lg transition-colors duration-200"
          >
            Cancel
          </button>
        </>
      )}

      {viewMode === "view" && (
        <button
          onClick={onCancel}
          className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-3 px-8 rounded-lg transition-colors duration-200"
        >
          Back to Dashboard
        </button>
      )}
    </div>
  );
};
