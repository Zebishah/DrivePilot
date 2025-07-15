import React from "react";
import { Review } from "../../../types/ReviewTypes";

interface ReviewsListProps {
  reviews: Review[];
  title: string;
}

const ReviewsList: React.FC<ReviewsListProps> = ({ reviews, title }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span
          key={i}
          className={`text-sm ${i <= rating ? "text-yellow-400" : "text-gray-300"}`}
        >
          ★
        </span>
      );
    }
    return stars;
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
      </div>
      <div className="max-h-96 overflow-y-auto">
        {reviews.length === 0 ? (
          <div className="p-6 text-center text-gray-500">No reviews found.</div>
        ) : (
          <div className="divide-y divide-gray-200">
            {reviews.map((review) => (
              <div key={review._id} className="p-6">
                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                    {review.studentId.firstName.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-gray-900">
                        {review.studentId.firstName} {review.studentId.lastName}
                      </h4>
                      <span className="text-sm text-gray-500">
                        {formatDate(review.createdAt)}
                      </span>
                    </div>
                    <div className="flex items-center mt-1">
                      {renderStars(review.reviewRating || 0)}
                      <span className="ml-2 text-sm text-gray-600">
                        ({review.reviewRating || 0}/5)
                      </span>
                    </div>
                    <p className="mt-2 text-gray-700">
                      {review.reviewDescription}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewsList;
