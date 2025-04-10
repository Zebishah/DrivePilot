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
import AdminRoutes from "./AdminRoutes";
import AdminOverview from "../pages/private/admin-dashboard/adminOverview";
import AdminAccess from "../pages/private/admin-dashboard/AdminAccess";
import ProfileSetting from "../pages/private/teacher-dashboard/profileSetting";
import EditProfile from "../pages/private/teacher-dashboard/editProfile";
import AllInstructor from "../components/ProfessionalInstructor/Allinstructor";
import OtpVerification from "../pages/public/auth/OtpVerify";
import TwoFactorAuth from "../pages/public/auth/TwoFactorAuth";
import StudentProfileSetting from "../pages/private/student-dashboard/profileSetting";
import StudentBookings from "../pages/private/student-dashboard/bookLesson";
import SearchInstructor from "../pages/private/student-dashboard/searchInstructor";
import StudentInstructorInfo from "../pages/private/student-dashboard/instructorInfo";

const router = createBrowserRouter([
  {
    path: "/",
    element: <PublicRoutes />,
    children: [
      { path: "instructors/:id", element: <OurInstructor /> },
      { path: "", element: <Home /> },
      { path: "about", element: <AboutUs /> },
      { path: "contact", element: <Contact /> },
      { path: "professional", element: <AllInstructor /> },
    ],
  },
  { path: "signup/:token", element: <SignUp /> },
  {
    path: "/auth",
    children: [
      { path: "signin", element: <SignIn /> },
      { path: "signup/", element: <SignUp /> },
      { path: "forgot-password", element: <ForgotPassword /> },
      { path: "reset-password/:token", element: <ResetPassword /> },
      { path: "auth-success", element: <AuthSuccess /> },
      { path: "verificationPage/:email", element: <OtpVerification /> },
      { path: "twoFactorAuthPage/:email", element: <TwoFactorAuth /> },
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
      {
        path: "settings",
        element: <StudentProfileSetting />,
      },
      {
        path: "book",
        element: <StudentBookings />,
      },
      {
        path: "search",
        element: <SearchInstructor />,
        children: [
          { path: "instructors/:id", element: <StudentInstructorInfo /> }
        ]
      },
    ],
  },
  {
    path: "/teacher-dashboard",
    element: <TeacherRoutes />,
    children: [
      { path: "overview", element: <TeacherOverview /> },
      {
        path: "settings",
        element: <ProfileSetting />,
        children: [
          { path: "edit-profile", element: <EditProfile /> }, // Nested under settings
        ],
      },
    ],
  },
  {
    path: "/admin-dashboard",
    element: <AdminRoutes />,
    children: [
      { path: "overview", element: <AdminOverview /> },
      { path: "admin-access", element: <AdminAccess /> },
    ],
  },
  {
    path: "*",
    element: <NotFound />,
  },
]);

export default router;
