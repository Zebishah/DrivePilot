import React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@apollo/client";
import { useAuth } from "../../../context/AuthContext";
import { GET_STUDENT_FEEDBACKS_LIST } from "../../../graphql/Queries/LessonFeedback";
import { DashboardPageHeader } from "../../../components/dashboard/OverviewWidgets";
import { DashboardLoadingSkeleton } from "../../../components/dashboard/OverviewWidgets";
import { MessageCircle, Star, ArrowUpRight } from "lucide-react";

type StudentFeedbackItem = {
  _id: string;
  lessonId: string;
  instructorId: string;
  instructorEmail: string;
  instructorName?: string;
  instructorProfileImage?: string;
  feedbackTags: string[];
  hoursRemaining: string;
  message: string;
  createdAt: string;
};

const FeedBackAndRating: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const studentId = user?.id || "";

  const { data, loading, error } = useQuery(GET_STUDENT_FEEDBACKS_LIST, {
    variables: { studentId },
    skip: !studentId,
    fetchPolicy: "network-only",
  });

  const feedbacks: StudentFeedbackItem[] = data?.getStudentFeedbacks || [];

  if (loading) {
    return (
      <div className="dsp-student-page dsp-student-feedback-page">
        <div className="dsp-student-page__content"><DashboardLoadingSkeleton rows={3} /></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dsp-student-page dsp-student-feedback-page">
        <div className="dsp-student-page__content"><div className="dsp-student-state dsp-student-state--error">Failed to load feedbacks. Please try again.</div></div>
      </div>
    );
  }

  return (
    <div className="dsp-student-page dsp-student-feedback-page">
      <div className="dsp-student-page__content">
        <DashboardPageHeader
          eyebrow="Student workspace"
          title="Instructor feedback"
          description="Review the guidance your instructors have shared after completed lessons."
          action={<button type="button" className="dsp-student-primary-button" onClick={() => navigate("/student-dashboard/chat")}><MessageCircle size={16} /> Message an instructor<ArrowUpRight size={15} /></button>}
        />
        <div className="dsp-student-summary-grid">
          <div className="dsp-student-summary-card dsp-student-summary-card--violet"><span className="dsp-student-summary-card__icon"><Star size={18} /></span><span>Instructor feedback</span><strong>{feedbacks.length}</strong><small>Notes shared after completed lessons</small></div>
          <div className="dsp-student-summary-card dsp-student-summary-card--blue"><span className="dsp-student-summary-card__icon"><MessageCircle size={18} /></span><span>Stay connected</span><strong>Open</strong><small>Message your instructor anytime</small></div>
        </div>
        <section className="dsp-student-panel">
          <div className="dsp-student-panel__header"><div><span className="dsp-student-panel__eyebrow">Instructor feedback</span><h2>Feedback from instructors</h2></div></div>
          <div className="dsp-student-table-wrap">
            <table className="dsp-student-table">
              <thead>
              <tr>
                <th>Lesson</th><th>Instructor</th><th>Date</th><th>Areas of improvement</th><th>Skills worked on</th><th>Action</th>
              </tr>
              </thead>
              <tbody>
              {feedbacks.map((feedback, idx) => (
                <tr key={feedback._id}>
                  <td><strong>Lesson {idx + 1}</strong></td>
                  <td>{feedback.instructorName || "Instructor"}</td>
                  <td>
                    {new Date(Number(feedback.createdAt)).toLocaleDateString(
                      "en-GB",
                    )}
                  </td>
                  <td className="dsp-student-table__truncate">
                    {feedback.message?.replace(/<[^>]+>/g, "").slice(0, 80)}
                  </td>
                  <td className="dsp-student-table__truncate">
                    {feedback.feedbackTags?.join(", ")}
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() =>
                        navigate("/student-dashboard/feedback-details", {
                          state: { feedback, lessonNumber: idx + 1 },
                        })
                      }
                      className="dsp-student-secondary-button"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
              </tbody>
            </table>
          </div>

          {feedbacks.length === 0 && (
            <div className="dsp-student-empty-state"><Star size={24} /><strong>No instructor feedback available yet</strong><span>Feedback from your instructors will appear here after a completed lesson.</span></div>
          )}
        </section>
      </div>
    </div>
  );
};

export default FeedBackAndRating;
