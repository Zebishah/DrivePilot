import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export const TempPrivateRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { isTempAuthenticated, user, tempUser } = useAuth();
  return isTempAuthenticated && user?.isUserVerified ? (
    <>{children}</>
  ) : (
    <Navigate to="/auth/signin" />
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
    <Navigate to="/auth/signin" />
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
    <Navigate to="/auth/signin" />
  );
};

export const AdminPrivateRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { isAuthenticated, user } = useAuth();
  return isAuthenticated && user?.role === "Admin" ? (
    <>{children}</>
  ) : (
    <Navigate to="/auth/signin" />
  );
};
