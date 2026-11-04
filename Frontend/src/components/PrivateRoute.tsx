import type React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import DSPBrandLoader from "./loaders/DSPBrandLoader";

const AuthLoading = () => (
  <DSPBrandLoader message="Checking your session..." />
);

export const OnboardingPrivateRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { isAuthenticated, user, authLoading, authInitialized } = useAuth();
  const location = useLocation();

  if (authLoading || !authInitialized) return <AuthLoading />;

  if (!isAuthenticated || !user?.isUserVerified) {
    return <Navigate to="/auth/signin" replace state={{ from: location }} />;
  }

  if (user.isProfileComplete) {
    if (user.role === "Student") return <Navigate to="/student-dashboard/overview" replace />;
    if (user.role === "Instructor") return <Navigate to="/teacher-dashboard/overview" replace />;
    return <Navigate to="/auth/signin" replace />;
  }

  if (user.role === "UserBase") {
    return location.pathname.endsWith("/role-selection") ? <>{children}</> : <Navigate to="/onboarding/role-selection" replace />;
  }

  if (user.role === "Student") {
    return location.pathname.endsWith("/student-profile") ? <>{children}</> : <Navigate to="/onboarding/student-profile" replace />;
  }

  if (user.role === "Instructor") {
    return location.pathname.endsWith("/instructor-profile") ? <>{children}</> : <Navigate to="/onboarding/instructor-profile" replace />;
  }

  return <Navigate to="/auth/signin" replace />;
};

export const TempPrivateRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { isTempAuthenticated, isAuthenticated, user, authLoading, authInitialized } = useAuth();

  if (authLoading || !authInitialized) return <AuthLoading />;

  return (isTempAuthenticated || isAuthenticated) && user?.isUserVerified ? (
    <>{children}</>
  ) : (
    <Navigate to="/auth/signin" replace />
  );
};

export const StudentPrivateRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { isAuthenticated, user } = useAuth();
  return isAuthenticated &&
    user?.role === "Student" &&
    user?.isProfileComplete ? (
    <>{children}</>
  ) : (
    <Navigate to="/auth/signin" replace />
  );
};

export const TeacherPrivateRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { isAuthenticated, user } = useAuth();
  return isAuthenticated &&
    user?.role === "Instructor" &&
    user?.isProfileComplete ? (
    <>{children}</>
  ) : (
    <Navigate to="/auth/signin" replace />
  );
};

export const AdminPrivateRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { isAuthenticated, user } = useAuth();
  return isAuthenticated && user?.role === "Admin" ? (
    <>{children}</>
  ) : (
    <Navigate to="/auth/signin" replace />
  );
};
