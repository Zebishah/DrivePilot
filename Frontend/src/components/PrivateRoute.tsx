import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const TempPrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { isTempAuthenticated } = useAuth();

    return isTempAuthenticated ? <>{children}</> : <Navigate to="/auth/signin" />;
};

export const StudentPrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { isAuthenticated, user } = useAuth();

    return isAuthenticated && user?.role === "Student" ? <>{children}</> : <Navigate to="/auth/signin" />;
};

export const TeacherPrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { isAuthenticated, user } = useAuth();

    return isAuthenticated && user?.role === "Instructor" ? <>{children}</> : <Navigate to="/auth/signin" />;
};