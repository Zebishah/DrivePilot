import React, { useState, useEffect } from "react";
import { useQuery } from "@apollo/client";
import { gql } from "@apollo/client";
import { BarChart3, MessageCircle, Star, User } from "lucide-react";
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
    const parsedDate = /^\d+$/.test(String(date)) ? new Date(Number(date)) : new Date(date);
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

  return (
    <article className="dsp-review-card">
      <div className="dsp-review-card__avatar">
          {review.studentId?.profileImage ? (
            <img
              src={review.studentId.profileImage}
              alt={`${review.studentId.firstName} ${review.studentId.lastName}`}
              className="dsp-review-card__image"
            />
          ) : (
            <div className="dsp-review-card__fallback">
              <span>
                {getInitials(
                  review.studentId?.firstName,
                  review.studentId?.lastName
                )}
              </span>
            </div>
          )}
        </div>
        <div className="dsp-review-card__content">
          <div className="dsp-review-card__header">
            <div>
              <h4>
                {review.studentId?.firstName} {review.studentId?.lastName}
              </h4>
              <div className="dsp-review-card__rating"><StarRating rating={review.reviewRating} count={1} /></div>
            </div>
            <time>
              {formatDate(review.createdAt)}
            </time>
          </div>
          <p>
            {review.reviewDescription}
          </p>
        </div>
    </article>
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
  const ratingDistribution = [5, 4, 3, 2, 1].map((rating) => ({
    rating,
    count: reviews.filter((review) => Math.round(review.reviewRating) === rating).length,
  }));

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
    <section className="dsp-reviews-panel">
      <div className="dsp-reviews-panel__summary">
        <div className="dsp-reviews-panel__score"><span>Average rating</span><strong>{reviews.length ? averageRating.toFixed(1) : "—"}</strong><div><StarRating rating={averageRating} hideScore={true} /></div><small>{reviews.length} {reviews.length === 1 ? "review" : "reviews"}</small></div>
        <div className="dsp-reviews-panel__distribution"><div className="dsp-reviews-panel__distribution-title"><span>Rating distribution</span><BarChart3 size={18} aria-hidden="true" /></div>{ratingDistribution.map((item) => <div className="dsp-rating-row" key={item.rating}><span>{item.rating}<Star size={12} fill="currentColor" /></span><div><i style={{ width: `${reviews.length ? (item.count / reviews.length) * 100 : 0}%` }} /></div><strong>{item.count}</strong></div>)}</div>
        <div className="dsp-reviews-panel__note"><MessageCircle size={20} /><span>Student voices</span><strong>{reviews.length ? "Keep the conversation going" : "Your first review will appear here"}</strong></div>
      </div>
      <div className="dsp-reviews-panel__list">
        {reviews.length === 0 ? (
          <div className="dsp-review-empty"><span><User size={22} /></span><h3>No reviews yet</h3><p>Student ratings and written feedback will appear here after completed lessons.</p></div>
        ) : reviews.map((review) => <ReviewCard key={review._id} review={review} />)}
      </div>
    </section>
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
