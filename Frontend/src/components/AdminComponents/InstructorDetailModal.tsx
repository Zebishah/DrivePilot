import React, { useState } from "react";
import {
  X,
  Star,
  MapPin,
  Phone,
  Mail,
  Calendar,
  User,
  Car,
  Settings,
  FileText,
  Check,
  Clock,
  ChevronDown,
} from "lucide-react";
import { useMutation, gql } from "@apollo/client";
import toast from "react-hot-toast";
import { StarRating } from "../StudentComponents/ReviewTab/RatingComponent";
import { UPDATE_INSTRUCTOR_COMMISSION } from "../../graphql/Queries/InstructorProfiles";

// Simple date formatter
const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

interface Instructor {
  _id: string;
  id?: string; // Add optional id field for compatibility
  firstName: string;
  lastName: string;
  profileImage?: string;
  isUserVerified: boolean;
  verificationStatus: "pending" | "verified" | "rejected";
  email: string;
  phone?: string;
  location?: string;
  address?: string;
  gender?: string;
  dateOfBirth?: string;
  experience?: number;
  carName?: string;
  transmissionType?: string;
  languagePreference?: string[];
  commission?: { instructorRate?: number | null } | null;
  documents: Array<{
    _id: string;
    documentType: string;
    status: "accepted" | "pending" | "rejected";
  }>;
  createdAt?: string;
  updatedAt?: string;
}

const StatusToggle = ({ currentStatus, onStatusChange, isLoading = false }) => {
  const [isOpen, setIsOpen] = useState(false);

  const statusOptions = [
    {
      value: "pending",
      label: "Pending",
      icon: Clock,
      color: "bg-amber-100 text-amber-800 border-amber-200",
      hoverColor: "hover:bg-amber-50",
      iconColor: "text-amber-600",
    },
    {
      value: "verified",
      label: "Verified",
      icon: Check,
      color: "bg-emerald-100 text-emerald-800 border-emerald-200",
      hoverColor: "hover:bg-emerald-50",
      iconColor: "text-emerald-600",
    },
    {
      value: "rejected",
      label: "Rejected",
      icon: X,
      color: "bg-red-100 text-red-800 border-red-200",
      hoverColor: "hover:bg-red-50",
      iconColor: "text-red-600",
    },
  ];

  const currentOption = statusOptions.find(
    (option) => option.value === currentStatus
  );

  const handleSelect = (status) => {
    onStatusChange(status);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          disabled={isLoading}
          className={`
            relative min-w-[120px] px-3 py-2 text-left rounded-lg border-2 transition-all duration-200
            ${currentOption?.color}
            ${currentOption?.hoverColor}
            ${isLoading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
            shadow-sm hover:shadow-md
          `}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {currentOption && (
                <currentOption.icon
                  className={`w-3 h-3 ${currentOption.iconColor}`}
                />
              )}
              <span className="font-medium text-xs">
                {currentOption?.label}
              </span>
            </div>
            <ChevronDown
              className={`w-3 h-3 transition-transform duration-200 ${
                isOpen ? "rotate-180" : ""
              } ${currentOption?.iconColor}`}
            />
          </div>

          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-80 rounded-lg">
              <div className="w-3 h-3 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
            </div>
          )}
        </button>

        {isOpen && !isLoading && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
            {statusOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option.value)}
                className={`
                  w-full px-3 py-2 text-left flex items-center space-x-2 transition-colors duration-150
                  ${
                    option.value === currentStatus
                      ? `${option.color} ${option.hoverColor}`
                      : "text-gray-700 hover:bg-gray-50"
                  }
                  focus:outline-none focus:bg-gray-50
                `}
              >
                <option.icon
                  className={`w-3 h-3 ${
                    option.value === currentStatus
                      ? option.iconColor
                      : "text-gray-400"
                  }`}
                />
                <span className="font-medium text-xs">{option.label}</span>
                {option.value === currentStatus && (
                  <div className="ml-auto">
                    <div
                      className={`w-1.5 h-1.5 rounded-full ${option.iconColor.replace("text-", "bg-")}`}
                    ></div>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export const UPDATE_INSTRUCTOR_VERIFICATION_STATUS = gql`
  mutation UpdateInstructorVerificationStatus($id: ID!, $status: String!) {
    updateInstructorVerificationStatus(id: $id, status: $status) {
      _id
      verificationStatus
      isUserVerified
      updatedAt
    }
  }
`;

interface InstructorDetailModalProps {
  instructor: Instructor | null;
  isOpen: boolean;
  onClose: () => void;
  onInstructorUpdate?: (updatedInstructor: Instructor) => void;
  refetchQueries?: string[];
  refetchInstructors?: () => void;
}

export const InstructorDetailModal: React.FC<InstructorDetailModalProps> = ({
  instructor,
  isOpen,
  onClose,
  refetchInstructors,
}) => {
  const [instructorRateDisplay, setInstructorRateDisplay] = useState<string>(
    instructor?.commission?.instructorRate != null ? String(instructor.commission.instructorRate) : "",
  );
  React.useEffect(() => {
    setInstructorRateDisplay(
      instructor?.commission?.instructorRate != null ? String(instructor.commission.instructorRate) : "",
    );
  }, [instructor?.commission?.instructorRate]);

  const [updateCommission, { loading: updatingCommission }] = useMutation(
    UPDATE_INSTRUCTOR_COMMISSION,
    {
      onCompleted: () => {
        if (refetchInstructors) refetchInstructors();
        toast.success("Commission updated");
      },
      onError: (err) => toast.error(err.message || "Failed to update commission"),
    },
  );

  const [updateStatus, { loading: updating }] = useMutation(
    UPDATE_INSTRUCTOR_VERIFICATION_STATUS,
    {
      onError: (error) => {
        console.error("Failed to update verification status:", error.message);
        // Show user-friendly error message
        toast.error("Failed to update verification status. Please try again.");
      },
      onCompleted: (data) => {
        console.log("Status update completed:", data);

        if (data?.updateInstructorVerificationStatus) {
          // Refetch all instructors to get updated data immediately
          if (refetchInstructors) {
            refetchInstructors();
          }
          onClose(); // Close the modal after successful update
          // Show success message
          toast.success("Verification status updated successfully");
        }
      },
    }
  );

  if (!isOpen || !instructor) return null;

  const fullName = `${instructor.firstName} ${instructor.lastName}`;
  const rating = instructor.reviewRating;

  const handleToggleVerification = async (
    newStatus: "verified" | "rejected" | "pending"
  ) => {
    if (!instructor) return;

    try {
      console.log(
        `Updating instructor ${instructor._id} to status: ${newStatus}`
      );

      await updateStatus({
        variables: {
          id: instructor.id, // Use _id instead of id
          status: newStatus,
        },
      });

      console.log("Mutation completed successfully");
    } catch (error) {
      console.error("Failed to update verification status", error);
      // Error is already handled in onError callback
    }
  };
  console.log("Instructor Data:", instructor);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />

      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto relative">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-xl">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">
              Instructor Details
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Header Section */}
          <div className="flex items-start space-x-6 mb-6">
            <img
              src={
                instructor.profileImage || "/images/Portrait_Placeholder.png"
              }
              alt={fullName}
              className="w-24 h-24 rounded-full object-cover border-4 border-gray-200"
            />

            <div className="flex-1">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {fullName}
              </h3>

              <div className="flex items-center mb-3">
                <div className="flex items-center">
                  <StarRating
                    rating={rating || 0}
                    count={instructor.reviewsCount}
                  />
                </div>
              </div>
              <div className="ml-3 flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">
                  Status:
                </label>
                <StatusToggle
                  currentStatus={instructor.verificationStatus}
                  onStatusChange={handleToggleVerification}
                  isLoading={updating}
                />
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                Contact Information
              </h4>

              <div className="flex items-center text-gray-600">
                <Mail className="w-5 h-5 mr-3 text-gray-400" />
                <span>{instructor.email}</span>
              </div>

              {instructor.phone && (
                <div className="flex items-center text-gray-600">
                  <Phone className="w-5 h-5 mr-3 text-gray-400" />
                  <span>{instructor.phone}</span>
                </div>
              )}

              {instructor.location && (
                <div className="flex items-center text-gray-600">
                  <MapPin className="w-5 h-5 mr-3 text-gray-400" />
                  <span>{instructor.location}</span>
                </div>
              )}

              {instructor.address && (
                <div className="flex items-start text-gray-600">
                  <MapPin className="w-5 h-5 mr-3 text-gray-400 mt-0.5" />
                  <span className="text-sm">{instructor.address}</span>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                Personal Information
              </h4>

              {instructor.gender && (
                <div className="flex items-center text-gray-600">
                  <User className="w-5 h-5 mr-3 text-gray-400" />
                  <span>{instructor.gender}</span>
                </div>
              )}

              {instructor.dateOfBirth && (
                <div className="flex items-center text-gray-600">
                  <Calendar className="w-5 h-5 mr-3 text-gray-400" />
                  <span>{formatDate(instructor.dateOfBirth)}</span>
                </div>
              )}

              {instructor.experience && (
                <div className="flex items-center text-gray-600">
                  <FileText className="w-5 h-5 mr-3 text-gray-400" />
                  <span>{instructor.experience} years experience</span>
                </div>
              )}
            </div>
          </div>

          {/* Vehicle Information */}
          {(instructor.carName || instructor.transmissionType) && (
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2 mb-4">
                Vehicle Information
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {instructor.carName && (
                  <div className="flex items-center text-gray-600">
                    <Car className="w-5 h-5 mr-3 text-gray-400" />
                    <span>{instructor.carName}</span>
                  </div>
                )}

                {instructor.transmissionType && (
                  <div className="flex items-center text-gray-600">
                    <Settings className="w-5 h-5 mr-3 text-gray-400" />
                    <span>{instructor.transmissionType} Transmission</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Language Preferences */}
          {instructor?.languagePreference?.length > 0 && (
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2 mb-4">
                Language Preferences
              </h4>

              <div className="flex flex-wrap gap-2">
                {instructor?.languagePreference?.map((lang, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 text-sm font-medium text-blue-700 bg-blue-100 rounded-full"
                  >
                    {lang}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Documents */}
          {instructor.documents.length > 0 && (
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2 mb-4">
                Documents ({instructor.documents.length})
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {instructor.documents.map((doc) => (
                  <div
                    key={doc._id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center">
                      <FileText className="w-5 h-5 mr-3 text-gray-400" />
                      <span className="text-sm font-medium text-gray-700">
                        {doc.documentType}
                      </span>
                    </div>
                    <span
                      className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                        doc.status === "accepted"
                          ? "text-green-700 bg-green-100"
                          : doc.status === "pending"
                            ? "text-yellow-700 bg-yellow-100"
                            : "text-red-700 bg-red-100"
                      }`}
                    >
                      {doc.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Commission override */}
          <div className="mb-6">
            <h4 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2 mb-4">
              Commission override
            </h4>
            <p className="text-sm text-gray-600 mb-3">
              Set a custom instructor share (%) for this instructor. Leave empty or use &quot;Use platform default&quot; to apply the default from Commission Management.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="number"
                min={0}
                max={100}
                value={instructorRateDisplay}
                onChange={(e) => setInstructorRateDisplay(e.target.value)}
                placeholder="e.g. 60"
                className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <span className="text-sm text-gray-600">% to instructor</span>
              <button
                type="button"
                onClick={() => {
                  setInstructorRateDisplay("");
                  updateCommission({
                    variables: {
                      instructorId: instructor.id || instructor._id,
                      input: { instructorRate: null },
                    },
                  });
                }}
                disabled={updatingCommission}
                className="text-sm px-3 py-1.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
              >
                Use platform default
              </button>
              <button
                type="button"
                onClick={() => {
                  const val = parseFloat(instructorRateDisplay);
                  if (!Number.isFinite(val) || val < 0 || val > 100) {
                    toast.error("Enter a number between 0 and 100");
                    return;
                  }
                  updateCommission({
                    variables: {
                      instructorId: instructor.id || instructor._id,
                      input: { instructorRate: val },
                    },
                  });
                }}
                disabled={updatingCommission}
                className="text-sm px-4 py-1.5 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {updatingCommission ? "Saving..." : "Save commission"}
              </button>
            </div>
            {instructor?.commission?.instructorRate != null && (
              <p className="text-xs text-gray-500 mt-2">
                Current: {instructor.commission.instructorRate}% to instructor (custom)
              </p>
            )}
          </div>

          {/* Registration Date */}
          <div className="text-sm text-gray-500 pt-4 border-t border-gray-200">
            {instructor?.createdAt && !isNaN(Number(instructor.createdAt)) && (
              <p>Registered on {formatDate(Number(instructor.createdAt))}</p>
            )}

            {instructor?.updatedAt &&
              instructor?.updatedAt !== instructor?.createdAt &&
              !isNaN(Number(instructor.updatedAt)) && (
                <p>
                  Last updated on {formatDate(Number(instructor.updatedAt))}
                </p>
              )}
          </div>
        </div>
      </div>
    </div>
  );
};
