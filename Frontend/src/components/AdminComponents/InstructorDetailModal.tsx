import React from "react";
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
} from "lucide-react";

import { format } from "date-fns";
import { Instructor } from "../../types/Instructor";

interface InstructorDetailModalProps {
  instructor: Instructor | null;
  isOpen: boolean;
  onClose: () => void;
}

export const InstructorDetailModal: React.FC<InstructorDetailModalProps> = ({
  instructor,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !instructor) return null;

  const fullName = `${instructor.firstName} ${instructor.lastName}`;
  const rating = instructor.isUserVerified ? 100 : 60;
  console.log("instructor", instructor);
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
                instructor.profileImage ||
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
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < Math.floor(rating / 20)
                          ? "text-yellow-400 fill-current"
                          : "text-gray-300"
                      }`}
                    />
                  ))}
                  <span className="text-sm text-gray-600 ml-2">{rating}%</span>
                  {instructor.isUserVerified && (
                    <span className="ml-3 inline-flex items-center px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-full">
                      Verified
                    </span>
                  )}
                </div>
              </div>

              {instructor.description && (
                <p className="text-gray-600 text-sm leading-relaxed">
                  {instructor.description}
                </p>
              )}
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
                  <span>{format(new Date(instructor.dateOfBirth), "PP")}</span>
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

          {/* Registration Date */}
          <div className="text-sm text-gray-500 pt-4 border-t border-gray-200">
            {instructor?.createdAt && !isNaN(Number(instructor.createdAt)) && (
              <p>
                Registered on{" "}
                {format(new Date(Number(instructor.createdAt)), "PPP")}
              </p>
            )}

            {instructor?.updatedAt &&
              instructor?.updatedAt !== instructor?.createdAt &&
              !isNaN(Number(instructor.updatedAt)) && (
                <p>
                  Last updated on{" "}
                  {format(new Date(Number(instructor.updatedAt)), "PPP")}
                </p>
              )}
          </div>
        </div>
      </div>
    </div>
  );
};
