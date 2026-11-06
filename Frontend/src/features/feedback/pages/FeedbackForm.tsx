import React, { useState } from "react";
import { CalendarDays, CheckCircle2, Clock3, Edit3, Trash2, UserRound } from "lucide-react";
import { useParams } from "react-router-dom";

import { useFeedback } from "../../../hooks/UseFeedBack";
import { SkillsDropdown } from "../components/SkillsDropdown";
import { FormInput } from "../components/FormInput";
import { ActionButtons } from "../components/ActionButtons";
import { DeleteModal } from "../components/DeleteModal";
import { RichTextEditor } from "../components/RichTextEditor";
import DashboardBackLink from "../../../components/dashboard/DashboardBackLink";
import { DashboardLoadingSkeleton } from "../../../components/dashboard/OverviewWidgets";

const formatLessonDate = (date?: string) => {
  if (!date) return "Date unavailable";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
};

const formatStatus = (status?: string) => {
  if (!status) return "Status unavailable";
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
};

const FeedbackForm: React.FC = () => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const { lessonId } = useParams<{ lessonId: string }>();

  const {
    viewMode,
    formData,
    setFormData,
    validationErrors,
    clearValidationError,
    isLoading,
    isStudentLoading,
    isSubmitting,
    isDeleting,
    booking,
    bookingLoading,
    bookingError,
    refetchBooking,
    handleCreate,
    handleUpdate,
    handleDelete,
    handleEdit,
    handleCancelEdit,
    handleCancel,
  } = useFeedback();

  const isReadOnly = viewMode === "view";
  const student = booking?.studentId;
  const currentSlot = booking?.slots?.find((slot: { _id: string }) => slot._id === lessonId) || booking?.slots?.[0];
  const studentName = [student?.firstName, student?.lastName].filter(Boolean).join(" ");
  const hasBookingContext = Boolean(booking && (student || currentSlot));

  const handleSkillToggle = (skillValue: string) => {
    if (isReadOnly) return;
    clearValidationError("skills");
    setFormData((prev) => ({
      ...prev,
      skills: prev.skills.includes(skillValue)
        ? prev.skills.filter((skill) => skill !== skillValue)
        : [...prev.skills, skillValue],
    }));
  };

  const handleHoursChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (isReadOnly) return;
    clearValidationError("hoursRemaining");
    setFormData((prev) => ({ ...prev, hoursRemaining: event.target.value }));
  };

  const handlePointsChange = (value: string) => {
    if (isReadOnly) return;
    clearValidationError("pointsToWorkOn");
    setFormData((prev) => ({ ...prev, pointsToWorkOn: value }));
  };

  if (isLoading || isStudentLoading || bookingLoading) {
    return (
      <div className="dsp-instructor-page dsp-feedback-form-page">
        <div className="dsp-feedback-form-page__content">
          <DashboardLoadingSkeleton rows={4} />
        </div>
      </div>
    );
  }

  if (bookingError || !hasBookingContext) {
    return (
      <div className="dsp-instructor-page dsp-feedback-form-page">
        <div className="dsp-feedback-form-page__content">
          <DashboardBackLink to="/teacher-dashboard/feedback" label="Back to feedback" />
          <section className="dsp-feedback-error" role="alert">
            <span className="dsp-feedback-error__icon"><UserRound size={22} aria-hidden="true" /></span>
            <h1>We couldn’t load this lesson</h1>
            <p>Refresh the lesson context and try again, or return to the feedback queue.</p>
            <div className="dsp-feedback-error__actions">
              <button type="button" className="dsp-dashboard-button dsp-dashboard-button--primary" onClick={() => void refetchBooking()}>Try again</button>
              <DashboardBackLink to="/teacher-dashboard/feedback" label="Back to feedback" />
            </div>
          </section>
        </div>
      </div>
    );
  }

  const title = viewMode === "create" ? "Give feedback" : viewMode === "edit" ? "Edit feedback" : "Feedback details";
  const description = viewMode === "view"
    ? "Review the lesson guidance recorded for this student."
    : "Record what was covered and what the student should focus on next.";

  return (
    <div className="dsp-instructor-page dsp-feedback-form-page">
      <div className="dsp-feedback-form-page__content">
        <DashboardBackLink to="/teacher-dashboard/feedback" label="Back to feedback" />

        <header className="dsp-feedback-form-page__header">
          <div>
            <span className="dsp-dashboard-page-header__eyebrow">Lesson feedback</span>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>
          {viewMode === "view" && (
            <div className="dsp-feedback-form-page__header-actions">
              <button type="button" className="dsp-feedback-icon-button" onClick={handleEdit} aria-label="Edit feedback" title="Edit feedback"><Edit3 size={17} /></button>
              <button type="button" className="dsp-feedback-icon-button dsp-feedback-icon-button--danger" onClick={() => setShowDeleteModal(true)} aria-label="Delete feedback" title="Delete feedback"><Trash2 size={17} /></button>
            </div>
          )}
        </header>

        <section className="dsp-feedback-context" aria-label="Lesson context">
          <div className="dsp-feedback-context__student">
            <span className="dsp-feedback-context__avatar">
              {student?.profileImage ? <img src={student.profileImage} alt="" /> : <UserRound size={21} aria-hidden="true" />}
            </span>
            <div>
              <span className="dsp-feedback-context__eyebrow">Student</span>
              <strong>{studentName || "Student name unavailable"}</strong>
              <span>{student?.email || "Student contact unavailable"}</span>
            </div>
          </div>
          <div className="dsp-feedback-context__details">
            <div><CalendarDays size={17} aria-hidden="true" /><span><small>Lesson date</small><strong>{formatLessonDate(currentSlot?.date)}</strong></span></div>
            <div><Clock3 size={17} aria-hidden="true" /><span><small>Time</small><strong>{currentSlot?.startTime || "Time unavailable"}{currentSlot?.endTime ? ` – ${currentSlot.endTime}` : ""}</strong></span></div>
            <div><CheckCircle2 size={17} aria-hidden="true" /><span><small>Lesson status</small><strong>{formatStatus(currentSlot?.status || booking?.status)}</strong></span></div>
          </div>
        </section>

        <section className="dsp-feedback-form-card">
          <div className="dsp-feedback-form-card__header">
            <div>
              <span className="dsp-feedback-form-card__eyebrow">Feedback details</span>
              <h2>Lesson progress</h2>
              <p>Capture the skills practiced and the next useful step for the student.</p>
            </div>
          </div>

          <div className="dsp-feedback-form-card__body">
            <div className="dsp-feedback-form__fields">
              <SkillsDropdown
                selectedSkills={formData.skills}
                onSkillToggle={handleSkillToggle}
                disabled={isReadOnly}
                label="Skills worked on"
                error={validationErrors.skills}
              />
              <FormInput
                label="Remaining learning hours"
                value={formData.hoursRemaining}
                onChange={handleHoursChange}
                disabled={isReadOnly}
                type="number"
                min={0}
                step={0.5}
                placeholder="0"
                helperText="Update the estimated hours still required for this student."
                error={validationErrors.hoursRemaining}
              />
            </div>

            <RichTextEditor
              value={formData.pointsToWorkOn}
              onChange={handlePointsChange}
              disabled={isReadOnly}
              label="Focus for the next lesson"
              placeholder="Write clear guidance for the student's next lesson..."
              error={validationErrors.pointsToWorkOn}
              showAIGenerate={!isReadOnly}
            />

            <ActionButtons
              viewMode={viewMode}
              isSubmitting={isSubmitting}
              onSubmit={handleCreate}
              onUpdate={handleUpdate}
              onCancel={handleCancel}
              onCancelEdit={handleCancelEdit}
            />
          </div>
        </section>
      </div>

      <DeleteModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        isLoading={isDeleting}
      />
    </div>
  );
};

export default FeedbackForm;
