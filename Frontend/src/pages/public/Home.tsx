import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Bot,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Clock3,
  CreditCard,
  GraduationCap,
  LayoutDashboard,
  MessageSquareText,
  Plus,
  Route,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UsersRound,
} from "lucide-react";
import { Link } from "react-router-dom";
import { CustomerPaths, ReviewerSection } from "./LandingAudiences";
import DrivingRoute from "../../components/DrivingRoute";

type RoleKey = "student" | "instructor" | "admin";

interface Workspace {
  label: string;
  name: string;
  title: string;
  description: string;
  icon: LucideIcon;
  features: string[];
  navigation: string[];
  stats: [string, string][];
  activity: [string, string, string][];
}

const workspaces: Record<RoleKey, Workspace> = {
  student: {
    label: "For students",
    name: "Student",
    title: "Find your instructor.\nBook your driving lessons.",
    description:
      "Find an instructor who fits. Book a time that works. Watch your confidence grow, one lesson at a time.",
    icon: GraduationCap,
    features: [
      "Discover and compare instructors",
      "Book lessons and pay in one place",
      "Keep feedback and progress together",
      "Ask AI about your dashboard",
    ],
    navigation: ["Overview", "My lessons", "My progress", "Messages"],
    stats: [
      ["12", "Lessons completed"],
      ["18h", "Behind the wheel"],
      ["72%", "Learning progress"],
    ],
    activity: [
      ["City driving", "Tomorrow · 10:00–11:30", "Upcoming"],
      ["Parking practice", "Friday · 14:00–15:00", "Confirmed"],
      ["Road awareness", "Monday · 09:00–10:30", "Completed"],
    ],
  },
  instructor: {
    label: "For instructors",
    name: "Instructor",
    title: "Your students. Your schedule.\nYour driving business.",
    description:
      "Give your students your full attention. Keep availability, lessons, feedback, and earnings together in one focused workspace.",
    icon: UsersRound,
    features: [
      "Set availability and lesson pricing",
      "Manage students and upcoming lessons",
      "Record feedback after every drive",
      "See payments and ask AI for a summary",
    ],
    navigation: ["Overview", "My schedule", "My students", "Payments"],
    stats: [
      ["24", "Active students"],
      ["08", "Upcoming lessons"],
      ["36h", "Teaching this month"],
    ],
    activity: [
      ["City driving · Alex", "Tomorrow · 10:00–11:30", "Upcoming"],
      ["Parking · Jordan", "Friday · 14:00–15:00", "Confirmed"],
      ["Feedback · Sam", "Monday · 09:00–10:30", "Completed"],
    ],
  },
  admin: {
    label: "For admins",
    name: "Admin",
    title: "Run your driving-school\nmarketplace with clarity.",
    description:
      "Bring people, bookings, and financial activity into view. Give every part of your marketplace the attention it needs.",
    icon: LayoutDashboard,
    features: [
      "Review instructor documents",
      "Monitor bookings across the platform",
      "Manage payments, refunds, and reviews",
      "Ask AI about operational attention areas",
    ],
    navigation: ["Overview", "Bookings", "Instructors", "Transactions"],
    stats: [
      ["48", "Active instructors"],
      ["126", "Monthly bookings"],
      ["03", "Items to review"],
    ],
    activity: [
      ["Instructor documents", "Submitted for review", "Pending"],
      ["Lesson booking", "Friday · 14:00–15:00", "Confirmed"],
      ["Payment review", "Transaction record updated", "Completed"],
    ],
  },
};

const assistantExamples = [
  {
    question: "What's my next lesson?",
    answer:
      "Your next lesson is City driving, tomorrow at 10:00. Open My lessons to see your instructor, meeting point, and booking details.",
  },
  {
    question: "Where can I see my progress?",
    answer:
      "Open My progress to review your lesson record, completed hours, and your instructor's feedback. It's all connected to your learning journey.",
  },
  {
    question: "How do I find an instructor?",
    answer:
      "Explore the instructor marketplace, compare profiles and reviews, and check availability. Save the instructors you'd like to come back to.",
  },
];

const journey = [
  {
    number: "01",
    icon: Search,
    title: "Find your fit.",
    text: "Explore instructor profiles, compare reviews, and find the right person for your journey.",
  },
  {
    number: "02",
    icon: CalendarDays,
    title: "Make it happen.",
    text: "Choose an available lesson, book your time, and complete your payment in one place.",
  },
  {
    number: "03",
    icon: TrendingUp,
    title: "Build your confidence.",
    text: "Learn, reflect on instructor feedback, and keep your next milestone in sight.",
  },
];

const lessonSteps = [
  {
    label: "Find",
    title: "Find your driving instructor.",
    description: "Compare profiles, lesson prices, and reviews.",
    link: "Explore instructors",
    to: "/professional",
  },
  {
    label: "Book",
    title: "Choose a time that fits.",
    description: "Check availability, book a lesson, and pay online.",
    link: "Find a lesson",
    to: "/professional",
  },
  {
    label: "Learn",
    title: "See your learning progress.",
    description: "Keep lesson feedback and completed hours in view.",
    link: "Create your learner account",
    to: "/auth/signup",
  },
];

const faqs = [
  [
    "How much do driving lessons cost?",
    "Prices depend on the instructor and lesson options you choose. Explore instructor profiles and available lessons, then review the price shown in your booking before paying.",
  ],
  [
    "What is DSP Marketplace?",
    "DSP is a connected driving-school platform for students, instructors, and admins. Discover instructors, book and pay for lessons, track learning progress, and manage driving-school operations in one place.",
  ],
  [
    "How does the AI assistant help?",
    "The DSP Assistant answers questions about the platform and your authorized dashboard information, such as upcoming lessons, bookings, or payment statuses. It offers read-only help; booking, payment, and account changes happen through the regular platform workflows.",
  ],
  [
    "How do I find and book an instructor?",
    "Explore the instructor marketplace to compare profiles, reviews, and availability. Choose a suitable lesson slot, sign in to your account, and follow the booking and payment steps.",
  ],
  [
    "Can I join as a driving instructor?",
    "Yes. Create an account and select the instructor role during onboarding. You can manage your profile, documents, availability, pricing, students, bookings, and lesson feedback from your instructor workspace.",
  ],
  [
    "Where can I track my learning progress?",
    "Your student workspace brings together your lesson history, learning record, completed hours, and instructor feedback, so you can see how your learning develops over time.",
  ],
  [
    "How are payments handled?",
    "DSP uses a Stripe-backed payment workflow. Payment and booking statuses are visible in your workspace, with dedicated records for transactions and related activity.",
  ],
];

function WorkspacePreview({ role }: { role: RoleKey }) {
  const workspace = workspaces[role];
  return (
    <div className="ai-workspace" key={role}>
      <div className="ai-workspace-bar">
        <span className="ai-window-dots">
          <i />
          <i />
          <i />
        </span>
        <span>DSP / {workspace.name.toLowerCase()} workspace</span>
        <span className="ai-preview-label">Illustrative preview</span>
      </div>
      <div className="ai-workspace-body">
        <aside className="ai-workspace-sidebar" aria-label="Preview navigation">
          <span className="ai-workspace-brand">
            <Route size={20} /> DSP<span>®</span>
          </span>
          {workspace.navigation.map((item, index) => {
            const Icon = [
              LayoutDashboard,
              CalendarDays,
              TrendingUp,
              MessageSquareText,
            ][index];
            return (
              <span className={index === 0 ? "is-active" : ""} key={item}>
                <Icon size={14} />
                {item}
              </span>
            );
          })}
          <span className="ai-workspace-help">
            <Bot size={15} /> AI Assistant <Sparkles size={11} />
          </span>
        </aside>
        <div className="ai-workspace-content">
          <div className="ai-workspace-heading">
            <div>
              <span>YOUR {workspace.name.toUpperCase()} WORKSPACE</span>
              <h4>Your driving lessons, at a glance.</h4>
            </div>
            <span className="ai-avatar">{workspace.name[0]}</span>
          </div>
          <div className="ai-workspace-stats">
            {workspace.stats.map(([value, label]) => (
              <div key={label}>
                <small>{label}</small>
                <strong>
                  {value}
                  <TrendingUp size={13} />
                </strong>
              </div>
            ))}
          </div>
          <div className="ai-workspace-activity">
            <div className="ai-workspace-activity-title">
              <strong>
                {role === "admin"
                  ? "Marketplace activity"
                  : "Your lesson overview"}
              </strong>
              <span>
                This week <ChevronDownIcon />
              </span>
            </div>
            {workspace.activity.map(([title, time, status], index) => (
              <div className="ai-activity-row" key={title}>
                <span className="ai-activity-icon">
                  <CalendarDays size={14} />
                </span>
                <div>
                  <strong>{title}</strong>
                  <small>{time}</small>
                </div>
                <span className={`ai-status ai-status--${index}`}>
                  {status}
                </span>
              </div>
            ))}
          </div>
          <div className="ai-workspace-assistant">
            <Sparkles size={16} />
            <span>Your next answer is a question away.</span>
            <ArrowUpRight size={15} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ChevronDownIcon() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
    >
      <path d="m3 4.5 3 3 3-3" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export default function Home() {
  const [lessonStep, setLessonStep] = useState(0);
  const [activeRole, setActiveRole] = useState<RoleKey>("student");
  const [activeExample, setActiveExample] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const homeRef = useRef<HTMLDivElement>(null);
  const activeWorkspace = workspaces[activeRole];

  useEffect(() => {
    const elements =
      homeRef.current?.querySelectorAll<HTMLElement>("[data-reveal]");
    if (
      !elements ||
      !("IntersectionObserver" in window) ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08 },
    );
    elements.forEach((element) => {
      element.classList.add("will-reveal");
      observer.observe(element);
    });
    return () => observer.disconnect();
  }, []);

  const handleRoleKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    role: RoleKey,
  ) => {
    const keys = Object.keys(workspaces) as RoleKey[];
    let nextIndex = keys.indexOf(role);
    if (event.key === "ArrowRight") nextIndex = (nextIndex + 1) % keys.length;
    else if (event.key === "ArrowLeft")
      nextIndex = (nextIndex + keys.length - 1) % keys.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = keys.length - 1;
    else return;
    event.preventDefault();
    setActiveRole(keys[nextIndex]);
    document.getElementById(`workspace-tab-${keys[nextIndex]}`)?.focus();
  };

  return (
    <div className="ai-home" id="top" ref={homeRef}>
      <section
        className="ai-hero ai-hero--lessons"
        aria-labelledby="hero-title"
      >
        <div className="ai-hero-grid" aria-hidden="true" />
        <div className="ai-hero-copy ai-container">
          <a className="ai-announcement" href="#engineering">
            <span className="ai-pulse-dot" />
            <span>DRIVING LESSONS. BOOKED AROUND YOU.</span>
            <ArrowUpRight size={13} />
          </a>
          <h1 id="hero-title">
            Driving lessons.
            <br />
            <span>Made for you.</span>
            <span className="ai-title-star" aria-hidden="true">
              ✳
            </span>
          </h1>
          <p>
            Find a driving instructor. Choose your lesson. Book online. <br />
            Lessons, payments, feedback, and AI assistance—all in your DSP
            account.
          </p>
          <div className="ai-hero-actions">
            <Link to="/professional" className="ai-button ai-button--mint">
              Find a driving instructor <ArrowUpRight size={18} />
            </Link>
            <Link to="/auth/signup" className="ai-button ai-button--ghost">
              <span className="ai-play-icon">
                <UsersRound size={14} />
              </span>
              Join as an instructor
            </Link>
          </div>
          <a className="ai-recruiter-shortcut" href="#recruiters">
            Reviewing the project? Explore the role demos{" "}
            <ArrowUpRight size={12} />
          </a>
        </div>
        <div className="ai-hero-stage ai-container">
          <img
            className="ai-hero-art"
            src="/images/landing/driving-lesson.webp"
            alt="A learner at the wheel with a driving instructor explaining a lesson in a parked car"
            width="1536"
            height="1024"
            fetchPriority="high"
          />
          <DrivingRoute className="ai-hero-route" />
          <span className="ai-lesson-photo-label">
            <GraduationCap size={15} /> REAL DRIVING LESSONS. HUMAN INSTRUCTION.
          </span>
          <div className="ai-stage-coordinate" aria-hidden="true">
            <span>INTELLIGENCE IN MOTION</span>
            <i /> THE ROAD AHEAD IS YOURS
          </div>
          <div className="ai-glass-card ai-milestone">
            <div className="ai-card-topline">
              <span className="ai-icon-square">
                <Route size={17} />
              </span>
              <span>YOUR DRIVING LESSON JOURNEY</span>
              <ArrowUpRight size={14} />
            </div>
            <div
              className="ai-lesson-step-copy"
              aria-live="polite"
              aria-atomic="true"
            >
              <strong>{lessonSteps[lessonStep].title}</strong>
              <p>{lessonSteps[lessonStep].description}</p>
            </div>
            <div
              className="ai-lesson-step-switch"
              aria-label="Explore the lesson journey"
            >
              {lessonSteps.map((step, index) => (
                <button
                  key={step.label}
                  type="button"
                  aria-pressed={lessonStep === index}
                  onClick={() => setLessonStep(index)}
                >
                  <span>0{index + 1}</span>
                  {step.label}
                </button>
              ))}
            </div>
            <div className="ai-card-footnote">
              <Link to={lessonSteps[lessonStep].to}>
                {lessonSteps[lessonStep].link}
                <ArrowUpRight size={12} />
              </Link>
            </div>
          </div>
          <div className="ai-glass-card ai-hero-assistant">
            <div className="ai-card-topline">
              <span className="ai-icon-square">
                <Sparkles size={16} />
              </span>
              <strong>DSP Assistant</strong>
              <span className="ai-pulse-dot" />
            </div>
            <p>
              Questions about
              <br />
              your next lesson?
            </p>
            <a href="#engineering">
              Meet your dashboard assistant <ArrowUpRight size={14} />
            </a>
          </div>
          <div className="ai-stage-caption">
            <span>
              <span className="ai-pulse-dot" /> HUMAN-LED. AI-ASSISTED.
            </span>
            <a href="#platform">
              SCROLL TO DISCOVER <ArrowDown size={13} />
            </a>
            <span>DESIGNED FOR YOUR JOURNEY ↗</span>
          </div>
        </div>
      </section>

      <div className="ai-capabilities">
        <div className="ai-container">
          <span>
            ONE JOURNEY.
            <br />
            <strong>EVERYTHING CONNECTED.</strong>
          </span>
          {[
            [ShieldCheck, "Verified instructors"],
            [CalendarDays, "Seamless booking"],
            [Bot, "AI assistance"],
            [TrendingUp, "Visible progress"],
          ].map(([Icon, label]) => {
            const CapabilityIcon = Icon as LucideIcon;
            return (
              <span className="ai-capability" key={label as string}>
                <CapabilityIcon size={18} />
                {label as string}
              </span>
            );
          })}
        </div>
      </div>

      <CustomerPaths />

      <section className="ai-section ai-container" id="platform">
        <div className="ai-section-heading" data-reveal>
          <div>
            <span className="ai-eyebrow">
              <span /> CONNECTED BY DESIGN
            </span>
            <h2>
              Your driving lessons.
              <br />
              <span>Everything around them.</span>
            </h2>
          </div>
          <p>
            Everything around your driving lessons, thoughtfully connected. So
            you can focus on the road ahead.
          </p>
        </div>
        <div className="ai-bento">
          <article
            className="ai-feature ai-feature--assistant"
            id="engineering"
            data-reveal
          >
            <div className="ai-feature-top">
              <span className="ai-feature-tag">
                <Sparkles size={13} /> INTELLIGENCE, WITH PURPOSE
              </span>
              <span className="ai-feature-index">01 /</span>
            </div>
            <div className="ai-orb" aria-hidden="true">
              <div />
              <div />
              <div />
              <Sparkles size={35} />
            </div>
            <div className="ai-feature-copy">
              <h3>
                Your lesson questions.
                <br />A helpful AI assistant.
              </h3>
              <p>
                Ask your AI assistant about bookings, lessons, and your
                dashboard. Get context when you need it.
              </p>
            </div>
            <div className="ai-assistant-demo">
              <div className="ai-assistant-demo-heading">
                <span>
                  <Sparkles size={13} /> DSP ASSISTANT
                </span>
                <small>EXAMPLE CONVERSATION</small>
              </div>
              <div className="ai-example-question">
                <span>{assistantExamples[activeExample].question}</span>
                <span className="ai-small-avatar">You</span>
              </div>
              <div
                className="ai-example-answer"
                aria-live="polite"
                aria-atomic="true"
              >
                <Bot size={18} />
                <p>{assistantExamples[activeExample].answer}</p>
              </div>
              <div className="ai-demo-navigation">
                <span>Try an example</span>
                <div>
                  <button
                    type="button"
                    aria-label="Previous assistant example"
                    onClick={() =>
                      setActiveExample(
                        (activeExample + assistantExamples.length - 1) %
                          assistantExamples.length,
                      )
                    }
                  >
                    <ChevronLeft size={15} />
                  </button>
                  <span>{String(activeExample + 1).padStart(2, "0")} / 03</span>
                  <button
                    type="button"
                    aria-label="Next assistant example"
                    onClick={() =>
                      setActiveExample(
                        (activeExample + 1) % assistantExamples.length,
                      )
                    }
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            </div>
          </article>
          <article className="ai-feature ai-feature--booking" data-reveal>
            <div className="ai-feature-top">
              <span className="ai-feature-tag">
                <CalendarDays size={13} /> YOUR TIME, YOUR TERMS
              </span>
              <ArrowUpRight size={20} />
            </div>
            <h3>
              Great lessons.
              <br />
              Less back-and-forth.
            </h3>
            <p>
              Discover instructors, find a time, and make your next lesson
              happen.
            </p>
            <div className="ai-booking-preview">
              <div className="ai-calendar-top">
                <strong>Your next move</strong>
                <span>Sample availability</span>
              </div>
              <div className="ai-calendar-days">
                {["M", "T", "W", "T", "F", "S", "S"].map((day, index) => (
                  <div
                    className={index === 2 ? "is-selected" : ""}
                    key={`${day}-${index}`}
                  >
                    <span>{day}</span>
                    <strong>{12 + index}</strong>
                    <i />
                  </div>
                ))}
              </div>
              <Link className="ai-time-slot" to="/professional">
                <span>
                  <Clock3 size={15} /> Explore lesson availability
                </span>
                <ArrowUpRight size={16} />
              </Link>
            </div>
          </article>
          <article className="ai-feature ai-feature--progress" data-reveal>
            <div className="ai-feature-top">
              <span className="ai-feature-tag">
                <TrendingUp size={13} /> SMALL STEPS, REAL PROGRESS
              </span>
              <span className="ai-feature-index">03 /</span>
            </div>
            <div className="ai-progress-chart" aria-hidden="true">
              {[25, 38, 34, 50, 45, 65, 61, 79, 74, 95, 90, 115].map(
                (height, index) => (
                  <i
                    style={{
                      height: `${height}px`,
                      animationDelay: `${index * 55}ms`,
                    }}
                    key={index}
                  />
                ),
              )}
              <span>
                <TrendingUp size={13} /> Keep moving forward
              </span>
            </div>
            <h3>
              See how far
              <br />
              you’ve come.
            </h3>
            <p>
              Lesson feedback, learning milestones, and your progress. All in
              the same picture.
            </p>
          </article>
        </div>
      </section>

      <section className="ai-roles-section" id="roles">
        <div className="ai-container">
          <div className="ai-section-heading" data-reveal>
            <div>
              <span className="ai-eyebrow">
                <span /> YOUR WORLD, CONNECTED
              </span>
              <h2>
                Different seats.
                <br />
                <span>One shared direction.</span>
              </h2>
            </div>
            <div
              className="ai-role-tabs"
              role="tablist"
              aria-label="Explore DSP workspaces"
            >
              {(Object.keys(workspaces) as RoleKey[]).map((key) => {
                const workspace = workspaces[key];
                const Icon = workspace.icon;
                return (
                  <button
                    id={`workspace-tab-${key}`}
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={activeRole === key}
                    aria-controls="workspace-panel"
                    tabIndex={activeRole === key ? 0 : -1}
                    className={activeRole === key ? "is-active" : ""}
                    onKeyDown={(event) => handleRoleKeyDown(event, key)}
                    onClick={() => setActiveRole(key)}
                  >
                    <Icon size={16} />
                    {workspace.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div
            className="ai-role-panel"
            id="workspace-panel"
            role="tabpanel"
            aria-labelledby={`workspace-tab-${activeRole}`}
            tabIndex={0}
            data-reveal
          >
            <div className="ai-role-copy">
              <span className="ai-role-number">
                0
                {(Object.keys(workspaces) as RoleKey[]).indexOf(activeRole) + 1}{" "}
                / THE {activeWorkspace.name.toUpperCase()} EXPERIENCE
              </span>
              <h3>{activeWorkspace.title}</h3>
              <p>{activeWorkspace.description}</p>
              <ul>
                {activeWorkspace.features.map((feature) => (
                  <li key={feature}>
                    <span>
                      <Check size={12} />
                    </span>
                    {feature}
                  </li>
                ))}
              </ul>
              <Link
                to={
                  activeRole === "student"
                    ? "/professional"
                    : activeRole === "instructor"
                      ? "/auth/signup"
                      : "/auth/signin"
                }
                className="ai-button ai-button--dark"
              >
                {activeRole === "student"
                  ? "Find your instructor"
                  : activeRole === "instructor"
                    ? "Start teaching with DSP"
                    : "Explore your workspace"}
                <ArrowUpRight size={16} />
              </Link>
            </div>
            <WorkspacePreview role={activeRole} />
          </div>
        </div>
      </section>

      <section className="ai-section ai-container ai-journey" id="workflow">
        <div className="ai-section-heading" data-reveal>
          <div>
            <span className="ai-eyebrow">
              <span /> A CLEARER ROAD AHEAD
            </span>
            <h2>
              From “where do I start?”
              <br />
              <span>to “look how far I’ve come.”</span>
            </h2>
          </div>
          <Link className="ai-text-link" to="/professional">
            Let’s find your instructor <ArrowUpRight size={16} />
          </Link>
        </div>
        <div className="ai-journey-grid">
          {journey.map(({ number, icon: Icon, title, text }) => (
            <article key={number} data-reveal>
              <div className="ai-journey-top">
                <span>{number}</span>
                <Icon size={23} />
                <ArrowRight size={20} />
              </div>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
        <div className="ai-trust-strip" data-reveal>
          <ShieldCheck size={23} />
          <div>
            <strong>Human expertise. Thoughtful technology.</strong>
            <p>
              Your instructor leads the learning. Your workspace keeps it
              connected. AI helps you find the context.
            </p>
          </div>
          <span>
            <CreditCard size={16} /> Stripe payments
          </span>
          <span>
            <ShieldCheck size={16} /> Role-based access
          </span>
        </div>
      </section>

      <ReviewerSection />

      <section className="ai-faq-section ai-container" id="faq">
        <div className="ai-faq-intro" data-reveal>
          <span className="ai-eyebrow">
            <span /> A LITTLE MORE CLARITY
          </span>
          <h2>
            Good questions.
            <br />
            <span>Clear answers.</span>
          </h2>
          <p>
            Getting started should feel simple.
            <br />
            Here are a few things you might be wondering.
          </p>
          <Link className="ai-text-link" to="/contact">
            <HelpCircle size={17} /> Get in touch <ArrowUpRight size={16} />
          </Link>
        </div>
        <div className="ai-faq-list" data-reveal>
          {faqs.map(([question, answer], index) => (
            <div
              className={`ai-faq-item ${openFaq === index ? "is-open" : ""}`}
              key={question}
            >
              <h3>
                <button
                  type="button"
                  aria-expanded={openFaq === index}
                  aria-controls={`ai-faq-answer-${index}`}
                  id={`ai-faq-question-${index}`}
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                >
                  <span className="ai-faq-number">0{index + 1}</span>
                  <span>{question}</span>
                  <Plus size={18} />
                </button>
              </h3>
              <div
                id={`ai-faq-answer-${index}`}
                role="region"
                aria-labelledby={`ai-faq-question-${index}`}
                hidden={openFaq !== index}
              >
                <p>{answer}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="ai-cta ai-container" data-reveal>
        <div className="ai-cta-orbits" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
        <span className="ai-eyebrow">
          <span /> YOUR FIRST DRIVING LESSON STARTS HERE
        </span>
        <h2>
          Ready to learn?
          <br />
          <span>Find your instructor.</span>
          <ArrowUpRight aria-hidden="true" />
        </h2>
        <div className="ai-cta-bottom">
          <p>
            Compare driving instructors, find an available lesson, and book
            online.
            <br />
            Teaching instead? Join DSP to manage your driving lessons and
            students.
          </p>
          <div>
            <Link className="ai-button ai-button--mint" to="/professional">
              Find driving lessons <ArrowUpRight size={17} />
            </Link>
            <Link className="ai-button ai-button--ghost" to="/auth/signup">
              Become an instructor <ArrowUpRight size={17} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
