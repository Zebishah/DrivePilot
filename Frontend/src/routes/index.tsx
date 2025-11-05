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
import AdminOverview, {
  AnalyticsDashboard,
} from "../pages/private/admin-dashboard/adminOverview";
import AdminAccess from "../pages/private/admin-dashboard/AdminAccess";
import ProfileSetting from "../pages/private/teacher-dashboard/profileSetting";
import EditProfile from "../pages/private/teacher-dashboard/editProfile";
import AllInstructor from "../components/ProfessionalInstructor/Allinstructor";
import OtpVerification from "../pages/public/auth/OtpVerify";
import TwoFactorAuth from "../pages/public/auth/TwoFactorAuth";
import StudentProfileSetting from "../pages/private/student-dashboard/profileSetting";
import StudentBookings from "../pages/private/student-dashboard/bookLesson";
import SearchInstructor from "../pages/private/student-dashboard/searchInstructor";
import BookingDetails from "../pages/private/student-dashboard/bookingDetails";
import EditStudentProfile from "../pages/private/student-dashboard/EditStudentProfile";
import QuestionsAnswers from "../pages/private/admin-dashboard/HelpSupport";
import FAQPage from "../pages/private/teacher-dashboard/HelpSuportPage";
import SuperAdminRoute from "./SuperAdminRoutes";
import StudentFeedback from "../pages/private/teacher-dashboard/CompleteBookings";
import FeedbackForm from "../pages/private/teacher-dashboard/FeedBackForm";
import StudentsProgressDashboard from "../pages/private/teacher-dashboard/MyStudentsTrack";
import StudentDashboard from "../pages/private/teacher-dashboard/StudentProgress";
import Dashboard from "../components/StudentComponents/ReviewTab/Dashboard";
import ReviewForm from "../components/StudentComponents/ReviewTab/ReviewForm";
import ReviewDisplay from "../components/StudentComponents/ReviewTab/ReviewDisplay";
import ReviewFormPage from "../components/StudentComponents/ReviewTab/ReviewForm";
import ReviewDisplayPage from "../components/StudentComponents/ReviewTab/ReviewDisplay";
import AllBookingSlotsPage from "../components/StudentComponents/ReviewTab/AllBookingSlotPage";
import { DocumentDetailsPage } from "../pages/private/admin-dashboard/DocumentsDetailPage";
import InstructorDocumentsTable from "../components/AdminComponents/InstructorDocumentsTable";
import { InstructorManagement } from "../pages/private/admin-dashboard/InstructorManagement";
import { StudentManagement } from "../pages/private/admin-dashboard/StudentManagement";
import InstructorChatPage from "../pages/private/teacher-dashboard/chat";
import StudentChatPage from "../pages/private/student-dashboard/chat";
import { InstructorAnalyticsDashboard } from "../components/InstructorComponent/InstructorAnalytics/InstructorAnalyticsDashboard";

import StudentBookingTable from "../components/AdminComponents/StudentBookingTable";
import StudentBookingWInst from "../components/InstructorComponent/StudentBookingWInst";
import FeedBackAndRating from "../components/StudentComponents/ReviewTab/OnlyReviewsTab";

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
        children: [
          { path: "edit-profile", element: <EditStudentProfile /> }, // Nested under settings
        ],
      },
      {
        path: "book",
        element: <StudentBookings />,
      },
      {
        path: "search",
        element: <SearchInstructor />,
      },
      { path: "search/instructors/:id", element: <OurInstructor /> },
      { path: "booking-details", element: <BookingDetails /> },
      { path: "help-support", element: <FAQPage /> },
      { path: "reviews", element: <Dashboard /> },
      { path: "Feedback", element: <FeedBackAndRating /> },
      { path: "review-form", element: <ReviewForm /> },
      { path: "review-display", element: <ReviewDisplay /> },
      { path: "allBookingSlots", element: <AllBookingSlotsPage /> },
      { path: "chat", element: <StudentChatPage /> },
    ],
  },
  {
    path: "/teacher-dashboard",
    element: <TeacherRoutes />,
    children: [
      { path: "overview", element: <InstructorAnalyticsDashboard /> },
      {
        path: "settings",
        element: <ProfileSetting />,
        children: [
          { path: "edit-profile", element: <EditProfile /> }, // Nested under settings
        ],
      },

      { path: "search/instructors/:id", element: <OurInstructor /> },
      { path: "booking-details", element: <BookingDetails /> },
      { path: "help-support", element: <FAQPage /> },
      { path: "feedback", element: <StudentFeedback /> },
      { path: "bookingManagement", element: <StudentBookingWInst /> },
      {
        path: "feedbackForm/:bookingId/:lessonId/:studentId",
        element: <FeedbackForm />,
      },
      { path: "studentProgress/:studentId", element: <StudentDashboard /> },
      { path: "my-students", element: <StudentsProgressDashboard /> },
      { path: "chat", element: <InstructorChatPage /> },
    ],
  },
  {
    path: "/admin-dashboard",
    element: <AdminRoutes />,
    children: [
      { path: "overview", element: <AnalyticsDashboard /> },
      { path: "bookingManagement", element: <StudentBookingTable /> },
      { path: "admin-access", element: <AdminAccess /> },
      {
        path: "documentsManagement",
        element: <InstructorDocumentsTable />,
      },
      {
        path: "InstructorManagement",
        element: <InstructorManagement />,
      },
      {
        path: "StudentManagement",
        element: <StudentManagement />,
      },
      {
        path: "document-details/:instructorId/:documentType",
        element: <DocumentDetailsPage />,
      },
      {
        path: "help-support",
        element: (
          <SuperAdminRoute>
            <QuestionsAnswers />
          </SuperAdminRoute>
        ),
      },
    ],
  },
  {
    path: "*",
    element: <NotFound />,
  },
]);

export default router;
