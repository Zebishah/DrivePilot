import { lazy, Suspense } from "react";
import type { ComponentType } from "react";
import { createBrowserRouter, Outlet } from "react-router-dom";
import SuperAdminRoute from "./SuperAdminRoutes";
import RouteLoadingFallback from "../components/loaders/RouteLoadingFallback";
import RouteErrorBoundary from "../components/common/RouteErrorBoundary";
import ApplicationAppearance from "../themes/ApplicationAppearance";

function lazyPage(loader: () => Promise<{ default: ComponentType }>) {
  const Page = lazy(loader);
  return (
    <RouteErrorBoundary>
      <Suspense fallback={<RouteLoadingFallback />}>
        <Page />
      </Suspense>
    </RouteErrorBoundary>
  );
}

const router = createBrowserRouter([
  {
    element: <ApplicationAppearance />,
    children: [
      {
        path: "/",
        element: lazyPage(() => import("./PublicRoutes")),
        children: [
          {
            path: "instructors/:id",
            element: lazyPage(() => import("../pages/public/OurInstructor")),
          },
          { path: "", element: lazyPage(() => import("../pages/public/Home")) },
          {
            path: "about",
            element: lazyPage(() => import("../pages/public/AboutUs")),
          },
          {
            path: "contact",
            element: lazyPage(() => import("../pages/public/Contact")),
          },
          {
            path: "terms",
            element: lazyPage(() => import("../pages/public/LegalPage")),
          },
          {
            path: "privacy",
            element: lazyPage(() => import("../pages/public/LegalPage")),
          },
          {
            path: "professional",
            element: lazyPage(
              () =>
                import("../components/ProfessionalInstructor/Allinstructor"),
            ),
          },
        ],
      },
      {
        path: "signup/:token",
        element: lazyPage(() => import("../pages/public/auth/SignUp")),
      },
      {
        path: "/auth",
        children: [
          {
            path: "signin",
            element: lazyPage(() => import("../pages/public/auth/SignIn")),
          },
          {
            path: "signup/",
            element: lazyPage(() => import("../pages/public/auth/SignUp")),
          },
          {
            path: "forgot-password",
            element: lazyPage(
              () => import("../pages/public/auth/ForgotPassoword"),
            ),
          },
          {
            path: "reset-password/:token",
            element: lazyPage(
              () => import("../pages/public/auth/ResetPassword"),
            ),
          },
          {
            path: "auth-success",
            element: lazyPage(() => import("../pages/public/auth/AuthSucess")),
          },
          {
            path: "verificationPage/:email",
            element: lazyPage(() => import("../pages/public/auth/OtpVerify")),
          },
          {
            path: "twoFactorAuthPage/:email",
            element: lazyPage(
              () => import("../pages/public/auth/TwoFactorAuth"),
            ),
          },
        ],
      },
      {
        path: "/onboarding",
        element: lazyPage(() => import("./OnBoardingRoutes")),
        children: [
          {
            path: "role-selection",
            element: lazyPage(
              () => import("../pages/private/onboarding/RoleSelection"),
            ),
          },
          {
            path: "instructor-profile",
            element: lazyPage(
              () =>
                import("../pages/private/onboarding/InstructorProfileSetup"),
            ),
          },
          {
            path: "student-profile",
            element: lazyPage(
              () => import("../pages/private/onboarding/StudentProfileSetup"),
            ),
          },
        ],
      },
      {
        path: "/student-dashboard",
        element: lazyPage(() => import("./StudentRoutes")),
        children: [
          {
            path: "overview",
            element: lazyPage(
              () =>
                import("../pages/private/student-dashboard/studentOverview"),
            ),
          },
          {
            path: "settings",
            element: lazyPage(
              () => import("../pages/private/student-dashboard/profileSetting"),
            ),
            children: [
              {
                path: "edit-profile",
                element: lazyPage(
                  () =>
                    import("../pages/private/student-dashboard/EditStudentProfile"),
                ),
              },
            ],
          },
          {
            path: "book",
            element: lazyPage(
              () => import("../pages/private/student-dashboard/bookLesson"),
            ),
          },
          {
            path: "learning-timeline",
            element: lazyPage(
              () =>
                import("../pages/private/student-dashboard/StudentLearningTimelinePage"),
            ),
          },
          {
            path: "payment-history",
            element: lazyPage(
              () =>
                import("../pages/private/student-dashboard/StudentPaymentHistoryPage"),
            ),
          },
          {
            path: "search",
            element: lazyPage(
              () =>
                import("../pages/private/student-dashboard/searchInstructor"),
            ),
          },
          {
            path: "saved-instructors",
            element: lazyPage(
              () =>
                import("../pages/private/student-dashboard/SavedInstructorsPage"),
            ),
          },
          {
            path: "notifications",
            element: lazyPage(
              () => import("../pages/private/shared/NotificationCenterPage"),
            ),
          },
          {
            path: "notification-settings",
            element: lazyPage(
              () =>
                import("../pages/private/shared/NotificationPreferencesPage"),
            ),
          },
          {
            path: "search/instructors/:id",
            element: lazyPage(() => import("../pages/public/OurInstructor")),
          },
          {
            path: "booking-details",
            element: lazyPage(
              () => import("../pages/private/student-dashboard/bookingDetails"),
            ),
          },
          {
            path: "lesson/:bookingId",
            element: lazyPage(
              () =>
                import("../pages/private/student-dashboard/StudentLessonDetailPage"),
            ),
          },
          {
            path: "refund-request",
            element: lazyPage(
              () =>
                import("../pages/private/student-dashboard/RefundRequestPage"),
            ),
          },
          {
            path: "complete-payment",
            element: lazyPage(() =>
              import("../pages/private/student-dashboard/CompletePaymentPage").then(
                (module) => ({ default: module.CompletePaymentPage }),
              ),
            ),
          },
          {
            path: "help-support",
            element: lazyPage(
              () =>
                import("../pages/private/student-dashboard/StudentHelpSupportPage"),
            ),
          },
          {
            path: "reviews",
            element: lazyPage(
              () =>
                import("../components/StudentComponents/ReviewTab/Dashboard"),
            ),
          },
          {
            path: "Feedback",
            element: lazyPage(
              () =>
                import("../components/StudentComponents/ReviewTab/OnlyReviewsTab"),
            ),
          },
          {
            path: "feedback-details",
            element: lazyPage(
              () =>
                import("../components/StudentComponents/ReviewTab/FeedbackDetailsPage"),
            ),
          },
          {
            path: "review-form",
            element: lazyPage(
              () =>
                import("../components/StudentComponents/ReviewTab/ReviewForm"),
            ),
          },
          {
            path: "review-display",
            element: lazyPage(
              () =>
                import("../components/StudentComponents/ReviewTab/ReviewDisplay"),
            ),
          },
          {
            path: "allBookingSlots",
            element: lazyPage(
              () =>
                import("../components/StudentComponents/ReviewTab/AllBookingSlotPage"),
            ),
          },
          {
            path: "chat",
            element: lazyPage(
              () => import("../pages/private/student-dashboard/chat"),
            ),
          },
        ],
      },
      {
        path: "/payment",
        element: <Outlet />,
        children: [
          {
            path: "refresh",
            element: lazyPage(
              () =>
                import("../pages/private/teacher-dashboard/StripePaymentRefresh"),
            ),
          },
          {
            path: "complete",
            element: lazyPage(
              () =>
                import("../pages/private/teacher-dashboard/StripePaymentComplete"),
            ),
          },
        ],
      },
      {
        path: "/teacher-dashboard",
        element: lazyPage(() => import("./TeacherRoutes")),
        children: [
          {
            path: "overview",
            element: lazyPage(() =>
              import("../components/InstructorComponent/InstructorAnalytics/InstructorAnalyticsDashboard").then(
                (module) => ({ default: module.InstructorAnalyticsDashboard }),
              ),
            ),
          },
          {
            path: "settings",
            element: lazyPage(
              () => import("../pages/private/teacher-dashboard/profileSetting"),
            ),
            children: [
              {
                path: "edit-profile",
                element: lazyPage(
                  () =>
                    import("../pages/private/teacher-dashboard/editProfile"),
                ),
              },
            ],
          },
          {
            path: "tariff-management",
            element: lazyPage(
              () =>
                import("../pages/private/teacher-dashboard/InstructorTariffManagementPage"),
            ),
          },
          {
            path: "documents",
            element: lazyPage(
              () =>
                import("../pages/private/teacher-dashboard/InstructorDocumentsPage"),
            ),
          },
          {
            path: "availability",
            element: lazyPage(
              () =>
                import("../pages/private/teacher-dashboard/InstructorAvailabilityPage"),
            ),
          },
          {
            path: "reviews",
            element: lazyPage(
              () =>
                import("../pages/private/teacher-dashboard/InstructorReviewsPage"),
            ),
          },
          {
            path: "payment-management",
            element: lazyPage(
              () =>
                import("../pages/private/teacher-dashboard/InstructorPaymentManagementPage"),
            ),
          },
          {
            path: "search/instructors/:id",
            element: lazyPage(() => import("../pages/public/OurInstructor")),
          },
          {
            path: "booking-details",
            element: lazyPage(
              () => import("../pages/private/student-dashboard/bookingDetails"),
            ),
          },
          {
            path: "help-support",
            element: lazyPage(
              () => import("../pages/private/teacher-dashboard/HelpSuportPage"),
            ),
          },
          {
            path: "feedback",
            element: lazyPage(
              () =>
                import("../pages/private/teacher-dashboard/CompleteBookings"),
            ),
          },
          {
            path: "bookingManagement",
            element: lazyPage(
              () =>
                import("../components/InstructorComponent/StudentBookingWInst"),
            ),
          },
          {
            path: "feedbackForm/:bookingId/:lessonId/:studentId",
            element: lazyPage(
              () => import("../features/feedback/pages/FeedbackForm"),
            ),
          },
          {
            path: "studentProgress/:studentId",
            element: lazyPage(
              () =>
                import("../pages/private/teacher-dashboard/StudentProgress"),
            ),
          },
          {
            path: "my-students",
            element: lazyPage(
              () =>
                import("../pages/private/teacher-dashboard/MyStudentsTrack"),
            ),
          },
          {
            path: "my-students/:studentId",
            element: lazyPage(
              () =>
                import("../pages/private/teacher-dashboard/InstructorStudentDetailPage"),
            ),
          },
          {
            path: "notifications",
            element: lazyPage(
              () => import("../pages/private/shared/NotificationCenterPage"),
            ),
          },
          {
            path: "notification-settings",
            element: lazyPage(
              () =>
                import("../pages/private/shared/NotificationPreferencesPage"),
            ),
          },
          {
            path: "chat",
            element: lazyPage(
              () => import("../pages/private/teacher-dashboard/chat"),
            ),
          },
          {
            path: "transaction-history",
            element: lazyPage(
              () =>
                import("../pages/private/teacher-dashboard/InstructorTransactionHistoryPage"),
            ),
          },
        ],
      },
      {
        path: "/admin-dashboard",
        element: lazyPage(() => import("./AdminRoutes")),
        children: [
          {
            path: "overview",
            element: lazyPage(() =>
              import("../pages/private/admin-dashboard/adminOverview").then(
                (module) => ({ default: module.AnalyticsDashboard }),
              ),
            ),
          },
          {
            path: "analytics",
            element: lazyPage(
              () => import("../pages/private/admin-dashboard/AnalyticsReports"),
            ),
          },
          {
            path: "bookingManagement",
            element: lazyPage(
              () => import("../components/AdminComponents/StudentBookingTable"),
            ),
          },
          {
            path: "admin-access",
            element: lazyPage(
              () => import("../pages/private/admin-dashboard/AdminAccess"),
            ),
          },
          {
            path: "documentsManagement",
            element: lazyPage(
              () =>
                import("../components/AdminComponents/InstructorDocumentsTable"),
            ),
          },
          {
            path: "InstructorManagement",
            element: lazyPage(() =>
              import("../pages/private/admin-dashboard/InstructorManagement").then(
                (module) => ({ default: module.InstructorManagement }),
              ),
            ),
          },
          {
            path: "StudentManagement",
            element: lazyPage(() =>
              import("../pages/private/admin-dashboard/StudentManagement").then(
                (module) => ({ default: module.StudentManagement }),
              ),
            ),
          },
          {
            path: "transactions",
            element: lazyPage(
              () =>
                import("../pages/private/admin-dashboard/AdminTransactionsPage"),
            ),
          },
          {
            path: "refund-requests",
            element: lazyPage(
              () =>
                import("../pages/private/admin-dashboard/AdminRefundRequestsPage"),
            ),
          },
          {
            path: "reviews",
            element: lazyPage(
              () => import("../pages/private/admin-dashboard/AdminReviewsPage"),
            ),
          },
          {
            path: "student-feedback",
            element: lazyPage(
              () =>
                import("../pages/private/admin-dashboard/AdminStudentFeedbackPage"),
            ),
          },
          {
            path: "notifications",
            element: lazyPage(
              () => import("../pages/private/shared/NotificationCenterPage"),
            ),
          },
          {
            path: "document-details/:instructorId/:documentType",
            element: lazyPage(() =>
              import("../pages/private/admin-dashboard/DocumentsDetailPage").then(
                (module) => ({ default: module.DocumentDetailsPage }),
              ),
            ),
          },
          {
            path: "help-support",
            element: (
              <SuperAdminRoute>
                {lazyPage(
                  () => import("../pages/private/admin-dashboard/HelpSupport"),
                )}
              </SuperAdminRoute>
            ),
          },
        ],
      },
      {
        path: "*",
        element: lazyPage(() => import("../components/common/NotFound")),
      },
    ],
  },
]);

export default router;
