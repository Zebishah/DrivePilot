import { createBrowserRouter } from "react-router-dom";
import PublicRoutes from "./PublicRoutes";
import OurInstructor from "../pages/public/OurInstructor";
import Home from "../pages/public/Home";
import AboutUs from "../pages/public/AboutUs";
import Contact from "../pages/public/Contact";
import SignIn from "../pages/public/auth/SignIn";
import SignUp from "../pages/public/auth/SignUp";
import ForgotPassword from "../pages/public/auth/ForgotPassoword";
import ResetPassword from "../pages/public/auth/ResetPassword";
import OnboardingRoutes from "./OnBoardingRoutes";
import RoleSelection from "../pages/private/onboarding/RoleSelection";
import InstructorProfileSetup from "../pages/private/onboarding/InstructorProfileSetup";
import NotFound from "../components/common/NotFound";
import StudentProfileSetup from "../pages/private/onboarding/StudentProfileSetup";
import StudentRoutes from "./StudentRoutes";

import TeacherRoutes from "./TeacherRoutes";
import AuthSuccess from "../pages/public/auth/AuthSucess";
import TeacherOverview from "../pages/private/teacher-dashboard/teacher0verview";
import StudentOverview from "../pages/private/student-dashboard/studentOverview";

const router = createBrowserRouter([
    {
        path: "/",
        element: <PublicRoutes />,
        children: [
            { path: "instructors", element: <OurInstructor /> },
            { path: "", element: <Home /> },
            { path: "about", element: <AboutUs /> },
            { path: "contact", element: <Contact /> },
        ],
    },
    {
        path: "/auth",
        children: [
            { path: "signin", element: <SignIn /> },
            { path: "signup", element: <SignUp /> },
            { path: "forgot-password", element: <ForgotPassword /> },
            { path: "reset-password", element: <ResetPassword /> },
            { path: "auth-success", element: <AuthSuccess /> },
        ],
    },
    {
        path: "/onboarding",
        element: <OnboardingRoutes />,
        children: [
            { path: "role-selection", element: <RoleSelection /> },
            { path: "instructor-profile", element: <InstructorProfileSetup /> },
            { path: "student-profile", element: <StudentProfileSetup /> },
        ],
    },
    {
        path: "/student-dashboard",
        element: <StudentRoutes />,
        children: [
            { path: "overview", element: <StudentOverview /> },
        ],
    },
    {
        path: "/teacher-dashboard",
        element: <TeacherRoutes />,
        children: [
            { path: "overview", element: <TeacherOverview /> },
        ],
    },
    {
        path: "*",
        element: <NotFound />,
    },
]);

export default router;