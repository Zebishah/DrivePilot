import React from "react";
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
} from "lucide-react";

import { format } from "date-fns";
import { StudentDetail } from "../../types/Student";

interface StudentDetailModalProps {
  student: StudentDetail | null;
  isOpen: boolean;
  onClose: () => void;
}

export const StudentDetailModal: React.FC<StudentDetailModalProps> = ({
  student,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !student) return null;

  const fullName = `${student.firstName} ${student.lastName}`;
  const progressPercentage =
    student.remainingHours > 0 ? (student.remainingHours / 100) * 100 : 0;

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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {student.documents.map((doc, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center">
                      <FileText className="w-5 h-5 mr-3 text-gray-400" />
                      <span className="text-sm font-medium text-gray-700">
                        {doc.documentType}
                      </span>
                    </div>
                    <span
                      className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full 
                        text-green-700 bg-green-100`}
                    >
                      {"verified"}
                    </span>
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
  );
};
