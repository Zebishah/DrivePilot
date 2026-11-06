import { CalendarDays, GraduationCap, UsersRound } from "lucide-react";
import { Link } from "react-router-dom";
import "./about.css";

const audiences = [
  {
    icon: GraduationCap,
    title: "For learners",
    copy: "Find instructors, explore available lesson times, and manage your bookings and learning progress.",
  },
  {
    icon: UsersRound,
    title: "For instructors",
    copy: "Organize your availability, lesson prices, students, documents, and payments in one workspace.",
  },
  {
    icon: CalendarDays,
    title: "For driving schools",
    copy: "Manage marketplace operations, review bookings, and keep track of students and instructors.",
  },
];

export default function AboutUs() {
  return (
    <div className="dsp-about dsp-public-container">
      <section className="dsp-about__hero">
        <div>
          <span className="dsp-public-eyebrow">ABOUT DSP MARKETPLACE</span>
          <h1>
            Driving lessons.
            <br />
            People connected.
          </h1>
          <p>
            Learning to drive brings together people, schedules, and small steps
            forward. DSP helps learners find instructors and keeps the work
            around every lesson organized.
          </p>
          <p>
            From choosing your first instructor to managing a teaching schedule,
            your next step should be clear.
          </p>
          <div className="dsp-about__actions">
            <Link
              className="dsp-public-button dsp-public-button--primary"
              to="/professional"
            >
              Find driving lessons
            </Link>
            <Link className="dsp-public-button" to="/auth/signup">
              Join DSP
            </Link>
          </div>
        </div>
        <img
          src="/images/landing/driving-lesson.webp"
          alt="A learner and instructor discussing a driving lesson in a parked car"
          width="1536"
          height="1024"
        />
      </section>
      <section
        className="dsp-about__audiences"
        aria-labelledby="about-audiences"
      >
        <h2 id="about-audiences">
          One place for the people behind every lesson
        </h2>
        <div>
          {audiences.map(({ icon: Icon, title, copy }) => (
            <article key={title}>
              <Icon size={28} aria-hidden="true" />
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="dsp-about__support">
        <h2>A little help with your next step</h2>
        <p>Have a question about your account, a lesson, or how DSP works?</p>
        <Link to="/contact">Contact our support team</Link>
      </section>
    </div>
  );
}
