import React, { useState } from "react";
import {
  X,
  Star,
  MapPin,
  Phone,
  Mail,
  Calendar,
  User,
  FileText,
  BookOpen,
  Clock,
  Eye,
  Download,
  ChevronDown,
} from "lucide-react";

import { format } from "date-fns";
import { StudentDetail } from "../../types/Student";
import { gql, useMutation } from "@apollo/client";

interface StudentDetailModalProps {
  student: StudentDetail | null;
  isOpen: boolean;
  onClose: () => void;
}

interface DocumentViewerModalProps {
  document: Document | null;
  isOpen: boolean;
  onClose: () => void;
}

export const UPDATE_DOCUMENT_STATUS_STUDENT = gql`
  mutation UpdateDocumentStatusStudent(
    $studentId: ID!
    $documentType: String!
    $status: DocumentStatus!
  ) {
    updateDocumentStatusStudent(
      studentId: $studentId
      documentType: $documentType
      status: $status
    ) {
      id
      documents {
        documentType
        documentUrl
        status
        createdAt
      }
    }
  }
`;

export interface Document {
  documentType: string;
  documentUrl?: string;
  documentContent?: string;
  status: "pending" | "accepted" | "rejected";
  createdAt?: string;
}

export type DocumentStatus = "pending" | "accepted" | "rejected";

// Document Status Dropdown Component
interface DocumentStatusDropdownProps {
  document: Document;
  studentId: string;
  onStatusUpdate?: (documentType: string, newStatus: DocumentStatus) => void;
}

const DocumentStatusDropdown: React.FC<DocumentStatusDropdownProps> = ({
  document,
  studentId,
  onStatusUpdate,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<DocumentStatus>(
    document.status
  );

  const [updateDocumentStatus, { loading }] = useMutation(
    UPDATE_DOCUMENT_STATUS_STUDENT,
    {
      onCompleted: (data) => {
        console.log("Document status updated successfully:", data);
        onStatusUpdate?.(document.documentType, currentStatus);
      },
      onError: (error) => {
        console.error("Error updating document status:", error);
        // Reset to previous status on error
        setCurrentStatus(document.status);
      },
    }
  );

  const statusOptions: {
    value: DocumentStatus;
    label: string;
    color: string;
  }[] = [
    {
      value: "pending",
      label: "Pending",
      color: "bg-yellow-100 text-yellow-700",
    },
    {
      value: "accepted",
      label: "Accepted",
      color: "bg-green-100 text-green-700",
    },
    { value: "rejected", label: "Rejected", color: "bg-red-100 text-red-700" },
  ];

  const handleStatusChange = async (newStatus: DocumentStatus) => {
    if (newStatus === currentStatus || loading) return;

    setCurrentStatus(newStatus);
    setIsOpen(false);

    try {
      await updateDocumentStatus({
        variables: {
          studentId,
          documentType: document.documentType,
          status: newStatus,
        },
      });
    } catch (error) {
      console.error("Failed to update document status:", error);
    }
  };

  const getCurrentStatusConfig = () => {
    return (
      statusOptions.find((option) => option.value === currentStatus) ||
      statusOptions[0]
    );
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading}
        className={`inline-flex items-center px-3 py-1 text-xs font-medium rounded-full transition-colors ${
          getCurrentStatusConfig().color
        } ${loading ? "opacity-50 cursor-not-allowed" : "hover:opacity-80"}`}
      >
        {loading ? "Updating..." : getCurrentStatusConfig().label}
        <ChevronDown
          className={`ml-1 w-3 h-3 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && !loading && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown Menu */}
          <div className="absolute right-0 mt-1 w-32 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
            {statusOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => handleStatusChange(option.value)}
                className={`w-full text-left px-3 py-2 text-xs font-medium transition-colors first:rounded-t-lg last:rounded-b-lg ${
                  option.value === currentStatus
                    ? `${option.color}`
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// Document Viewer Modal Component
const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  document,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !document) return null;

  const handleDownload = () => {
    if (document.documentUrl) {
      // Create a temporary link and trigger download
      const link = window.document.createElement("a");
      link.href = document.documentUrl;
      link.download = document.documentType;
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black bg-opacity-60"
        onClick={onClose}
      />

      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden relative">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-xl">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">
              {document.documentType}
            </h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleDownload}
                className="flex items-center justify-center w-8 h-8 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                title="Download Document"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Document Content */}
        <div className="p-6">
          {document.documentUrl ? (
            <div className="w-full h-96 border border-gray-200 rounded-lg overflow-hidden">
              {/* For PDF documents */}
              {document.documentUrl.toLowerCase().endsWith(".pdf") ? (
                <iframe
                  src={document.documentUrl}
                  className="w-full h-full"
                  title={document.documentType}
                />
              ) : /* For image documents */
              document.documentUrl
                  .toLowerCase()
                  .match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i) ? (
                <img
                  src={document.documentUrl}
                  alt={document.documentType}
                  className="w-full h-full object-contain"
                />
              ) : (
                /* For other file types, show a preview message */
                <div className="w-full h-full flex items-center justify-center bg-gray-50">
                  <div className="text-center">
                    <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600 mb-2">Document Preview</p>
                    <p className="text-sm text-gray-500">
                      Click download to view this document
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : document.documentContent ? (
            /* For text content */
            <div className="w-full h-96 border border-gray-200 rounded-lg p-4 overflow-y-auto bg-gray-50">
              <pre className="whitespace-pre-wrap text-sm text-gray-700">
                {document.documentContent}
              </pre>
            </div>
          ) : (
            /* No content available */
            <div className="w-full h-96 flex items-center justify-center bg-gray-50 border border-gray-200 rounded-lg">
              <div className="text-center">
                <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">No preview available</p>
                <p className="text-sm text-gray-500">
                  Document content cannot be displayed
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const StudentDetailModal: React.FC<StudentDetailModalProps> = ({
  student,
  isOpen,
  onClose,
}) => {
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(
    null
  );
  const [isDocumentViewerOpen, setIsDocumentViewerOpen] = useState(false);

  if (!isOpen || !student) return null;

  const fullName = `${student.firstName} ${student.lastName}`;
  const progressPercentage =
    student.remainingHours > 0 ? (student.remainingHours / 100) * 100 : 0;

  const handleViewDocument = (document: Document) => {
    setSelectedDocument(document);
    setIsDocumentViewerOpen(true);
  };

  const handleCloseDocumentViewer = () => {
    setIsDocumentViewerOpen(false);
    setSelectedDocument(null);
  };

  const handleDocumentStatusUpdate = (
    documentType: string,
    newStatus: DocumentStatus
  ) => {
    // Optional: You can update the local state here if needed
    console.log(`Document ${documentType} status updated to ${newStatus}`);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="absolute inset-0 bg-black bg-opacity-50"
          onClick={onClose}
        />

        <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto relative">
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">
                Student Details
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
                  student.profileImage ||
                  "https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop"
                }
                alt={fullName}
                className="w-24 h-24 rounded-full object-cover border-4 border-gray-200"
              />

              <div className="flex-1">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {fullName}
                </h3>

                <div className="flex items-center mb-3">
                  {student.isUserVerified && (
                    <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-full">
                      Verified
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Learning Progress */}
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">
                Learning Progress
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <BookOpen className="w-5 h-5 mr-2 text-blue-600" />
                    <span className="text-2xl font-bold text-gray-900">
                      {student.totalLessons}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">Total Lessons</p>
                </div>

                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Clock className="w-5 h-5 mr-2 text-blue-600" />
                    <span className="text-2xl font-bold text-gray-900">
                      {student.remainingHours}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">Remaining Hours</p>
                </div>

                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <span className="text-2xl font-bold text-gray-900">
                      {Math.round(progressPercentage)}%
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">Progress</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full">
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-blue-500 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                  />
                </div>
              </div>

              {student.lastLesson && !isNaN(Number(student.lastLesson)) && (
                <div className="mt-3 text-sm text-gray-600">
                  Last lesson:{" "}
                  {format(new Date(Number(student.lastLesson)), "PPP")}
                </div>
              )}
            </div>

            {/* Contact Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                  Contact Information
                </h4>

                <div className="flex items-center text-gray-600">
                  <Mail className="w-5 h-5 mr-3 text-gray-400" />
                  <span>{student.email}</span>
                </div>

                {student.phone && (
                  <div className="flex items-center text-gray-600">
                    <Phone className="w-5 h-5 mr-3 text-gray-400" />
                    <span>{student.phone}</span>
                  </div>
                )}

                {student.location && (
                  <div className="flex items-center text-gray-600">
                    <MapPin className="w-5 h-5 mr-3 text-gray-400" />
                    <span>{student.location}</span>
                  </div>
                )}

                {student.address && (
                  <div className="flex items-start text-gray-600">
                    <MapPin className="w-5 h-5 mr-3 text-gray-400 mt-0.5" />
                    <span className="text-sm">{student.address}</span>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                  Personal Information
                </h4>

                {student.dateOfBirth && !isNaN(Number(student.dateOfBirth)) && (
                  <div className="flex items-center text-gray-600">
                    <Calendar className="w-5 h-5 mr-3 text-gray-400" />
                    <span>
                      {format(new Date(Number(student.dateOfBirth)), "PP")}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Language Preferences */}
            {student.languagePreference.length > 0 && (
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2 mb-4">
                  Language Preferences
                </h4>

                <div className="flex flex-wrap gap-2">
                  {student.languagePreference.map((lang, index) => (
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
            {student.documents.length > 0 && (
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2 mb-4">
                  Documents ({student.documents.length})
                </h4>

                <div className="grid grid-cols-1 gap-3">
                  {student.documents.map((doc, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center flex-1">
                        <FileText className="w-5 h-5 mr-3 text-gray-400" />
                        <span className="text-sm font-medium text-gray-700">
                          {doc.documentType}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        {/* Document Status Dropdown */}
                        <DocumentStatusDropdown
                          document={doc}
                          studentId={student.id}
                          onStatusUpdate={handleDocumentStatusUpdate}
                        />

                        <button
                          onClick={() => handleViewDocument(doc)}
                          className="flex items-center justify-center w-8 h-8 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                          title="View Document"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Registration Date */}
            <div className="text-sm text-gray-500 pt-4 border-t border-gray-200">
              <p>
                Registered on{" "}
                {student.createdAt && !isNaN(Number(student.createdAt))
                  ? format(new Date(Number(student.createdAt)), "PPP")
                  : "Unknown"}
              </p>

              {student.updatedAt !== student.createdAt &&
                student.updatedAt &&
                !isNaN(Number(student.updatedAt)) && (
                  <p>
                    Last updated on{" "}
                    {format(new Date(Number(student.updatedAt)), "PPP")}
                  </p>
                )}
            </div>
          </div>
        </div>
      </div>

      {/* Document Viewer Modal */}
      <DocumentViewerModal
        document={selectedDocument}
        isOpen={isDocumentViewerOpen}
        onClose={handleCloseDocumentViewer}
      />
    </>
  );
};
