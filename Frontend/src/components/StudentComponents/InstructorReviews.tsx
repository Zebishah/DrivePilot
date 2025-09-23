import React, { useState, useEffect } from "react";
import { useQuery } from "@apollo/client";
import { gql } from "@apollo/client";
import { Star, User } from "lucide-react";
import { LoadingSpinner } from "../InstructorComponent/StudentsTracking/StudentHeader";
import { StarRating } from "./ReviewTab/RatingComponent";

// GraphQL Query
const GET_INSTRUCTOR_REVIEWS = gql`
  query GetInstructorReviews($instructorId: ID!) {
    getInstructorReviews(instructorId: $instructorId) {
      _id
      reviewStatus
      reviewRating
      reviewDescription
      studentId {
        _id
        firstName
        lastName
        profileImage
      }
      instructorId {
        _id
        firstName
        lastName
        profileImage
      }
      lessonId
      slotId
      createdAt
      updatedAt
    }
  }
`;

// Type definitions
interface Student {
  _id: string;
  firstName: string;
  lastName: string;
  profileImage?: string;
}

interface Instructor {
  _id: string;
  firstName: string;
  lastName: string;
  profileImage?: string;
}

interface Review {
  _id: string;
  reviewStatus: "approved" | "pending" | "rejected";
  reviewRating: number;
  reviewDescription: string;
  studentId: Student;
  instructorId: Instructor;
  lessonId: string;
  slotId: string;
  createdAt: string;
  updatedAt: string;
}

interface GetInstructorReviewsData {
  getInstructorReviews: Review[];
}

interface GetInstructorReviewsVariables {
  instructorId: string;
}

// Component Props
interface StarRatingProps {
  rating: number;
  size?: "sm" | "md" | "lg";
}

interface ReviewCardProps {
  review: Review;
}

interface InstructorReviewsProps {
  instructorId: string;
  activeTab: number;
}

// Star Rating Component

// Individual Review Card Component
const ReviewCard: React.FC<ReviewCardProps> = ({ review }) => {
  const formatDate = (date: string | number) => {
    const parsedDate = new Date(Number(date));
    return parsedDate.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getInitials = (firstName?: string, lastName?: string): string => {
    return `${firstName?.charAt(0) || ""}${lastName?.charAt(0) || ""}`.toUpperCase();
  };

  const getStatusBadgeClasses = (status: string): string => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 mb-4 shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start gap-4">
        {/* Profile Image/Avatar */}
        <div className="flex-shrink-0">
          {review.studentId?.profileImage ? (
            <img
              src={review.studentId.profileImage}
              alt={`${review.studentId.firstName} ${review.studentId.lastName}`}
              className="w-12 h-12 rounded-full object-cover border-2 border-gray-100"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center border-2 border-gray-100">
              <span className="text-gray-600 font-medium text-sm">
                {getInitials(
                  review.studentId?.firstName,
                  review.studentId?.lastName
                )}
              </span>
            </div>
          )}
        </div>

        {/* Review Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div>
              <h4 className="text-lg font-semibold text-gray-900">
                {review.studentId?.firstName} {review.studentId?.lastName}
              </h4>
              <StarRating rating={review.reviewRating} count={1} />
            </div>
            <span className="text-sm text-gray-500">
              {formatDate(review.createdAt)}
            </span>
          </div>

          {/* Review Description */}
          <p className="text-gray-700 leading-relaxed">
            {review.reviewDescription}
          </p>

          {/* Review Status Badge */}
          {/* {review.reviewStatus && (
            <div className="mt-3">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClasses(review.reviewStatus)}`}
              >
                {review.reviewStatus.charAt(0).toUpperCase() +
                  review.reviewStatus.slice(1)}
              </span>
            </div>
          )} */}
        </div>
      </div>
    </div>
  );
};

// Main Reviews Component
const InstructorReviews: React.FC<InstructorReviewsProps> = ({
  instructorId,
  activeTab,
}) => {
  const { loading, error, data, refetch } = useQuery<
    GetInstructorReviewsData,
    GetInstructorReviewsVariables
  >(GET_INSTRUCTOR_REVIEWS, {
    variables: { instructorId },
    skip: !instructorId,
    fetchPolicy: "cache-and-network",
  });

  const [reviews, setReviews] = useState<Review[]>([]);
  const [averageRating, setAverageRating] = useState<number>(0);

  useEffect(() => {
    if (data?.getInstructorReviews) {
      const reviewsData = data.getInstructorReviews;
      setReviews(reviewsData);

      // Calculate average rating
      if (reviewsData.length > 0) {
        const totalRating = reviewsData.reduce(
          (sum: number, review: Review) => sum + review.reviewRating,
          0
        );
        setAverageRating(totalRating / reviewsData.length);
      }
    }
  }, [data]);

  // Only render when tab 2 is active
  if (activeTab !== 2) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">
          {" "}
          <LoadingSpinner />
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-600 mb-4">
          Error loading reviews: {error.message}
        </p>
        <button
          onClick={() => refetch()}
          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto py-6  bg-white shadow-md rounded-md">
      {/* Reviews Header */}
      <div className="mb-8 border-b border-b-1 ">
        <div className="flex  justify-between mb-4 ">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2 px-6">
              Reviews
            </h2>
            {reviews.length > 0 && (
              <div className="flex items-center px-6 justify-center ">
                <StarRating rating={averageRating} hideScore={true} />
                <span className="text-gray-600 mt-2 ml-1 ">
                  ({reviews.length}{" "}
                  {reviews.length === 1 ? "review" : "reviews"})
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-4 px-6">
        {reviews.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Reviews Yet
            </h3>
            <p className="text-gray-600">
              This instructor hasn't received any reviews yet.
            </p>
          </div>
        ) : (
          reviews.map((review: Review) => (
            <ReviewCard key={review._id} review={review} />
          ))
        )}
      </div>

      {/* Load More Button (if needed for pagination) */}
      {reviews.length > 0 && (
        <div className="mt-8 text-center">
          <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            Load More Reviews
          </button>
        </div>
      )}
    </div>
  );
};

export default InstructorReviews;
export type {
  Review,
  Student,
  Instructor,
  InstructorReviewsProps,
  StarRatingProps,
  ReviewCardProps,
};
