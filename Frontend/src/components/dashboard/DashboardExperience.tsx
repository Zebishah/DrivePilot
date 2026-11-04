import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  CreditCard,
  FileCheck2,
  GraduationCap,
  LayoutDashboard,
  Search,
  UsersRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import DrivingRoute from "../DrivingRoute";

type WorkspaceRole = "Student" | "Instructor" | "Admin";
type Step = { label: string; detail: string; to: string; icon: LucideIcon };
const experiences: Record<
  WorkspaceRole,
  {
    label: string;
    title: string;
    description: string;
    action: string;
    to: string;
    secondary: string;
    secondaryTo: string;
    steps: Step[];
  }
> = {
  Student: {
    label: "YOUR DRIVING LESSONS",
    title: "Learn to drive.\nStart with the right instructor.",
    description:
      "Find a driving instructor, book a lesson that fits your schedule, and keep your payments, messages, and learning progress together.",
    action: "Find a driving instructor",
    to: "/student-dashboard/search",
    secondary: "View my lessons",
    secondaryTo: "/student-dashboard/book",
    steps: [
      {
        label: "Find an instructor",
        detail: "Compare profiles and lesson options",
        to: "/student-dashboard/search",
        icon: Search,
      },
      {
        label: "Book your lessons",
        detail: "See your bookings and upcoming slots",
        to: "/student-dashboard/book",
        icon: CalendarDays,
      },
      {
        label: "Follow your progress",
        detail: "Lesson records and instructor feedback",
        to: "/student-dashboard/learning-timeline",
        icon: GraduationCap,
      },
    ],
  },
  Instructor: {
    label: "YOUR DRIVING INSTRUCTOR BUSINESS",
    title: "More time teaching.\nOne place to run your lessons.",
    description:
      "Help learners get on the road. Manage your lesson availability, students, bookings, feedback, and payment activity from your instructor account.",
    action: "Manage availability",
    to: "/teacher-dashboard/availability",
    secondary: "View bookings",
    secondaryTo: "/teacher-dashboard/bookingManagement",
    steps: [
      {
        label: "Offer lesson times",
        detail: "Keep your availability up to date",
        to: "/teacher-dashboard/availability",
        icon: CalendarDays,
      },
      {
        label: "Manage your students",
        detail: "See who you’re teaching next",
        to: "/teacher-dashboard/my-students",
        icon: UsersRound,
      },
      {
        label: "Give lesson feedback",
        detail: "Help every learner take the next step",
        to: "/teacher-dashboard/feedback",
        icon: ClipboardCheck,
      },
    ],
  },
  Admin: {
    label: "DRIVING SCHOOL MARKETPLACE OPERATIONS",
    title: "Behind every driving lesson,\na well-run marketplace.",
    description:
      "Review instructor documents, oversee learner bookings, and keep payment and refund activity in view. Help the people behind each lesson stay connected.",
    action: "Review instructor documents",
    to: "/admin-dashboard/documentsManagement",
    secondary: "View bookings",
    secondaryTo: "/admin-dashboard/bookingManagement",
    steps: [
      {
        label: "Review instructors",
        detail: "Profiles and document submissions",
        to: "/admin-dashboard/documentsManagement",
        icon: FileCheck2,
      },
      {
        label: "Oversee bookings",
        detail: "Follow the driving lesson lifecycle",
        to: "/admin-dashboard/bookingManagement",
        icon: BookOpen,
      },
      {
        label: "Manage payments",
        detail: "Payment records and financial activity",
        to: "/admin-dashboard/transactions",
        icon: CreditCard,
      },
    ],
  },
};

export default function DashboardExperience({
  role,
  name,
  isDemo,
  overview,
}: {
  role: WorkspaceRole;
  name?: string;
  isDemo?: boolean;
  overview: boolean;
}) {
  const experience = experiences[role];
  const { pathname } = useLocation();
  const reducedMotion = useReducedMotion();
  const Icon =
    role === "Student"
      ? GraduationCap
      : role === "Instructor"
        ? UsersRound
        : LayoutDashboard;
  return (
    <div
      className={`dsp-experience dsp-experience--${role.toLowerCase()} ${overview ? "dsp-experience--overview" : "dsp-experience--compact"}`}
    >
      {isDemo && (
        <div className="dsp-experience-demo">
          <span>
            <i /> DEMO ACCOUNT
          </span>
          <p>
            {role === "Student"
              ? "Try finding an instructor, reviewing driving lessons, and tracking learning."
              : role === "Instructor"
                ? "Try managing lesson times, students, bookings, and feedback."
                : "Try reviewing instructors, overseeing lessons, and managing payment records."}
          </p>
          <Link to="/#recruiters">
            About the project <ArrowUpRight size={12} />
          </Link>
        </div>
      )}
      {overview && (
        <motion.section
          className="dsp-experience-hero"
          initial={reducedMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          aria-labelledby="workspace-purpose-title"
        >
          <div className="dsp-experience-hero__copy">
            <span className="dsp-experience-eyebrow">
              <Icon size={14} /> {experience.label}
            </span>
            <h1 id="workspace-purpose-title">{experience.title}</h1>
            <p>{experience.description}</p>
            <div className="dsp-experience-actions">
              <Link className="dsp-experience-primary" to={experience.to}>
                {experience.action}
                <ArrowUpRight size={16} />
              </Link>
              <Link
                className="dsp-experience-secondary"
                to={experience.secondaryTo}
              >
                {experience.secondary}
                <ArrowRight size={15} />
              </Link>
            </div>
            <span className="dsp-experience-account">
              {name ? `${name}’s` : "Your"}{" "}
              {role === "Student" ? "learner" : role.toLowerCase()} account{" "}
              <span /> Human instruction. AI assistance.
            </span>
          </div>
          <div className="dsp-experience-hero__visual">
            <img
              src="/images/landing/driving-lesson.webp"
              width="1536"
              height="1024"
              alt="A learner and driving instructor during a lesson in a parked car"
            />
            <DrivingRoute />
            <div className="dsp-experience-photo-note">
              <span>THE PEOPLE BEHIND THE LESSON</span>
              <strong>
                {role === "Student"
                  ? "Your confidence starts here."
                  : role === "Instructor"
                    ? "Your teaching makes the difference."
                    : "A better experience for every learner."}
              </strong>
            </div>
          </div>
        </motion.section>
      )}
      <nav
        className="dsp-experience-steps"
        aria-label={`${role} driving lesson workflow`}
      >
        {!overview && (
          <span className="dsp-experience-steps__label">
            <Icon size={17} />
            {role === "Student"
              ? "Your learning journey"
              : role === "Instructor"
                ? "Your teaching workspace"
                : "Marketplace operations"}
          </span>
        )}
        {experience.steps.map(
          ({ label, detail, to, icon: StepIcon }, index) => (
            <Link
              key={to}
              to={to}
              aria-current={pathname.startsWith(to) ? "page" : undefined}
            >
              <span className="dsp-experience-step-number">0{index + 1}</span>
              <StepIcon size={18} />
              <span>
                <strong>{label}</strong>
                {overview && <small>{detail}</small>}
              </span>
              <ArrowUpRight size={14} />
            </Link>
          ),
        )}
      </nav>
    </div>
  );
}
