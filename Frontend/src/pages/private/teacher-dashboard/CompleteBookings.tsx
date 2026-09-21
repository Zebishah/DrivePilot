import { useEffect } from "react";
import type React from "react";
import { useQuery } from "@apollo/client";
import { CalendarCheck2, MessageSquare } from "lucide-react";
import { GET_COMPLETED_STUDENT_BOOKINGS } from "../../../graphql/mutations/studentBooking";
import { StudentBooking } from "../../../types/Bookings";
import { Link } from "react-router-dom";
import { DashboardCard, DashboardPageHeader, DashboardLoadingSkeleton } from "../../../components/dashboard/OverviewWidgets";

const StudentFeedback: React.FC = () => {
  const { data, loading, error, refetch } = useQuery(GET_COMPLETED_STUDENT_BOOKINGS, {
    fetchPolicy: "cache-and-network",
  });

  useEffect(() => {
    void refetch();
  }, [refetch]);

  if (loading && !data) return <DashboardLoadingSkeleton rows={5} />;

  if (error) {
    return (
      <div className="dsp-instructor-page dsp-feedback-page">
        <div className="dsp-instructor-page__content">
          <DashboardPageHeader title="Feedback" description="Review completed lessons and keep your student notes up to date." />
          <DashboardCard className="dsp-page-error">
            <h2>We couldn’t load completed lessons</h2>
            <p>Try again to refresh the feedback queue.</p>
            <button type="button" className="dsp-dashboard-button dsp-dashboard-button--primary" onClick={() => refetch()}>Try again</button>
          </DashboardCard>
        </div>
      </div>
    );
  }

  const completedBookings: StudentBooking[] = data?.getCompletedStudentBookings || [];

  return (
    <div className="dsp-instructor-page dsp-feedback-page">
      <div className="dsp-instructor-page__content">
        <DashboardPageHeader title="Feedback" description="Review completed lessons and keep your student notes up to date." />
        <DashboardCard className="dsp-feedback-page__section">
          <div className="dsp-list-heading">
            <div><span className="dsp-list-heading__eyebrow">Completed lessons</span><h2>Give feedback</h2></div>
            <CalendarCheck2 size={20} aria-hidden="true" />
          </div>
          {completedBookings.length === 0 ? (
            <div className="dsp-page-empty"><CalendarCheck2 size={28} aria-hidden="true" /><h3>No completed lessons available</h3><p>Lessons will appear here automatically once they are completed.</p></div>
          ) : (
            <div className="dsp-table-wrap">
              <table className="dsp-data-table">
                <thead><tr><th>Student</th><th>Lesson</th><th>Amount</th><th>Date & time</th><th>Status</th><th className="dsp-data-table__actions">Action</th></tr></thead>
                <tbody>
                  {completedBookings.flatMap((booking) => booking.slots.map((slot, index) => (
                    <tr key={`${slot._id}-${index}`}>
                      <td><div className="dsp-table-person"><span className="dsp-table-person__avatar">{booking.studentId?.profileImage ? <img src={booking.studentId.profileImage} alt="" /> : `${booking.studentId?.firstName?.[0] || "S"}${booking.studentId?.lastName?.[0] || ""}`}</span><span>{booking.studentId?.firstName} {booking.studentId?.lastName}</span></div></td>
                      <td>Lesson {booking._id.slice(-1)}</td>
                      <td className="dsp-data-table__amount">CHF {booking.finalAmount}</td>
                      <td>{slot.date}<small>{slot.startTime} – {slot.endTime}</small></td>
                      <td><span className={`dsp-status-pill dsp-status-pill--${slot.feedBackStatus === "completed" ? "success" : "warning"}`}>{slot.feedBackStatus}</span></td>
                      <td className="dsp-data-table__actions"><Link className="dsp-dashboard-button dsp-dashboard-button--secondary" to={`/teacher-dashboard/feedbackForm/${booking._id}/${slot._id}/${booking.studentId?._id}`}>{slot.feedBackStatus === "pending" ? "Give feedback" : "View feedback"}</Link></td>
                    </tr>
                  )))}
                </tbody>
              </table>
            </div>
          )}
        </DashboardCard>

        <DashboardCard className="dsp-feedback-page__section">
          <div className="dsp-list-heading"><div><span className="dsp-list-heading__eyebrow">Student responses</span><h2>Feedback from students</h2></div><MessageSquare size={20} aria-hidden="true" /></div>
          <div className="dsp-page-empty dsp-page-empty--compact"><p>Student feedback will appear here once the feature is available.</p></div>
        </DashboardCard>
      </div>
    </div>
  );
};

export default StudentFeedback;
