import React, { useEffect, useRef, useState } from "react";
import { CalendarDays, CheckCircle2, Clock3, Edit3, Star, Trash2, UserRound, X } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { StudentBookingSlot } from "../../../types/ReviewTypes";
import { useDeleteReview, useReviewByLessonSlot } from "../../../hooks/UseReview";
import DashboardBackLink from "../../../components/dashboard/DashboardBackLink";
import { DashboardCard, DashboardLoadingSkeleton } from "../../../components/dashboard/OverviewWidgets";
import { ErrorState } from "../../../components/dashboard/DashboardStates";
import StatusBadge from "../../../components/dashboard/StatusBadge";

const ratingLabels: Record<number, string> = {
  1: "Poor",
  2: "Fair",
  3: "Good",
  4: "Very good",
  5: "Excellent",
};

const formatDateTime = (value?: string | number | null) => {
  if (!value) return "Date unavailable";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Date unavailable";
  return parsed.toLocaleString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const formatLessonDate = (slot?: StudentBookingSlot) => {
  if (!slot?.slotDetails?.date) return "Date unavailable";
  const parsed = new Date(`${slot.slotDetails.date}T00:00:00`);
  return Number.isNaN(parsed.getTime())
    ? slot.slotDetails.date
    : parsed.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
};

const initialsFor = (name: string) => name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();

const ReviewDeleteDialog: React.FC<{
  instructorName: string;
  isLoading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}> = ({ instructorName, isLoading, onCancel, onConfirm }) => {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isLoading) onCancel();
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>("button:not([disabled])"));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isLoading, onCancel]);

  return (
    <div className="dsp-review-delete-modal" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !isLoading) onCancel(); }}>
      <div className="dsp-review-delete-modal__dialog" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="delete-review-title" aria-describedby="delete-review-description">
        <div className="dsp-review-delete-modal__header">
          <div className="dsp-review-delete-modal__icon" aria-hidden="true"><Trash2 size={20} /></div>
          <button type="button" className="dsp-review-delete-modal__close" onClick={onCancel} disabled={isLoading} aria-label="Close delete review dialog"><X size={18} /></button>
        </div>
        <h2 id="delete-review-title">Delete review?</h2>
        <p id="delete-review-description">This will permanently remove your review for {instructorName}.</p>
        <div className="dsp-review-delete-modal__actions">
          <button ref={cancelRef} type="button" className="dsp-student-secondary-button" onClick={onCancel} disabled={isLoading}>Cancel</button>
          <button type="button" className="dsp-review-delete-button" onClick={onConfirm} disabled={isLoading}>{isLoading ? "Deleting…" : "Delete review"}</button>
        </div>
      </div>
    </div>
  );
};

const ReviewDisplayPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state || {}) as { slot?: StudentBookingSlot; showSuccessMessage?: boolean };
  const slot = state.slot;
  const reviewsPath = "/student-dashboard/reviews";
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [successVisible, setSuccessVisible] = useState(Boolean(state.showSuccessMessage));
  const deleteTriggerRef = useRef<HTMLButtonElement>(null);
  const hadDeleteModalOpen = useRef(false);

  const { deleteReview, loading: deleteLoading } = useDeleteReview();
  const {
    review: existingReview,
    loading: reviewLoading,
    error: reviewError,
    refetch: refetchExistingReview,
  } = useReviewByLessonSlot(slot?.lessonId || "", slot?.slotId || "");

  const instructorName = existingReview?.instructorId
    ? `${existingReview.instructorId.firstName} ${existingReview.instructorId.lastName}`.trim()
    : slot?.instructorName || "Instructor";
  const instructorImage = existingReview?.instructorId?.profileImage || slot?.profileImage;
  const rating = Math.max(0, Math.min(5, Math.round(existingReview?.reviewRating || 0)));
  const lessonDate = formatLessonDate(slot);
  const lessonTime = slot?.slotDetails?.startTime && slot.slotDetails.endTime
    ? `${slot.slotDetails.startTime} – ${slot.slotDetails.endTime}`
    : "Time unavailable";

  useEffect(() => {
    if (successVisible) {
      const timer = window.setTimeout(() => setSuccessVisible(false), 5000);
      return () => window.clearTimeout(timer);
    }
  }, [successVisible]);

  useEffect(() => {
    if (showDeleteModal) {
      hadDeleteModalOpen.current = true;
    } else if (hadDeleteModalOpen.current) {
      hadDeleteModalOpen.current = false;
      deleteTriggerRef.current?.focus();
    }
  }, [showDeleteModal]);

  const handleEdit = () => {
    if (!slot) return;
    navigate("/student-dashboard/review-form", { state: { slot, isEdit: true } });
  };

  const handleDeleteConfirm = async () => {
    if (!existingReview) return;
    setDeleteError(null);
    try {
      await deleteReview({ variables: { reviewId: existingReview._id } });
      toast.success("Review deleted");
      navigate(reviewsPath, { state: { message: "Review deleted successfully." } });
    } catch {
      setDeleteError("We couldn’t delete your review. Please try again.");
      toast.error("Review could not be deleted");
    }
  };

  if (!slot) {
    return (
      <div className="dsp-student-page dsp-student-review-detail-page">
        <div className="dsp-student-page__content">
          <DashboardBackLink to={reviewsPath} label="Back to reviews" />
          <DashboardCard className="dsp-review-detail-state"><UserRound size={24} aria-hidden="true" /><h1>Review not found</h1><p>This review may have been removed.</p><Link to={reviewsPath} className="dsp-student-secondary-button">Back to reviews</Link></DashboardCard>
        </div>
      </div>
    );
  }

  if (reviewLoading) {
    return <div className="dsp-student-page dsp-student-review-detail-page"><div className="dsp-student-page__content"><DashboardBackLink to={reviewsPath} label="Back to reviews" /><DashboardLoadingSkeleton rows={4} /></div></div>;
  }

  if (reviewError) {
    return (
      <div className="dsp-student-page dsp-student-review-detail-page">
        <div className="dsp-student-page__content">
          <DashboardBackLink to={reviewsPath} label="Back to reviews" />
          <DashboardCard className="dsp-review-detail-state"><ErrorState title="We couldn’t load this review" description="Refresh the review or return to Reviews & Ratings." /><div className="dsp-review-detail-state__actions"><button type="button" className="dsp-student-primary-button" onClick={() => refetchExistingReview()}>Try again</button><Link to={reviewsPath} className="dsp-student-secondary-button">Back to reviews</Link></div></DashboardCard>
        </div>
      </div>
    );
  }

  if (!existingReview) {
    return (
      <div className="dsp-student-page dsp-student-review-detail-page">
        <div className="dsp-student-page__content">
          <DashboardBackLink to={reviewsPath} label="Back to reviews" />
          <DashboardCard className="dsp-review-detail-state"><UserRound size={24} aria-hidden="true" /><h1>Review not found</h1><p>This review may have been removed.</p><Link to={reviewsPath} className="dsp-student-secondary-button">Back to reviews</Link></DashboardCard>
        </div>
      </div>
    );
  }

  return (
    <div className="dsp-student-page dsp-student-review-detail-page">
      <div className="dsp-student-page__content">
        <DashboardBackLink to={reviewsPath} label="Back to reviews" />
        <header className="dsp-review-detail-page-header">
          <span className="dsp-student-page-heading__eyebrow">Student workspace</span>
          <h1>Your review</h1>
          <p>Review submitted for your completed lesson.</p>
        </header>

        <DashboardCard className="dsp-review-detail-card">
          <header className="dsp-review-detail-card__header">
            <div className="dsp-review-detail-card__identity">
              <span className="dsp-review-detail-card__avatar">{instructorImage ? <img src={instructorImage} alt="" /> : <span>{initialsFor(instructorName) || <UserRound size={22} aria-hidden="true" />}</span>}</span>
              <div><span className="dsp-review-detail-card__eyebrow">Instructor</span><h2>{instructorName}</h2><p>Lesson completed · {lessonDate}</p></div>
            </div>
            <button type="button" className="dsp-review-edit-button" onClick={handleEdit}><Edit3 size={16} aria-hidden="true" /> Edit review</button>
          </header>

          <div className="dsp-review-detail-card__lesson">
            <div><CalendarDays size={17} aria-hidden="true" /><span><small>Reviewed lesson</small><strong>{lessonDate}</strong></span></div>
            <div><Clock3 size={17} aria-hidden="true" /><span><small>Time</small><strong>{lessonTime}</strong></span></div>
            <StatusBadge tone="success"><CheckCircle2 size={14} aria-hidden="true" /> Completed</StatusBadge>
            <Link to={`/student-dashboard/lesson/${slot.lessonId}`} className="dsp-review-lesson-link">View lesson</Link>
          </div>

          <section className="dsp-review-detail-card__section dsp-review-detail-card__rating" aria-labelledby="review-rating-title">
            <span className="dsp-review-detail-card__eyebrow">Your rating</span>
            <h2 id="review-rating-title">{rating}.0 / 5</h2>
            <div className="dsp-review-detail-stars" aria-label={`${rating} out of 5 stars`}>
              {Array.from({ length: 5 }, (_, index) => <Star key={index} size={30} fill={index < rating ? "currentColor" : "none"} aria-hidden="true" />)}
            </div>
            <strong>{ratingLabels[rating] || "Rating unavailable"}</strong>
          </section>

          <section className="dsp-review-detail-card__section" aria-labelledby="review-text-title">
            <span className="dsp-review-detail-card__eyebrow">Your review</span>
            <h2 id="review-text-title">What you shared</h2>
            <div className="dsp-review-detail-card__quote"><p>{existingReview.reviewDescription || "No written review was provided."}</p></div>
          </section>

          <footer className="dsp-review-detail-card__footer">
            <div className="dsp-review-detail-card__metadata"><span>Submitted</span><strong>{formatDateTime(existingReview.createdAt)}</strong>{existingReview.updatedAt !== existingReview.createdAt && <><span>Last edited</span><strong>{formatDateTime(existingReview.updatedAt)}</strong></>}</div>
            <button ref={deleteTriggerRef} type="button" className="dsp-review-delete-link" onClick={() => setShowDeleteModal(true)} disabled={deleteLoading}><Trash2 size={15} aria-hidden="true" /> Delete review</button>
          </footer>
          {deleteError && <p className="dsp-review-detail-card__error" role="alert">{deleteError}</p>}
        </DashboardCard>
      </div>
      {successVisible && <div className="dsp-review-detail-success" role="status"><CheckCircle2 size={16} aria-hidden="true" /> Review submitted successfully.</div>}
      {showDeleteModal && <ReviewDeleteDialog instructorName={instructorName} isLoading={deleteLoading} onCancel={() => setShowDeleteModal(false)} onConfirm={handleDeleteConfirm} />}
    </div>
  );
};

export default ReviewDisplayPage;
