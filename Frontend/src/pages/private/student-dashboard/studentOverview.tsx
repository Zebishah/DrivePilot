import React, { useState, useEffect } from "react";
import {
  BookOpen,
  Download,
  User,
  Clock,
  Calendar,
  X,
  Loader2,
  Eye,
} from "lucide-react";
import { gql, useQuery } from "@apollo/client";
import { Feedback, SlotLesson } from "../../../types/StudentDashboard";
import {
  GET_STUDENT_DASHBOARD_STATS,
  GET_STUDENT_FEEDBACKS,
  GET_STUDENT_LESSONS,
} from "../../../graphql/Queries/StudentDashboard";
import { LoadingCard } from "../../../components/StudentComponents/StudentDashboard/LoadingCard";
import { CircularProgress } from "../../../components/StudentComponents/StudentDashboard/CircularProgressDashboard";
import { FeedbackModal } from "../../../components/StudentComponents/StudentDashboard/FeedBackModal";
import { useAuth } from "../../../context/AuthContext";
import { Link } from "react-router-dom";

export default function StudentOverview() {
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(
    null
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { user } = useAuth();

  const studentId = user?.id || "";
  // GraphQL Queries
  const {
    data: statsData,
    loading: statsLoading,
    error: statsError,
  } = useQuery(GET_STUDENT_DASHBOARD_STATS, {
    variables: { studentId },
    skip: !studentId, // 🚫 skip if no student ID
    fetchPolicy: "network-only", // 🚨 always fetch fresh on mount
  });

  const {
    data: lessonsData,
    loading: lessonsLoading,
    error: lessonsError,
  } = useQuery(GET_STUDENT_LESSONS, {
    variables: { studentId },
    skip: !studentId,
    fetchPolicy: "network-only",
  });

  const {
    data: feedbacksData,
    loading: feedbacksLoading,
    error: feedbacksError,
  } = useQuery(GET_STUDENT_FEEDBACKS, {
    variables: { studentId },
    skip: !studentId,
    fetchPolicy: "network-only",
  });

  // Helper function to check if lesson is this week
  const isThisWeek = (lessonDate: string): boolean => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    const date = new Date(lessonDate);
    return date >= startOfWeek && date < endOfWeek;
  };

  // Filter lessons for this week
  const thisWeeksLessons =
    lessonsData?.getStudentLesson?.filter((lesson: SlotLesson) =>
      isThisWeek(lesson.date)
    ) || [];

  // Get all lessons (you can limit this as needed)
  const allLessons = lessonsData?.getStudentLesson || [];

  // Get feedbacks
  const feedbacks = feedbacksData?.getStudentFeedbacks || [];

  // Handle feedback modal
  const handleFeedbackClick = (feedback: Feedback) => {
    setSelectedFeedback(feedback);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedFeedback(null);
  };

  // Calculate remaining hours percentage for circular progress
  const getRemainingHoursPercentage = () => {
    if (!statsData?.getStudentDashboardStats?.remainingHours) return 0;
    const remaining = parseInt(
      statsData.getStudentDashboardStats.remainingHours
    );
    const total = 10; // Assuming total hours, adjust as needed
    return (remaining / total) * 100;
  };

  // Error handling
  if (statsError || lessonsError || feedbacksError) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline">
            {" "}
            Failed to load dashboard data. Please try again.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statsLoading ? (
          <>
            <LoadingCard />
            <LoadingCard />
            <LoadingCard />
            <LoadingCard />
          </>
        ) : (
          <>
            <div className="bg-red-200 rounded-lg p-6  flex flex-col justify-center items-center">
              <div className="flex items-center justify-center bg-white rounded-full mb-2 p-4">
                <BookOpen className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="text-sm font-medium text-gray-700 mb-1">
                Total Lessons
              </h3>
              <p className="text-3xl font-bold text-gray-900">
                {statsData?.getStudentDashboardStats?.totalLessons || 0}
              </p>
            </div>

            <div className="bg-purple-200 rounded-lg px-6   flex flex-col justify-center items-center">
              <div className="flex items-center justify-center p-4 bg-white rounded-full mb-2">
                <Calendar className="w-6 h-6 text-purple-500" />
              </div>
              <h3 className="text-sm font-medium text-gray-700 mb-1">
                Current Booking
              </h3>
              <p className="text-3xl font-bold text-gray-900">
                {statsData?.getStudentDashboardStats?.currentBookings || 0}
              </p>
            </div>

            <div className="bg-yellow-200 rounded-lg p-6  flex flex-col justify-center items-center">
              <div className="flex items-center justify-center p-4 bg-white rounded-full mb-2">
                <User className="w-6 h-6 text-yellow-600" />
              </div>
              <h3 className="text-sm font-medium text-gray-700 mb-1">
                Total Instructors
              </h3>
              <p className="text-3xl font-bold text-gray-900">
                {statsData?.getStudentDashboardStats?.totalInstructors || 0}
              </p>
            </div>

            <div className="bg-cyan-200 rounded-lg p-6  flex flex-col justify-between items-center">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-1">
                  Remaining Hours
                </h3>
              </div>
              <CircularProgress
                value={getRemainingHoursPercentage()}
                text={`${statsData?.getStudentDashboardStats?.remainingHours || 0}hrs`}
              />
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* This Week's Lessons */}
        <div className="lg:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">
              This Week's Lessons
            </h2>
            <Link
              to={"/student-dashboard/search"}
              className="bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Find Instructor
            </Link>
          </div>

          {lessonsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="bg-gray-200 rounded-lg p-4 h-16 animate-pulse"
                ></div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {thisWeeksLessons.length > 0 ? (
                thisWeeksLessons.map((lesson: SlotLesson, index: number) => (
                  <div
                    key={lesson.lessonId}
                    className="bg-cyan-50 rounded-lg p-4 flex justify-between items-center"
                  >
                    <div className="flex items-center justify-between w-[60%]">
                      <div className="flex items-center space-x-3">
                        <BookOpen className="w-5 h-5 text-cyan-600" />
                        <span className="font-medium text-gray-900">
                          Lesson {index + 1}
                        </span>
                      </div>

                      <span className="text-sm text-gray-600">
                        with {lesson.instructorName}
                      </span>
                      <span className="text-sm text-gray-500">
                        {new Date(lesson.date).toLocaleDateString()}{" "}
                      </span>
                    </div>
                    <span
                      className={`text-sm font-medium ${
                        lesson.isCompleted
                          ? "text-green-600"
                          : "text-orange-600"
                      }`}
                    >
                      {lesson.isCompleted ? "Completed" : "In Progress"}
                    </span>
                  </div>
                ))
              ) : (
                <div className="bg-gray-100 rounded-lg p-8 text-center">
                  <p className="text-gray-500">
                    No lessons scheduled for this week
                  </p>
                </div>
              )}
            </div>
          )}

          {/* All Lessons */}
          <div className="mt-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              All Lessons
            </h2>
            {lessonsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="bg-gray-200 rounded-lg p-4 h-16 animate-pulse"
                  ></div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {allLessons.length > 0 ? (
                  allLessons
                    .slice(0, 5)
                    .map((lesson: SlotLesson, index: number) => (
                      <div
                        key={`all-${lesson.lessonId}-${index}`}
                        className="bg-cyan-50 rounded-lg p-4 flex justify-between items-center"
                      >
                        <div className="flex items-center justify-between w-[60%]">
                          <div className="flex items-center space-x-3">
                            <BookOpen className="w-5 h-5 text-cyan-600" />
                            <span className="font-medium text-gray-900">
                              Lesson {index + 1}
                            </span>
                          </div>
                          <span className="text-sm text-gray-600">
                            with {lesson.instructorName}
                          </span>
                          <span className="text-sm text-gray-500">
                            {new Date(lesson.date).toLocaleDateString()}
                          </span>
                        </div>
                        <span
                          className={`text-sm font-medium ${
                            lesson.isCompleted
                              ? "text-green-600"
                              : "text-orange-600"
                          }`}
                        >
                          {lesson.isCompleted ? "Completed" : "In Progress"}
                        </span>
                      </div>
                    ))
                ) : (
                  <div className="bg-gray-100 rounded-lg p-8 text-center">
                    <p className="text-gray-500">No lessons found</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Notes From Instructors */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Notes From Instructors
          </h2>
          {feedbacksLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="bg-gray-200 rounded-lg p-4 h-20 animate-pulse"
                ></div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {feedbacks.length > 0 ? (
                feedbacks.map((feedback: Feedback, index: number) => (
                  <div
                    key={feedback._id}
                    className="bg-white rounded-lg p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => handleFeedbackClick(feedback)}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <svg
                            className="w-4 h-4 text-blue-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M7 8h10m0 0V6a2 2 0 00-2-2H9a2 2 0 00-2 2v2m0 0v8a2 2 0 002 2h8a2 2 0 002-2V8m-9 4h4"
                            />
                          </svg>
                        </div>
                        <h3 className="font-medium text-gray-900">
                          Lesson{index + 1} ({feedback.hoursRemaining} hrs)
                        </h3>
                      </div>
                      <button className="flex items-center space-x-1 text-gray-600 hover:text-gray-800">
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-xs text-gray-600 ml-11 -mt-1">
                      {new Date(Number(feedback.createdAt)).toLocaleDateString(
                        "en-US",
                        {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        }
                      )}{" "}
                      {new Date(Number(feedback.createdAt)).toLocaleTimeString(
                        "en-US",
                        {
                          hour: "numeric",
                          minute: "2-digit",
                          hour12: true,
                        }
                      )}
                    </p>
                    {/* <p className="text-xs text-gray-500 mt-1 truncate"> 
          {feedback.message} 
        </p> */}
                  </div>
                ))
              ) : (
                <div className="bg-gray-100 rounded-lg p-8 text-center">
                  <p className="text-gray-500">No feedback available</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Feedback Modal */}
      {selectedFeedback && (
        <FeedbackModal
          feedback={selectedFeedback}
          isOpen={isModalOpen}
          onClose={closeModal}
        />
      )}
    </div>
  );
}
