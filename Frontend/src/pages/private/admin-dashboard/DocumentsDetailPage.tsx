import React, { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@apollo/client";
import {
  ArrowLeft,
  MapPin,
  Phone,
  Mail,
  Car,
  Calendar,
  User,
} from "lucide-react";
import { GET_ALL_INSTRUCTORS } from "../../../graphql/Queries/InstructorProfiles";
import { Instructor, InstructorDocument } from "../../../types/Instructor";
import { StatusDropdown } from "../../../components/AdminComponents/StatusDropdown";
import { DocumentSlider } from "../../../components/AdminComponents/DocumentSlider";

export const DocumentDetailsPage: React.FC = () => {
  const { instructorId, documentType } = useParams<{
    instructorId: string;
    documentType: string;
  }>();
  const navigate = useNavigate();
  const { data, loading, error } = useQuery(GET_ALL_INSTRUCTORS);

  const { instructor, documentsOfType } = useMemo(() => {
    if (!data?.allInstructors || !instructorId || !documentType) {
      return { instructor: null, documentsOfType: [] };
    }

    const decodedDocumentType = decodeURIComponent(documentType);
    const foundInstructor = data.allInstructors.find(
      (inst: Instructor) => inst._id === instructorId
    );

    if (!foundInstructor) {
      return { instructor: null, documentsOfType: [] };
    }

    let documents: InstructorDocument[] = [];

    // Handle Swiss Driving License as collective
    if (decodedDocumentType === "Swiss Driving License") {
      documents = foundInstructor.documents.filter((doc) =>
        doc.documentType.startsWith("Swiss Driving License")
      );
    } else {
      documents = foundInstructor.documents.filter(
        (doc) => doc.documentType === decodedDocumentType
      );
    }

    return {
      instructor: foundInstructor,
      documentsOfType: documents,
    };
  }, [data, instructorId, documentType]);
  const [selectedDoc, setSelectedDoc] = useState<InstructorDocument | null>(
    documentsOfType[0] || null
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="text-gray-600">Loading document details...</span>
        </div>
      </div>
    );
  }

  if (error || !instructor) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-lg font-semibold mb-2">
            Document not found
          </div>
          <div className="text-gray-600 mb-4">
            The requested document or instructor could not be found.
          </div>
          <button
            onClick={() => navigate("/")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Documents
          </button>
        </div>
      </div>
    );
  }
  console.log("documentsOfType", documentsOfType);
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className=" mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/admin-dashboard/documentsManagement")}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <ArrowLeft size={24} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {decodeURIComponent(documentType || "")}
              </h1>
              <p className="text-gray-600">
                {instructor.firstName} {instructor.lastName}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className=" mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Instructor Profile */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">
                Instructor Profile
              </h2>

              {/* Profile Image */}
              <div className="text-center mb-6">
                {instructor.profileImage ? (
                  <img
                    src={instructor.profileImage}
                    alt={`${instructor.firstName} ${instructor.lastName}`}
                    className="w-24 h-24 rounded-full mx-auto object-cover"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gray-300 mx-auto flex items-center justify-center">
                    <User className="h-12 w-12 text-gray-600" />
                  </div>
                )}
                <h3 className="mt-4 text-xl font-semibold text-gray-900">
                  {instructor.firstName} {instructor.lastName}
                </h3>
              </div>

              {/* Contact Info */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    {instructor.email}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    {instructor.phone}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    {instructor.location}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Car className="h-5 w-5 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    {instructor.carName} ({instructor.transmissionType})
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    {instructor.experience} years experience
                  </span>
                </div>
              </div>

              {/* Description */}
              {instructor.description && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">
                    Introduction
                  </h4>
                  <p className="text-sm text-gray-600">
                    {instructor.description}
                  </p>
                </div>
              )}

              {/* Address */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="text-sm font-medium text-gray-900 mb-2">
                  Address
                </h4>
                <p className="text-sm text-gray-600">{instructor.address}</p>
                <p className="text-sm text-gray-600">
                  ZIP: {instructor.zipCode}
                </p>
              </div>
            </div>
          </div>

          {/* Document Viewer */}
          <div className="lg:col-span-2">
            <div className="space-y-6">
              {/* Document Status */}
              {documentsOfType.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">
                      Document Status
                    </h2>

                    {selectedDoc && (
                      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                        {/* Submitted on */}
                        <p className="text-sm text-gray-700">
                          <strong>Submitted on:</strong>{" "}
                          {selectedDoc.createdAt
                            ? (() => {
                                const date = new Date(
                                  Number(selectedDoc.createdAt)
                                );
                                const options = {
                                  month: "long",
                                  day: "numeric",
                                };
                                const formattedDate = date.toLocaleDateString(
                                  "en-US",
                                  options
                                );
                                const hours = date
                                  .getHours()
                                  .toString()
                                  .padStart(2, "0");
                                const minutes = date
                                  .getMinutes()
                                  .toString()
                                  .padStart(2, "0");
                                return `${formattedDate} at ${hours}h${minutes}`;
                              })()
                            : "N/A"}
                        </p>
                      </div>
                    )}

                    {/* ✅ Use selectedDoc for current status */}
                    {selectedDoc && (
                      <StatusDropdown
                        currentStatus={selectedDoc.status}
                        documentId={selectedDoc._id}
                        isCollective={
                          decodeURIComponent(documentType || "") ===
                          "Swiss Driving License"
                        }
                        documents={
                          decodeURIComponent(documentType || "") ===
                          "Swiss Driving License"
                            ? documentsOfType
                            : undefined
                        }
                      />
                    )}
                  </div>
                  {decodeURIComponent(documentType || "") ===
                    "Swiss Driving License" && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-700">
                        <strong>Note:</strong> Status changes will affect all
                        Swiss Driving License documents (Front & Back).
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Document Slider */}
              <DocumentSlider
                documents={documentsOfType}
                onDocumentSelect={(doc: InstructorDocument) =>
                  setSelectedDoc(doc)
                }
              />

              {/* Document List */}
              {documentsOfType.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    {decodeURIComponent(documentType || "") ===
                    "Swiss Driving License"
                      ? "Swiss Driving License Documents (Front & Back)"
                      : `All ${decodeURIComponent(documentType || "")} Documents`}
                  </h3>
                  <div className="space-y-3">
                    {documentsOfType.map((doc, index) => (
                      <div
                        key={doc._id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-gray-900">
                            {decodeURIComponent(documentType || "") ===
                            "Swiss Driving License"
                              ? doc.documentType
                              : `Document ${index + 1}`}
                          </span>
                          <a
                            href={doc.documentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:text-blue-800"
                          >
                            View Original
                          </a>
                        </div>
                        {decodeURIComponent(documentType || "") ===
                        "Swiss Driving License" ? (
                          <StatusDropdown
                            currentStatus={doc.status}
                            documentId={doc._id}
                            isCollective={true}
                            documents={documentsOfType}
                          />
                        ) : (
                          <StatusDropdown
                            currentStatus={doc.status}
                            documentId={doc._id}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
