import React from "react";
import "./legal.css";
import { ArrowLeft, CheckCircle2, ShieldCheck } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

type LegalPageKind = "terms" | "privacy";

const legalContent: Record<LegalPageKind, {
  eyebrow: string;
  title: string;
  intro: string;
  updated: string;
  sections: Array<{ title: string; body: string }>;
}> = {
  terms: {
    eyebrow: "Drive Pilot AGREEMENT",
    title: "Terms of Use",
    intro: "These terms explain the rules for using Drive Pilot to discover instructors, book driving lessons, and manage your learning or teaching workspace.",
    updated: "September 23, 2026",
    sections: [
      { title: "1. Using Drive Pilot", body: "You may use Drive Pilot only for lawful purposes and in accordance with these terms. Keep your account information accurate, protect your login details, and do not use another person’s account without permission." },
      { title: "2. Accounts and roles", body: "Drive Pilot supports student, instructor, and administrative workspaces. Access and available features depend on your role, account status, and any verification required for that workspace." },
      { title: "3. Lessons, bookings, and payments", body: "Students and instructors are responsible for reviewing booking details before confirming a lesson. Payment, refund, cancellation, and payout information shown in the platform is provided to support the booking workflow; applicable terms may also be set by the relevant payment provider." },
      { title: "4. Acceptable conduct", body: "Do not misuse the platform, interfere with its operation, attempt to access protected data, upload malicious content, or provide information that is fraudulent, misleading, or unlawful." },
      { title: "5. Platform availability", body: "We work to keep Drive Pilot reliable, but features may occasionally be unavailable for maintenance, updates, security reasons, or circumstances outside our control." },
      { title: "6. Changes and termination", body: "We may update these terms as the product evolves. We may suspend or close access where there is a security concern, a breach of these terms, or a legal requirement. Material changes will be communicated through the platform when appropriate." },
      { title: "7. Contact", body: "If you have a question about these terms or your account, contact the Drive Pilot support team through the Help & Support channel." },
    ],
  },
  privacy: {
    eyebrow: "Drive Pilot DATA NOTICE",
    title: "Privacy Policy",
    intro: "This policy describes the information Drive Pilot uses to provide safer bookings, connected workspaces, payments, progress tracking, and support.",
    updated: "September 23, 2026",
    sections: [
      { title: "1. Information we collect", body: "Depending on how you use the platform, we may collect account details, contact information, profile information, booking and lesson activity, payment-related status, documents submitted for verification, messages, feedback, and technical information needed to keep the service secure." },
      { title: "2. How we use information", body: "We use this information to create and secure accounts, connect students with instructors, manage lessons and payments, support progress and feedback workflows, communicate important updates, prevent misuse, and improve Drive Pilot." },
      { title: "3. Sharing and service providers", body: "Information is shared only as needed to operate the requested workflow, such as with an instructor or student involved in a booking, payment and infrastructure providers, support personnel, or authorities where disclosure is required by law." },
      { title: "4. Security and retention", body: "We use access controls and reasonable technical and organizational safeguards to protect platform data. We retain information only for as long as needed for the purposes described here, legitimate business records, dispute handling, security, or legal obligations." },
      { title: "5. Your choices", body: "You can review and update account information through your workspace where those controls are available. You may also contact support with questions about your information or to request help with an applicable privacy choice." },
      { title: "6. Cookies and technical data", body: "Drive Pilot may use essential storage, session data, and technical logs to authenticate users, remember preferences, understand service health, and protect the platform. We do not use these tools to change the core purpose of your account data." },
      { title: "7. Updates and contact", body: "We may update this policy when our workflows or legal obligations change. The date at the top of this page shows when it was last updated. Contact Drive Pilot support if you need more information." },
    ],
  },
};

const LegalPage: React.FC = () => {
  const location = useLocation();
  const kind: LegalPageKind = location.pathname === "/privacy" ? "privacy" : "terms";
  const content = legalContent[kind];

  return (
    <div className="dsp-legal-page">
      <div className="dsp-public-container">
        <div className="dsp-legal-page__back-row">
          <Link className="dsp-legal-page__back" to="/auth/signup"><ArrowLeft size={16} />Back to sign up</Link>
          <span className="dsp-legal-page__updated">Last updated {content.updated}</span>
        </div>
        <header className="dsp-legal-page__hero">
          <span className="dsp-public-eyebrow">{content.eyebrow}</span>
          <div className="dsp-legal-page__title-row">
            <span className="dsp-legal-page__icon" aria-hidden="true">{kind === "privacy" ? <ShieldCheck size={23} /> : <CheckCircle2 size={23} />}</span>
            <h1>{content.title}</h1>
          </div>
          <p>{content.intro}</p>
        </header>
        <div className="dsp-legal-page__layout">
          <aside className="dsp-legal-page__aside" aria-label="Legal pages">
            <span>On this page</span>
            <Link className={kind === "terms" ? "is-active" : ""} to="/terms">Terms of Use</Link>
            <Link className={kind === "privacy" ? "is-active" : ""} to="/privacy">Privacy Policy</Link>
          </aside>
          <article className="dsp-legal-page__content">
            {content.sections.map((section) => <section key={section.title}><h2>{section.title}</h2><p>{section.body}</p></section>)}
            <div className="dsp-legal-page__footer-note"><ShieldCheck size={18} /><span>Your information and platform access are handled with care across the Drive Pilot workflow.</span></div>
          </article>
        </div>
        <div className="dsp-legal-page__cta">
          <div><strong>Ready to continue?</strong><span>Return to account creation when you’re ready.</span></div>
          <Link className="dsp-public-button dsp-public-button--primary dsp-public-button--small" to="/auth/signup">Create an account <span aria-hidden="true">→</span></Link>
        </div>
      </div>
    </div>
  );
};

export default LegalPage;
