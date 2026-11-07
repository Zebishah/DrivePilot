import {
  ArrowUpRight,
  CalendarDays,
  Check,
  GraduationCap,
  LayoutDashboard,
  UsersRound,
} from "lucide-react";
import { Link } from "react-router-dom";

export function CustomerPaths() {
  return (
    <section
      className="ai-customer-paths ai-container"
      aria-labelledby="customer-paths-title"
      data-reveal
    >
      <div className="ai-section-heading">
        <div>
          <span className="ai-eyebrow">
            <span /> THE DRIVING SCHOOL MARKETPLACE
          </span>
          <h2 id="customer-paths-title">
            Here to learn?
            <br />
            <span>Here to teach? You’re home.</span>
          </h2>
        </div>
        <p>
          Drive Pilot connects learners with driving instructors—and keeps everything
          around the lesson in one place.
        </p>
      </div>
      <div className="ai-customer-paths-grid">
        <article>
          <span className="ai-path-icon">
            <GraduationCap size={25} />
          </span>
          <span className="ai-eyebrow">FOR LEARNERS</span>
          <h3>
            Find a driving instructor.
            <br />
            Book your next lesson.
          </h3>
          <p>
            Compare profiles, reviews, and lesson options. Choose an available
            time, pay online, and follow your learning progress.
          </p>
          <ul>
            <li>
              <Check size={13} /> Instructor profiles and reviews
            </li>
            <li>
              <Check size={13} /> Lesson availability and booking
            </li>
            <li>
              <Check size={13} /> Payments, messages, and feedback
            </li>
          </ul>
          <Link className="ai-button ai-button--mint" to="/professional">
            Browse driving instructors <ArrowUpRight size={17} />
          </Link>
        </article>
        <article id="teach">
          <span className="ai-path-icon">
            <UsersRound size={25} />
          </span>
          <span className="ai-eyebrow">FOR DRIVING INSTRUCTORS</span>
          <h3>
            Reach learners.
            <br />
            Run your teaching day.
          </h3>
          <p>
            Build your instructor profile and set your pricing and availability.
            Manage students, lesson bookings, feedback, and payment activity.
          </p>
          <ul>
            <li>
              <Check size={13} /> Your profile, documents, and tariffs
            </li>
            <li>
              <Check size={13} /> One schedule for your lessons
            </li>
            <li>
              <Check size={13} /> Student feedback and earnings records
            </li>
          </ul>
          <Link className="ai-button ai-button--outline" to="/auth/signup">
            Create an instructor account <ArrowUpRight size={17} />
          </Link>
        </article>
      </div>
    </section>
  );
}

export function ReviewerSection() {
  return (
    <section
      className="ai-reviewer-section ai-container"
      id="recruiters"
      aria-labelledby="reviewer-title"
      data-reveal
    >
      <div className="ai-reviewer-intro">
        <span className="ai-eyebrow">
          <span /> FOR RECRUITERS & PRODUCT REVIEWERS
        </span>
        <h2 id="reviewer-title">
          See the product.
          <br />
          <span>Try the real workflows.</span>
        </h2>
        <p>
          Review how a driving lesson moves from discovery to booking, payment,
          and feedback. Explore dedicated learner, instructor, and admin demo
          workspaces.
        </p>
        <Link
          className="ai-button ai-button--outline"
          to="/auth/signin#recruiter-preview"
        >
          Open the role demos <ArrowUpRight size={17} />
        </Link>
      </div>
      <div className="ai-reviewer-roles">
        {[
          {
            icon: GraduationCap,
            title: "Learner workspace",
            text: "Find instructors → book lessons → track learning",
          },
          {
            icon: CalendarDays,
            title: "Instructor workspace",
            text: "Set availability → teach → record feedback",
          },
          {
            icon: LayoutDashboard,
            title: "Admin workspace",
            text: "Review instructors → oversee bookings → manage payments",
          },
        ].map(({ icon: Icon, title, text }) => (
          <div key={title}>
            <span>
              <Icon size={19} />
            </span>
            <div>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          </div>
        ))}
        <details>
          <summary>For technical reviewers: what’s behind Drive Pilot?</summary>
          <p>
            React and TypeScript on the frontend, Node.js and GraphQL on the
            backend, Stripe payment workflows, and separate authenticated
            workspaces for each role. The dashboard AI assistant answers
            questions about authorized account information.
          </p>
        </details>
      </div>
    </section>
  );
}
