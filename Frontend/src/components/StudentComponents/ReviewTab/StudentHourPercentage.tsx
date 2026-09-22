import React from "react";
import { BookOpenCheck, CalendarClock, Clock3, Sparkles } from "lucide-react";

import {
  StudentBookingSlot,
  StudentHoursProgress,
} from "../../../types/ReviewTypes";

interface StudentHoursProgressCardProps {
  hoursProgress: StudentHoursProgress;
  bookingSlots: StudentBookingSlot[];
}

function daysSinceLastCompletedLesson(slots: StudentBookingSlot[]) {
  const completedDates = (slots || [])
    .filter((slot) => slot.isCompleted && slot.slotDetails?.date)
    .map((slot) => slot.slotDetails.date)
    .sort()
    .reverse();

  const lastLessonDate = completedDates[0];
  if (!lastLessonDate) return null;

  const [year, month, day] = lastLessonDate.split("-").map(Number);
  const lastLessonMidnight = new Date(year, month - 1, day);
  const today = new Date();
  const todayMidnight = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const diffDays = Math.max(
    0,
    Math.floor(
      (todayMidnight.getTime() - lastLessonMidnight.getTime()) /
        (1000 * 60 * 60 * 24),
    ),
  );

  return { daysSinceLastLesson: diffDays };
}

function formatHours(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

const ProgressRing: React.FC<{
  progress: number;
  completedHours: number;
  totalHours: number;
}> = ({ progress, completedHours, totalHours }) => {
  const size = 176;
  const strokeWidth = 13;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div
      className="dsp-student-learning-card__ring"
      role="img"
      aria-label={`${progress}% of tracked lesson hours completed`}
    >
      <svg viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <defs>
          <linearGradient
            id="dsp-student-progress-gradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="#7C3AED" />
            <stop offset="55%" stopColor="#A855F7" />
            <stop offset="100%" stopColor="#EC4899" />
          </linearGradient>
        </defs>
        <circle
          className="dsp-student-learning-card__ring-track"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
        />
        <circle
          className="dsp-student-learning-card__ring-value"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#dsp-student-progress-gradient)"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          strokeWidth={strokeWidth}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="dsp-student-learning-card__ring-label">
        <strong>{progress}%</strong>
        <span>
          {formatHours(completedHours)} of {formatHours(totalHours)} hrs
        </span>
        <small>completed</small>
      </div>
    </div>
  );
};

const StudentHoursProgressCard: React.FC<StudentHoursProgressCardProps> = ({
  hoursProgress,
  bookingSlots,
}) => {
  const completedHours = Math.max(0, Number(hoursProgress.completedHours) || 0);
  const remainingHours = Math.max(0, Number(hoursProgress.remainingHours) || 0);
  const totalTrackedHours = completedHours + remainingHours;
  const progress = totalTrackedHours > 0
    ? Math.min(100, Math.round((completedHours / totalTrackedHours) * 100))
    : 0;
  const lastLesson = daysSinceLastCompletedLesson(bookingSlots);
  const status = remainingHours === 0 && totalTrackedHours > 0
    ? "You've completed the current learning target."
    : completedHours > 0
      ? "You're making steady progress."
      : "Your learning journey is just getting started.";

  return (
    <article className="dsp-student-learning-card">
      <header className="dsp-student-learning-card__header">
        <div>
          <span className="dsp-student-panel__eyebrow">Learning record</span>
          <h2>Your current progress</h2>
          <p>Track completed hours, remaining hours, and your recent learning activity.</p>
        </div>
        <span className="dsp-student-learning-card__header-icon" aria-hidden="true">
          <Sparkles size={18} />
        </span>
      </header>

      <div className="dsp-student-learning-card__body">
        <section className="dsp-student-learning-card__overview" aria-label="Overall lesson progress">
          <div className="dsp-student-learning-card__overview-copy">
            <span className="dsp-student-learning-card__label">Overall progress</span>
            <h3>
              {formatHours(completedHours)} of {formatHours(totalTrackedHours)} hours completed
            </h3>
            <p>{status}</p>
          </div>
          <ProgressRing
            progress={progress}
            completedHours={completedHours}
            totalHours={totalTrackedHours}
          />
        </section>

        <section className="dsp-student-learning-card__metrics" aria-label="Lesson progress details">
          <div className="dsp-student-learning-card__metric dsp-student-learning-card__metric--green">
            <span className="dsp-student-learning-card__metric-icon" aria-hidden="true"><BookOpenCheck size={17} /></span>
            <div><span>Completed hours</span><strong>{formatHours(completedHours)} hrs</strong><small>Recorded lesson time</small></div>
          </div>
          <div className="dsp-student-learning-card__metric dsp-student-learning-card__metric--violet">
            <span className="dsp-student-learning-card__metric-icon" aria-hidden="true"><Clock3 size={17} /></span>
            <div><span>Remaining hours</span><strong>{formatHours(remainingHours)} hrs</strong><small>Based on your current record</small></div>
          </div>
          <div className="dsp-student-learning-card__metric dsp-student-learning-card__metric--amber">
            <span className="dsp-student-learning-card__metric-icon" aria-hidden="true"><CalendarClock size={17} /></span>
            <div><span>Time since last lesson</span><strong>{lastLesson ? `${lastLesson.daysSinceLastLesson} days` : "—"}</strong><small>{lastLesson ? "From your latest completed lesson" : "No completed lesson recorded"}</small></div>
          </div>
        </section>
      </div>

      <div className="dsp-student-learning-card__note">
        <span aria-hidden="true"><BookOpenCheck size={15} /></span>
        <span>Progress updates appear as your completed lessons are recorded.</span>
      </div>
    </article>
  );
};

export default StudentHoursProgressCard;
