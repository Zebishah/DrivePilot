import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Star, ArrowLeft, Sparkles } from "lucide-react";
import {
  CreateReviewInput,
  UpdateReviewInput,
  StudentBookingSlot,
} from "../../../types/ReviewTypes";
import {
  useCreateReview,
  useUpdateReview,
  useReviewByLessonSlot,
} from "../../../hooks/UseReview";
import { BackButton } from "../../InstructorComponent/common/BackButton";

const ReviewFormPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { slot, isEdit } = location.state as {
    slot: StudentBookingSlot;
    isEdit: boolean;
  };

  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { createReview, loading: createLoading } = useCreateReview();
  const { updateReview, loading: updateLoading } = useUpdateReview();
  const {
    review: existingReview,
    loading: reviewLoading,
    refetch: refetchExistingReview,
  } = useReviewByLessonSlot(slot?.lessonId || "", slot?.slotId || "");

  useEffect(() => {
    if (isEdit && slot) {
      refetchExistingReview();
    }
  }, [isEdit, slot, refetchExistingReview]);

  useEffect(() => {
    if (isEdit && existingReview) {
      setRating(existingReview.reviewRating || 0);
      setReviewText(existingReview.reviewDescription || "");
    }
  }, [isEdit, existingReview]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (rating === 0) {
      alert("Please select a rating");
      return;
    }

    if (!reviewText.trim()) {
      alert("Please write a review");
      return;
    }

    if (!slot) {
      alert("Slot information is missing");
      return;
    }

    setIsSubmitting(true);

    try {
      const reviewData = {
        reviewRating: rating,
        reviewDescription: reviewText.trim(),
        ...(isEdit
          ? {}
          : {
              lessonId: slot.lessonId,
              slotId: slot.slotId,
              studentId: slot.studentId,
              instructorId: slot.instructorId,
            }),
      };

      if (isEdit && existingReview) {
        await updateReview({
          variables: {
            reviewId: existingReview._id,
            input: reviewData as UpdateReviewInput,
          },
        });
      } else {
        await createReview({
          variables: {
            input: reviewData as CreateReviewInput,
          },
        });
      }

      // Navigate to review display page to show the submitted review
      navigate("/student-dashboard/review-display", {
        state: {
          slot,
          showSuccessMessage: true,
        },
      });
    } catch (error) {
      console.error("Error submitting review:", error);
      alert("Failed to submit review. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate(-1); // Go back to previous page
  };

  const generateWithAI = () => {
    const aiSuggestions = [
      "Great lesson! The instructor was very knowledgeable and patient. I learned a lot and feel more confident about my skills.",
      "Excellent teaching style and clear explanations. The instructor made complex topics easy to understand.",
      "Very professional and well-organized lesson. The instructor provided valuable feedback and tips.",
      "Amazing experience! The instructor was encouraging and helped me overcome my challenges.",
      "Outstanding lesson with practical examples. The instructor's expertise really showed.",
    ];

    const randomSuggestion =
      aiSuggestions[Math.floor(Math.random() * aiSuggestions.length)];
    setReviewText(randomSuggestion);
  };

  if (!slot) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">No slot information available</p>
          <button
            onClick={() => navigate("/student-dashboard/reviews")}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }
  console.log("slot", slot);
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <BackButton variant="outline" showIcon={true} />
      <div className=" mx-auto mt-3">
        <div className="bg-white rounded-lg shadow-xl">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">
                {isEdit ? "Edit Review" : "Give Review"}
              </h2>
              <button
                onClick={handleCancel}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <ArrowLeft size={24} />
              </button>
            </div>
          </div>

          {/* Instructor Info */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                {slot.profileImage ? (
                  <img
                    src={slot.profileImage}
                    alt={slot.profileImage}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-white font-bold text-lg">
                    {slot.instructorName
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </span>
                )}
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {slot.instructorName}
                </h3>
                <p className="text-gray-600">Instructor</p>
              </div>
            </div>
          </div>

          {/* Review Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Star Rating */}
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Give Star Rating
              </h3>
              <div className="flex justify-center space-x-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                    className="transition-colors duration-200"
                  >
                    <Star
                      size={32}
                      className={`${
                        star <= (hoveredRating || rating)
                          ? "text-yellow-400 fill-yellow-400"
                          : "text-gray-300"
                      }`}
                    />
                  </button>
                ))}
              </div>
              {rating > 0 && (
                <p className="text-sm text-gray-600 mt-2">
                  You rated {rating} out of 5 stars
                </p>
              )}
            </div>

            {/* Review Text */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-lg font-semibold text-gray-900">
                  Give Review
                </label>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={generateWithAI}
                    className="inline-flex items-center px-3 py-1 text-sm text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <Sparkles size={16} className="mr-1" />
                    Generate Using AI
                  </button>
                </div>
              </div>
              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Write Here"
                rows={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                required
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={handleCancel}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={
                  isSubmitting ||
                  createLoading ||
                  updateLoading ||
                  reviewLoading ||
                  rating === 0
                }
                className="px-8 py-3 bg-teal-500 text-white rounded-lg hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
              >
                {isSubmitting ? "Submitting..." : "Submit"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ReviewFormPage;
