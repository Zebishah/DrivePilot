import { ArrowDown, Bot, CalendarDays, ShieldCheck } from "lucide-react";
import { openAssistant } from "../../features/assistant/assistantEvents";
import InstructorInfo from "./InstructorInfo";

export default function AllInstructor() {
  return (
    <div className="dsp-marketplace">
      <section className="dsp-market-hero ai-container">
        <div className="dsp-market-hero__copy">
          <span className="ai-eyebrow">
            HUMAN INSTRUCTION. A SMARTER JOURNEY.
          </span>
          <h1>
            Your road.
            <br />
            The right <em>instructor.</em>
          </h1>
          <p>
            Find someone who makes you feel at ease behind the wheel. Compare
            driving instructors, explore lesson prices, and book your next step
            with confidence.
          </p>
          <div className="dsp-market-hero__actions">
            <a className="ai-button ai-button--mint" href="#instructor-results">
              Explore instructors <ArrowDown size={16} />
            </a>
            <button
              type="button"
              className="ai-button ai-button--outline"
              onClick={() => openAssistant("How do I choose an instructor?")}
            >
              <Bot size={17} /> Help me get started
            </button>
          </div>
          <div className="dsp-market-hero__details">
            <span>
              <ShieldCheck size={15} /> Instructor profiles & reviews
            </span>
            <span>
              <CalendarDays size={15} /> Real lesson availability
            </span>
          </div>
        </div>
        <div className="dsp-market-hero__visual">
          <img
            src="/images/landing/driving-lesson.webp"
            alt="A learner gaining confidence behind the wheel during a driving lesson"
          />
          <div className="dsp-market-hero__caption">
            <span className="dsp-market-orbit" />
            <div>
              <strong>Confidence starts with connection.</strong>
              <small>Your instructor. Your pace. Your next milestone.</small>
            </div>
          </div>
          <span className="dsp-market-hero__label">
            THE NEXT TURN IS YOURS ↗
          </span>
        </div>
      </section>
      <section
        id="instructor-results"
        className="ai-container dsp-market-results"
      >
        <div className="dsp-market-section-heading">
          <div>
            <span className="ai-eyebrow">FIND YOUR FIT</span>
            <h2>Meet your next instructor.</h2>
            <p>
              Filter by what matters to you. Open a profile to see availability
              and book.
            </p>
          </div>
        </div>
        <InstructorInfo />
      </section>
    </div>
  );
}
