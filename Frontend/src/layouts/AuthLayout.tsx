import type React from "react";
import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import BrandLogo from "../components/BrandLogo";

interface AuthLayoutProps {
  children: React.ReactNode;
  backgroundImage?: string;
}

const highlights = [
  "Find and compare instructors",
  "Book and manage lessons",
  "Track learning progress",
  "Secure payment workflows",
];

const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const nav = useNavigate();
  useEffect(() => {
    if (isAuthenticated && user?.isProfileComplete) {
      if (user.role === "Student") nav("/student-dashboard/overview");
      else if (user.role === "Instructor") nav("/teacher-dashboard/overview");
      else if (user.role === "Admin") nav("/admin-dashboard/overview");
    }
  }, [user, isAuthenticated, nav]);

  return (
    <div className="dsp-auth-layout">
      <aside className="dsp-auth-brand-panel">
        <div className="dsp-auth-brand-panel__glow dsp-auth-brand-panel__glow--one" />
        <div className="dsp-auth-brand-panel__glow dsp-auth-brand-panel__glow--two" />
        <div className="dsp-auth-brand-panel__content">
          <BrandLogo className="dsp-auth-brand" theme="dark" size="lg" to="/" aria-label="DSP Marketplace home" />
          <span className="dsp-auth-eyebrow">DSP MARKETPLACE</span>
          <h1>Your driving-school journey, connected.</h1>
          <p>
            Find instructors, book lessons, track progress, manage teaching, and
            run operations from one focused platform.
          </p>
          <ul className="dsp-auth-highlights">
            {highlights.map((highlight) => (
              <li key={highlight}>
                <span aria-hidden="true">✓</span>
                {highlight}
              </li>
            ))}
          </ul>
          <div className="dsp-auth-role-stack" aria-label="DSP workspace roles">
            <div>
              <strong>Student</strong>
              <span>Find and book instructors</span>
            </div>
            <div>
              <strong>Instructor</strong>
              <span>Manage lessons and students</span>
            </div>
            <div>
              <strong>Admin</strong>
              <span>Run platform operations</span>
            </div>
          </div>
        </div>
        <span className="dsp-auth-brand-panel__footer">
          Learn clearly. Teach confidently. Operate simply.
        </span>
      </aside>
      <main className="dsp-auth-main">
        <div className="dsp-auth-form-shell">{children}</div>
      </main>
    </div>
  );
};

export default AuthLayout;
