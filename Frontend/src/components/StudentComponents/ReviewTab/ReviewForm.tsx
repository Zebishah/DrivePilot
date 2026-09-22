import React, { useEffect, useState } from "react";
import { CalendarDays, CheckCircle2, Sparkles, Star, UserRound } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { StudentBookingSlot } from "../../../types/ReviewTypes";
import { useCreateReview, useReviewByLessonSlot, useUpdateReview } from "../../../hooks/UseReview";
import DashboardBackLink from "../../../components/dashboard/DashboardBackLink";
import { DashboardLoadingSkeleton } from "../../../components/dashboard/OverviewWidgets";

const ratingLabels: Record<number, string> = {
  1: "Poor",
  2: "Fair",
  3: "Good",
  4: "Very good",
  5: "Excellent",
};

const formatDate = (value?: string) => {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
};

const ReviewFormPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { slot?: StudentBookingSlot; isEdit?: boolean } | undefined;
  const slot = state?.slot;
  const isEdit = Boolean(state?.isEdit);
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [aiMessage] = useState("Review drafting assistance is not available yet.");

  const { createReview, loading: createLoading } = useCreateReview();
  const { updateReview, loading: updateLoading } = useUpdateReview();
  const { review: existingReview, loading: reviewLoading } = useReviewByLessonSlot(slot?.lessonId || "", slot?.slotId || "");

  useEffect(() => {
    if (isEdit && existingReview) {
      setRating(Math.round(existingReview.reviewRating || 0));
      setReviewText(existingReview.reviewDescription || "");
    }
  }, [existingReview, isEdit]);

  if (!slot) {
    return (
      <div className="dsp-student-page dsp-student-review-page">
        <div className="dsp-student-page__content">
          <DashboardBackLink to="/student-dashboard/reviews" label="Back to reviews" />
          <section className="dsp-student-review-error" role="alert">
            <span><UserRound size={22} aria-hidden="true" /></span>
            <h1>We couldn’t load this lesson</h1>
            <p>Return to your completed lessons and choose an eligible lesson to review.</p>
            <DashboardBackLink to="/student-dashboard/reviews" label="Back to completed lessons" />
          </section>
        </div>
      </div>
    );
  }

  const instructorName = slot.instructorName || "Instructor";
  const initials = instructorName.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const isBusy = isSubmitting || createLoading || updateLoading;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (rating < 1 || rating > 5) {
      setValidationError("Choose a rating from 1 to 5 stars.");
      return;
    }
    if (!reviewText.trim()) {
      setValidationError("Write a short review before submitting.");
      return;
    }
    if (!slot.isCompleted) {
      setValidationError("Reviews are available after a lesson is completed.");
      return;
    }
    if (isEdit && !existingReview) {
      setValidationError("This review is no longer available. Return to your reviews and try again.");
      return;
    }

    setValidationError(null);
    setIsSubmitting(true);
    try {
      const reviewData = {
        reviewRating: rating,
        reviewDescription: reviewText.trim(),
        ...(isEdit ? {} : {
          lessonId: slot.lessonId,
          slotId: slot.slotId,
          studentId: slot.studentId,
          instructorId: slot.instructorId,
        }),
      };

      if (isEdit && existingReview) {
        await updateReview({ variables: { reviewId: existingReview._id, input: reviewData } });
      } else {
        await createReview({ variables: { input: reviewData } });
      }

      toast.success(isEdit ? "Review updated" : "Review submitted");
      navigate("/student-dashboard/reviews");
    } catch (error) {
      console.error("Error submitting review:", error);
      setValidationError("We couldn’t submit your review. Your text is still here—please try again.");
      toast.error("Review could not be submitted");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (reviewLoading && isEdit) {
    return <div className="dsp-student-page dsp-student-review-page"><div className="dsp-student-page__content"><DashboardLoadingSkeleton rows={3} /></div></div>;
  }

  return (
    <div className="dsp-student-page dsp-student-review-page">
      <div className="dsp-student-page__content">
        <DashboardBackLink to="/student-dashboard/reviews" label="Back to completed lessons" />
        <header className="dsp-student-review-page__header">
          <div>
            <span className="dsp-student-page-heading__eyebrow">Instructor review</span>
            <h1>{isEdit ? "Edit your review" : "Review your instructor"}</h1>
            <p>Share your experience from this completed lesson.</p>
          </div>
        </header>

        <section className="dsp-student-review-context" aria-label="Instructor and lesson context">
          <div className="dsp-student-review-context__person">
            <span className="dsp-student-review-context__avatar">
              {slot.profileImage ? <img src={slot.profileImage} alt="" /> : initials || <UserRound size={22} aria-hidden="true" />}
            </span>
            <div>
              <span className="dsp-student-review-context__eyebrow">Instructor</span>
              <strong>{instructorName}</strong>
              <span>Lesson with your instructor</span>
            </div>
          </div>
          <div className="dsp-student-review-context__details">
            <div><CalendarDays size={17} aria-hidden="true" /><span><small>Lesson date</small><strong>{formatDate(slot.slotDetails?.date || slot.dateOfBooking)}</strong></span></div>
            <div><span><small>Time</small><strong>{slot.slotDetails?.startTime || "—"} – {slot.slotDetails?.endTime || "—"}</strong></span></div>
            <span className="dsp-student-review-context__status"><CheckCircle2 size={15} aria-hidden="true" /> Completed</span>
          </div>
        </section>

        <form className="dsp-student-review-card" onSubmit={handleSubmit}>
          <section className="dsp-student-review-rating" aria-labelledby="rating-heading">
            <span className="dsp-student-review-card__eyebrow">Your rating</span>
            <h2 id="rating-heading">How was your lesson?</h2>
            <p>Choose a rating based on your experience with this instructor.</p>
            <div className="dsp-student-review-stars" role="radiogroup" aria-label="Lesson rating">
              {[1, 2, 3, 4, 5].map((value) => (
                <label key={value} className={`dsp-student-review-star ${value <= rating ? "is-selected" : ""}`}>
                  <input type="radio" name="lesson-rating" value={value} checked={rating === value} onChange={() => { setRating(value); setValidationError(null); }} aria-label={`${value} star${value === 1 ? "" : "s"}`} />
                  <Star size={34} fill={value <= rating ? "currentColor" : "none"} aria-hidden="true" />
                </label>
              ))}
            </div>
            <strong className="dsp-student-review-rating__label" aria-live="polite">{rating ? ratingLabels[rating] : "Select a rating"}</strong>
          </section>

          <section className="dsp-student-review-text" aria-labelledby="review-heading">
            <div className="dsp-student-review-text__heading">
              <div>
                <span className="dsp-student-review-card__eyebrow">Your review</span>
                <h2 id="review-heading">Tell other students what stood out</h2>
                <p>Share what you liked about the lesson and your experience with the instructor.</p>
              </div>
              <button type="button" className="dsp-student-review-ai" disabled title={aiMessage}><Sparkles size={15} aria-hidden="true" /> Help me draft</button>
            </div>
            <textarea
              value={reviewText}
              onChange={(event) => { setReviewText(event.target.value); setValidationError(null); }}
              placeholder="Share what you liked about the lesson and your experience with the instructor..."
              aria-invalid={Boolean(validationError)}
              aria-describedby={validationError ? "review-form-error" : undefined}
              rows={7}
            />
          </section>

          {validationError && <p className="dsp-student-review-form-error" id="review-form-error" role="alert">{validationError}</p>}
          <footer className="dsp-student-review-card__footer">
            <button type="button" className="dsp-student-secondary-button" onClick={() => navigate("/student-dashboard/reviews")} disabled={isBusy}>Cancel</button>
            <button type="submit" className="dsp-student-primary-button" disabled={isBusy}>{isBusy ? "Submitting review..." : "Submit review"}</button>
          </footer>
        </form>
      </div>
    </div>
  );
};

export default ReviewFormPage;
