import React from "react";
import { StudentBookingSlot } from "../../../types/ReviewTypes";
import { useAuth } from "../../../context/AuthContext";
import { useBookingSlots } from "../../../hooks/ReviewSystem";
import { useStudentHoursProgress } from "../../../hooks/UseStudentHourProgress";
import { useDeleteReview, useInstructorReviews } from "../../../hooks/UseReview";
import { useNavigate } from "react-router-dom";
import StudentHoursProgressCard from "./StudentHourPercentage";
import BookingSlotsTable from "./BookingSlotTable";
import { NetworkStatus } from "@apollo/client";
import { BarChart3, BookOpenCheck, CalendarClock, Clock3 } from "lucide-react";
import { DashboardPageHeader, DashboardLoadingSkeleton } from "../../../components/dashboard/OverviewWidgets";

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const studentId = user?.id || "";

  const {
    bookingSlots,
    loading: slotsLoading,
    refetch: refetchSlots,
  } = useBookingSlots();

  const { hoursProgress, loading: progressLoading } =
    useStudentHoursProgress(studentId);

  const {
    loading: reviewsLoading,
    refetch: refetchReviews,
    networkStatus,
  } = useInstructorReviews(studentId);

  const { deleteReview } = useDeleteReview();
  const isRefetching = networkStatus === NetworkStatus.refetch;
  const handleAddReview = (
    slot: StudentBookingSlot,
    isFeedbackRating: boolean
  ) => {
    // Navigate to review form page with slot data
    navigate("/student-dashboard/review-form", {
      state: {
        slot,
        isEdit: false,
        isFeedbackRating: isFeedbackRating,
      },
    });
  };

  const handleEditReview = (slot: StudentBookingSlot) => {
    // Navigate to review form page with slot data for editing
    navigate("/student-dashboard/review-form", {
      state: {
        slot,
        isEdit: true,
        isFeedbackRating: false,
      },
    });
  };

  const handleShowReview = (slot: StudentBookingSlot) => {
    // Navigate to review display page with slot data
    navigate("/student-dashboard/review-display", {
      state: {
        slot,
        isFeedbackRating: false,
      },
    });
  };

  const handleDeleteReview = async (slot: StudentBookingSlot) => {
    if (window.confirm("Are you sure you want to delete this review?")) {
      try {
        // You'll need to get the review ID somehow - perhaps from the slot data
        // or make an API call to get the review first
        const reviewId = slot.reviewId; // Assuming reviewId is available in slot

        if (reviewId) {
          await deleteReview({
            variables: { reviewId },
          });

          // Refresh data
          refetchSlots();
          refetchReviews();
        }
      } catch (error) {
        console.error("Error deleting review:", error);
        alert("Failed to delete review. Please try again.");
      }
    }
  };

  if (slotsLoading || progressLoading || reviewsLoading) {
    return (
      <div className="dsp-student-page dsp-student-progress-page">
        <div className="dsp-student-page__content"><DashboardLoadingSkeleton rows={4} /></div>
      </div>
    );
  }

  const completedHours = Number(hoursProgress?.completedHours || 0);
  const remainingHours = Number(hoursProgress?.remainingHours || 0);
  const totalRequiredHours = Number(hoursProgress?.totalRequiredHours || completedHours + remainingHours);
  const progressPercent = totalRequiredHours > 0 ? Math.min(100, Math.round((completedHours / totalRequiredHours) * 100)) : 0;
  const daysSinceLastLesson = hoursProgress?.lastLessonDate
    ? Math.max(0, Math.floor((Date.now() - new Date(hoursProgress.lastLessonDate).setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24)))
    : null;

  return (
    <div className="dsp-student-page dsp-student-progress-page">
      <div className="dsp-student-page__content">
        <DashboardPageHeader eyebrow="Student workspace" title="Progress tracking" description="See the lesson hours and completed sessions recorded for your learning journey." />
        <div className="dsp-student-summary-grid dsp-student-summary-grid--four">
          <div className="dsp-student-summary-card dsp-student-summary-card--violet"><span className="dsp-student-summary-card__icon"><BookOpenCheck size={18} /></span><span>Completed hours</span><strong>{completedHours}</strong><small>Recorded lesson time</small></div>
          <div className="dsp-student-summary-card dsp-student-summary-card--blue"><span className="dsp-student-summary-card__icon"><Clock3 size={18} /></span><span>Hours remaining</span><strong>{remainingHours}</strong><small>Based on your current record</small></div>
          <div className="dsp-student-summary-card dsp-student-summary-card--green"><span className="dsp-student-summary-card__icon"><BarChart3 size={18} /></span><span>Progress</span><strong>{progressPercent}%</strong><small>Completed of recorded target</small></div>
          <div className="dsp-student-summary-card dsp-student-summary-card--amber"><span className="dsp-student-summary-card__icon"><CalendarClock size={18} /></span><span>Days since last lesson</span><strong>{daysSinceLastLesson ?? "—"}</strong><small>{daysSinceLastLesson === null ? "No completed lesson recorded" : "From your latest completed lesson"}</small></div>
        </div>
        <div className="dsp-student-progress-grid">
          <section className="dsp-student-panel dsp-student-progress-card">
            <div className="dsp-student-panel__header"><div><span className="dsp-student-panel__eyebrow">Learning record</span><h2>Your current progress</h2></div></div>
            {hoursProgress ? <StudentHoursProgressCard hoursProgress={hoursProgress} bookingSlots={bookingSlots} /> : <div className="dsp-student-empty-state"><BarChart3 size={24} /><strong>No progress data yet</strong><span>Progress will appear after your first recorded lesson.</span></div>}
          </section>
        </div>
        <section className="dsp-student-panel dsp-student-progress-bookings">
          <div className="dsp-student-panel__header"><div><span className="dsp-student-panel__eyebrow">Lesson history</span><h2>Review your completed sessions</h2></div></div>
          <BookingSlotsTable bookingSlots={bookingSlots} onAddReview={handleAddReview} onEditReview={handleEditReview} onDeleteReview={handleDeleteReview} onShowReview={handleShowReview} refetchSlots={refetchSlots} refetchReviews={refetchReviews} isRefetching={isRefetching} isFeedbackRating={false} />
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
