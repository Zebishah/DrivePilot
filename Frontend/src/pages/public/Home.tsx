import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowDown,
  ArrowRight,
  BarChart3,
  BookOpen,
  CalendarDays,
  Check,
  ChevronDown,
  CircleDollarSign,
  ClipboardCheck,
  CreditCard,
  Gauge,
  GraduationCap,
  LayoutDashboard,
  MessageSquareText,
  Search,
  ShieldCheck,
  Star,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { Link } from "react-router-dom";

type RoleKey = "student" | "instructor" | "admin";

interface RoleContent {
  label: string;
  title: string;
  description: string;
  icon: LucideIcon;
  tone: string;
  features: string[];
}

const roles: Record<RoleKey, RoleContent> = {
  student: {
    label: "For students",
    title: "Move from searching to learning with confidence.",
    description: "Discover instructors, compare what matters, book a suitable slot, and keep every lesson milestone in view.",
    icon: GraduationCap,
    tone: "cyan",
    features: ["Search and compare instructors", "Save trusted instructors", "Book, pay, and message", "Follow progress and feedback"],
  },
  instructor: {
    label: "For instructors",
    title: "A calmer workspace for every lesson.",
    description: "Keep availability, bookings, students, pricing, feedback, reviews, and payment activity connected in one workspace.",
    icon: UsersRound,
    tone: "purple",
    features: ["Set availability and tariffs", "Manage students and bookings", "Record lesson feedback", "Track payments and reviews"],
  },
  admin: {
    label: "For admins",
    title: "Operate the marketplace with the full picture.",
    description: "Bring documents, people, bookings, financial activity, feedback, reviews, notifications, and analytics into one operational view.",
    icon: LayoutDashboard,
    tone: "pink",
    features: ["Review instructor documents", "Monitor booking lifecycles", "Manage payments and refunds", "See activity and attention areas"],
  },
};

const workflow = [
  ["01", "Discover", "Find instructors and the right learning fit.", Search],
  ["02", "Compare", "Review profiles, availability, and reviews.", Star],
  ["03", "Book & pay", "Choose a slot and complete the supported payment flow.", CreditCard],
  ["04", "Learn", "Keep conversations and lessons moving.", BookOpen],
  ["05", "Reflect", "Feedback, progress, and reviews close the loop.", Gauge],
] as const;

const faqs = [
  ["What is DSP Marketplace?", "DSP connects students, driving instructors, and platform operations in one workspace for discovering, booking, teaching, and managing lessons."],
  ["How do students find instructors?", "Students can search the instructor marketplace, review profiles, compare available options, and save instructors they want to revisit."],
  ["How do bookings and payments work?", "Students choose available lesson slots and move through the platform's booking and Stripe-backed payment workflow. Booking and payment status remain visible in the relevant workspace."],
  ["How do instructors manage their work?", "Instructors can manage profiles, documents, availability, tariffs, students, bookings, feedback, reviews, and payment activity from their dashboard."],
  ["How is learning progress tracked?", "Completed lessons can update the student's learning record, instructor feedback, hours, and progress views."],
];

function ProductPreview({ role }: { role: RoleKey }) {
  const content = roles[role];
  const Icon = content.icon;
  return (
    <div className={`dsp-product-preview dsp-product-preview--${content.tone}`} aria-label={`${content.label} product preview`}>
      <div className="dsp-product-preview__topbar"><span /><span /><span /><small>DSP workspace</small><span className="dsp-product-preview__dot" /></div>
      <div className="dsp-product-preview__body">
        <div className="dsp-product-preview__sidebar"><div className="dsp-mini-logo">DSP</div><span className="is-active" /><span /><span /><span /><span /></div>
        <div className="dsp-product-preview__content">
          <div className="dsp-preview-heading"><div><small>{content.label}</small><h3>{content.title}</h3></div><Icon size={22} /></div>
          <div className="dsp-preview-grid">
            {content.features.slice(0, 3).map((feature, index) => {
              const FeatureIcon = [CalendarDays, ClipboardCheck, CircleDollarSign][index];
              return <div className="dsp-preview-card" key={feature}><span className="dsp-preview-card__icon"><FeatureIcon size={17} /></span><strong>{feature}</strong><small>{index === 0 ? "Connected workspace" : index === 1 ? "Keep every step clear" : "Visible when it matters"}</small></div>;
            })}
          </div>
          <div className="dsp-preview-progress"><div><span>Learning workflow</span><strong>Connected</strong></div><i><b /></i><small>Activity updates across the product</small></div>
        </div>
      </div>
    </div>
  );
}

function Home() {
  const [activeRole, setActiveRole] = useState<RoleKey>("student");
  const [openFaq, setOpenFaq] = useState(0);
  const activeContent = roles[activeRole];

  return (
    <div id="top" className="dsp-public-home">
      <section className="dsp-home-hero dsp-public-container">
        <div className="dsp-home-hero__copy">
          <span className="dsp-public-eyebrow">THE CONNECTED DRIVING-SCHOOL PLATFORM</span>
          <h1>A smarter way to learn, teach, and run driving lessons.</h1>
          <p>Find verified instructors, book and pay for lessons, track progress, manage teaching operations, and run the marketplace from one connected platform.</p>
          <div className="dsp-home-hero__actions"><Link className="dsp-public-button dsp-public-button--primary" to="/professional">Find an instructor <ArrowRight size={17} /></Link><Link className="dsp-public-button dsp-public-button--secondary" to="/auth/signup">Become an instructor</Link><Link className="dsp-text-link" to="/auth/signin#recruiter-preview">Explore demo <ArrowRight size={16} /></Link></div>
          <div className="dsp-home-hero__note"><ShieldCheck size={16} /> A focused workspace for every side of the lesson lifecycle.</div>
        </div>
        <div className="dsp-home-hero__visual"><div className="dsp-hero-orb dsp-hero-orb--one" /><div className="dsp-hero-orb dsp-hero-orb--two" /><ProductPreview role="student" /><div className="dsp-hero-float dsp-hero-float--schedule"><CalendarDays size={16} /><span><strong>Availability</strong><small>Ready to book</small></span><Check size={16} /></div><div className="dsp-hero-float dsp-hero-float--progress"><Gauge size={16} /><span><strong>Progress record</strong><small>Visible after every lesson</small></span></div></div>
      </section>

      <section className="dsp-public-section dsp-public-section--roles" id="roles"><div className="dsp-public-container"><div className="dsp-section-heading"><span className="dsp-public-eyebrow">ONE PLATFORM / THREE EXPERIENCES</span><h2>One platform. Every side of the lesson.</h2><p>DSP keeps the people and workflows around driving lessons aligned, without forcing every role into the same view.</p></div><div className="dsp-role-tabs" role="tablist" aria-label="DSP workspaces">{(Object.keys(roles) as RoleKey[]).map((key) => { const item = roles[key]; const Icon = item.icon; return <button key={key} type="button" role="tab" aria-selected={activeRole === key} className={activeRole === key ? "is-active" : ""} onClick={() => setActiveRole(key)}><Icon size={18} /><span>{item.label}</span></button>; })}</div><div className="dsp-role-showcase"><div className="dsp-role-showcase__copy"><span className={`dsp-role-icon dsp-role-icon--${activeContent.tone}`}><activeContent.icon size={22} /></span><span className="dsp-public-eyebrow">{activeContent.label}</span><h3>{activeContent.title}</h3><p>{activeContent.description}</p><ul>{activeContent.features.map((feature) => <li key={feature}><Check size={15} />{feature}</li>)}</ul></div><ProductPreview role={activeRole} /></div></div></section>

      <section className="dsp-public-section dsp-public-section--contrast"><div className="dsp-public-container"><div className="dsp-story-grid"><div><span className="dsp-public-eyebrow">FROM FRAGMENTED TO CONNECTED</span><h2>Driving lessons are fragmented. The workflow shouldn’t be.</h2><p>Instructor discovery, availability, booking coordination, payment, feedback, and progress often live in separate conversations and tools.</p></div><div className="dsp-before-after"><div className="dsp-before-after__item"><span>Before DSP</span><p>Manual discovery</p><p>Unclear availability</p><p>Disconnected payments</p><p>Progress spread across messages</p></div><div className="dsp-before-after__arrow"><ArrowRight size={20} /></div><div className="dsp-before-after__item dsp-before-after__item--after"><span>With DSP</span><p>Profiles and comparison</p><p>Bookable lesson slots</p><p>Connected payment records</p><p>Feedback and learning progress</p></div></div></div></div></section>

      <section className="dsp-public-section" id="workflow"><div className="dsp-public-container"><div className="dsp-section-heading dsp-section-heading--center"><span className="dsp-public-eyebrow">HOW IT WORKS</span><h2>A clear path from first search to next step.</h2><p>Each stage hands useful context to the next, so students, instructors, and admins can act with less friction.</p></div><div className="dsp-workflow">{workflow.map(([number, title, text, Icon], index) => <div className="dsp-workflow__step" key={title}><div className="dsp-workflow__number">{number}</div><span className="dsp-workflow__icon"><Icon size={20} /></span><h3>{title}</h3><p>{text}</p>{index < workflow.length - 1 && <ArrowRight className="dsp-workflow__connector" size={18} />}</div>)}</div></div></section>

      <section className="dsp-public-section dsp-public-section--soft" id="platform"><div className="dsp-public-container"><div className="dsp-section-heading"><span className="dsp-public-eyebrow">THE PRODUCT LOOP</span><h2>Everything around the lesson, in one place.</h2><p>DSP is designed around the moments that make a lesson successful before, during, and after the drive.</p></div><div className="dsp-feature-narrative"><div className="dsp-feature-narrative__list"><article><span><Search size={18} /></span><div><h3>Discover and choose</h3><p>Search, compare, save, and revisit instructor profiles from a focused marketplace.</p></div></article><article><span><CalendarDays size={18} /></span><div><h3>Book with clarity</h3><p>Availability, slots, booking status, and supported payment steps stay visible to the people involved.</p></div></article><article><span><MessageSquareText size={18} /></span><div><h3>Learn and reflect</h3><p>Messages, lesson feedback, progress records, and reviews create a useful learning loop.</p></div></article></div><div className="dsp-loop-card"><div className="dsp-loop-card__header"><span>Connected workflow</span><span className="dsp-live-dot">Live view</span></div>{[["Student", Search], ["Instructor", CalendarDays], ["Lesson", BookOpen], ["Feedback", ClipboardCheck], ["Progress", Gauge]].map(([label, Icon], index) => <div className="dsp-loop-card__row" key={label as string}><span className="dsp-loop-card__marker"><Icon size={15} /></span><strong>{label as string}</strong><small>{index === 0 ? "Discovery and comparison" : index === 1 ? "Availability and booking" : index === 2 ? "A focused learning moment" : index === 3 ? "Instructor notes" : "Student learning record"}</small>{index < 4 && <ArrowDown size={14} />}</div>)}</div></div></div></section>

      <section className="dsp-public-section"><div className="dsp-public-container"><div className="dsp-section-heading dsp-section-heading--center"><span className="dsp-public-eyebrow">PAYMENTS / PROGRESS / TRUST</span><h2>Designed for the moments that need a reliable record.</h2></div><div className="dsp-proof-grid"><article><span className="dsp-proof-icon dsp-proof-icon--green"><WalletCards size={20} /></span><h3>Payments connected to the lesson</h3><p>Payment status and transaction activity stay attached to the booking lifecycle, with Stripe integrated into the platform workflow.</p><div className="dsp-proof-flow"><span>Student payment</span><ArrowRight size={15} /><span>DSP transaction</span><ArrowRight size={15} /><span>Instructor share</span></div></article><article><span className="dsp-proof-icon dsp-proof-icon--purple"><ClipboardCheck size={20} /></span><h3>Feedback that moves learning forward</h3><p>When an instructor records lesson feedback, the student can see the learning record develop over time.</p><div className="dsp-proof-flow"><span>Lesson</span><ArrowRight size={15} /><span>Feedback</span><ArrowRight size={15} /><span>Progress</span></div></article><article><span className="dsp-proof-icon dsp-proof-icon--blue"><BarChart3 size={20} /></span><h3>Operational visibility</h3><p>Admins have dedicated views for people, documents, bookings, payment activity, refunds, reviews, feedback, and analytics.</p><div className="dsp-proof-flow"><span>Activity</span><ArrowRight size={15} /><span>Insight</span><ArrowRight size={15} /><span>Action</span></div></article></div></div></section>

      <section className="dsp-public-section dsp-public-section--dark" id="engineering"><div className="dsp-public-container"><div className="dsp-engineering-heading"><div><span className="dsp-public-eyebrow">ENGINEERING / OPERATIONS</span><h2>Engineered like a real marketplace.</h2><p>The product is backed by a role-aware application layer, connected data, and workflows designed to keep important operations observable.</p></div><Link className="dsp-public-button dsp-public-button--light" to="/about">Explore DSP <ArrowRight size={17} /></Link></div><div className="dsp-architecture"><div className="dsp-architecture__column"><span>Product surfaces</span><strong>React + TypeScript</strong><strong>Student / Instructor / Admin workspaces</strong></div><ArrowDown size={18} /><div className="dsp-architecture__column"><span>Application layer</span><strong>GraphQL + Apollo</strong><strong>Role-based authorization</strong></div><ArrowDown size={18} /><div className="dsp-architecture__split"><div><span>Data</span><strong>MongoDB</strong></div><div><span>Side effects</span><strong>Redis / outbox / email</strong></div><div><span>Payments</span><strong>Stripe workflows</strong></div></div></div><div className="dsp-tech-list">{["React", "TypeScript", "Node.js", "GraphQL", "Apollo", "MongoDB", "Redis", "Stripe"].map((tech) => <span key={tech}>{tech}</span>)}</div></div></section>

      <section className="dsp-public-section dsp-public-section--security"><div className="dsp-public-container"><div className="dsp-security-grid"><div><span className="dsp-public-eyebrow">SAFE WORKFLOWS</span><h2>Every role sees the work it is responsible for.</h2><p>DSP separates student, instructor, and admin responsibilities through protected routes and server-side authorization, keeping operational actions in the right workspace.</p><Link className="dsp-text-link" to="/auth/signup">Start with DSP <ArrowRight size={16} /></Link></div><div className="dsp-security-list"><div><UsersRound size={20} /><span><strong>Students</strong><small>Their bookings, payments, progress, feedback, and conversations.</small></span></div><div><BookOpen size={20} /><span><strong>Instructors</strong><small>Their assigned students, lessons, availability, pricing, and earnings.</small></span></div><div><ShieldCheck size={20} /><span><strong>Admins</strong><small>Authorized oversight of marketplace operations and attention areas.</small></span></div></div></div></div></section>

      <section className="dsp-public-section dsp-public-section--faq" id="faq"><div className="dsp-public-container"><div className="dsp-section-heading dsp-section-heading--center"><span className="dsp-public-eyebrow">FAQ</span><h2>Questions before your first step?</h2></div><div className="dsp-faq-list">{faqs.map(([question, answer], index) => <div className={`dsp-faq-item ${openFaq === index ? "is-open" : ""}`} key={question}><button type="button" aria-expanded={openFaq === index} onClick={() => setOpenFaq(openFaq === index ? -1 : index)}><span>{question}</span><ChevronDown size={18} /></button>{openFaq === index && <p>{answer}</p>}</div>)}</div></div></section>

      <section className="dsp-home-cta dsp-public-container"><div><span className="dsp-public-eyebrow">READY FOR THE NEXT STEP?</span><h2>Make every lesson easier to move forward.</h2><p>Choose the workspace that fits where you are in the driving-school journey.</p></div><div className="dsp-home-hero__actions"><Link className="dsp-public-button dsp-public-button--light" to="/professional">Find an instructor <ArrowRight size={17} /></Link><Link className="dsp-public-button dsp-public-button--outline-light" to="/auth/signup">Join as an instructor</Link></div></section>
    </div>
  );
}

export default Home;
