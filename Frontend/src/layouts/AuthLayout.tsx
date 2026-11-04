import type React from "react";
import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ShieldCheck, Sparkles } from "lucide-react";
import BrandLogo from "../components/BrandLogo";
import DrivingRoute from "../components/DrivingRoute";

interface AuthLayoutProps {
  children: React.ReactNode;
  backgroundImage?: string;
}

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
        <div className="dsp-auth-brand-panel__content">
          <BrandLogo
            className="dsp-auth-brand"
            theme="dark"
            size="lg"
            to="/"
            aria-label="DSP Marketplace home"
          />
          <span className="dsp-auth-eyebrow">
            THE DRIVING SCHOOL MARKETPLACE
          </span>
          <h1>
            Driving lessons.
            <br />
            <span>
              Real people.
              <br />
              Real confidence.
            </span>
          </h1>
          <p>
            Find a driving instructor, choose your lesson, and book online.
            Instructors can manage their students, schedule, and payments here
            too.
          </p>
          <div className="dsp-auth-artwork">
            <img
              src="/images/landing/driving-lesson.webp"
              width="1536"
              height="1024"
              alt="A learner and driving instructor discussing a lesson inside a parked car"
            />
            <DrivingRoute className="dsp-auth-artwork__route" />
            <div className="dsp-auth-intelligence">
              <Sparkles size={21} aria-hidden="true" />
              <span>
                <strong>Real instruction. Helpful AI.</strong>
                <small>Lessons, bookings, and progress. Connected.</small>
              </span>
            </div>
          </div>
          <div className="dsp-auth-role-stack" aria-label="DSP workspace roles">
            <div>
              <strong>Book driving lessons</strong>
              <span>Find and book instructors</span>
            </div>
            <div>
              <strong>Teach with DSP</strong>
              <span>Manage lessons and students</span>
            </div>
            <div>
              <strong>Manage your driving school</strong>
              <span>Run platform operations</span>
            </div>
          </div>
        </div>
        <span className="dsp-auth-brand-panel__footer">
          For learners, instructors, and the teams behind the lessons.
        </span>
      </aside>
      <main className="dsp-auth-main">
        <div className="dsp-auth-main__top">
          <Link to="/">
            <ArrowLeft size={14} /> Back to home
          </Link>
          <span>
            <ShieldCheck size={13} /> DRIVING LESSONS · SECURE ACCESS
          </span>
        </div>
        <div className="dsp-auth-service-note">
          <img
            src="/images/landing/driving-lesson.webp"
            alt=""
            width="55"
            height="43"
          />
          <span>
            <strong>Driving lessons, booked online.</strong>
            <small>For learners, instructors & driving schools.</small>
          </span>
        </div>
        <div className="dsp-auth-form-shell">{children}</div>
      </main>
    </div>
  );
};

export default AuthLayout;
