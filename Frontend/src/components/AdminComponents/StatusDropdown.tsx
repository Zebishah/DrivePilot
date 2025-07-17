import React, { useState } from "react";
import { ChevronDown, Check, Clock, X } from "lucide-react";
import { useMutation } from "@apollo/client";
import { InstructorDocument } from "../../types/Instructor";
import { UPDATE_DOCUMENT_STATUS } from "../InstructorComponent/DocumentUpdate/DocumentUpdateModal";
import { GET_ALL_INSTRUCTORS } from "../../graphql/Queries/InstructorProfiles";
import toast from "react-hot-toast";

interface StatusDropdownProps {
  currentStatus: "pending" | "accepted" | "rejected";
  documentId: string;
  onStatusChange?: (newStatus: string) => void;
  isCollective?: boolean;
  documents?: InstructorDocument[];
}

const statusConfig = {
  pending: {
    label: "Pending",
    color: "text-amber-600 bg-amber-50",
    icon: Clock,
  },
  accepted: {
    label: "Accepted",
    color: "text-green-600 bg-green-50",
    icon: Check,
  },
  rejected: { label: "Rejected", color: "text-red-600 bg-red-50", icon: X },
};

export const StatusDropdown: React.FC<StatusDropdownProps> = ({
  currentStatus,
  documentId,
  onStatusChange,
  isCollective = false,
  documents = [],
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [updateStatus, { loading }] = useMutation(UPDATE_DOCUMENT_STATUS, {
    refetchQueries: [{ query: GET_ALL_INSTRUCTORS }],
    awaitRefetchQueries: true,
  });

  const handleStatusChange = async (newStatus: string) => {
    try {
      if (isCollective && documents && documents.length > 0) {
        // Update all documents in the collective group
        for (const doc of documents) {
          await updateStatus({
            variables: {
              documentId: doc._id,
              status: newStatus,
            },
          });
        }
        toast.success(
          `Swiss Driving License status updated to ${newStatus} (${documents.length} documents affected)`
        );
      } else {
        await updateStatus({
          variables: {
            documentId,
            status: newStatus,
          },
        });
        toast.success(`Document status updated to ${newStatus}`);
      }

      onStatusChange?.(newStatus);
      setIsOpen(false);
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update document status");
    }
  };

  const CurrentIcon = statusConfig[currentStatus].icon;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading}
        className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          statusConfig[currentStatus].color
        } hover:opacity-80 disabled:opacity-50 ${
          isCollective ? "border-2 border-dashed border-blue-300" : ""
        }`}
        title={isCollective ? "This affects multiple documents" : ""}
      >
        <CurrentIcon size={16} />
        {statusConfig[currentStatus].label}
        {isCollective && documents && documents.length > 0 && (
          <span className="text-xs bg-blue-100 text-blue-600 px-1 rounded">
            {documents.length}x
          </span>
        )}
        <ChevronDown
          size={14}
          className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[140px]">
          {isCollective && documents && documents.length > 0 && (
            <div className="px-3 py-2 text-xs text-blue-600 bg-blue-50 border-b border-blue-100">
              Affects {documents.length} documents
            </div>
          )}
          {Object.entries(statusConfig).map(([status, config]) => {
            const Icon = config.icon;
            return (
              <button
                key={status}
                onClick={() => handleStatusChange(status)}
                disabled={loading}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 transition-colors disabled:opacity-50 ${
                  status === currentStatus ? "bg-gray-50" : ""
                }`}
              >
                <Icon size={16} className={config.color.split(" ")[0]} />
                {config.label}
                {loading && (
                  <div className="ml-auto">
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
      )}
    </div>
  );
};
