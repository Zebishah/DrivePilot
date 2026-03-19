/** @type {import('vitepress').UserConfig} */
export default {
  title: "DSP Developer Docs",
  description: "Developer-facing documentation for the DSP platform.",
  cleanUrls: true,
  themeConfig: {
    nav: [
      { text: "Home", link: "/" },
      { text: "Developer Index", link: "/DEVELOPER_INDEX" },
      { text: "Modules", link: "/modules/" }
    ],
    sidebar: [
      {
        text: "Getting Started",
        items: [
          { text: "Home", link: "/" },
          { text: "Docs Structure", link: "/README" },
          { text: "Developer Index", link: "/DEVELOPER_INDEX" }
        ]
      },
      {
        text: "Phase Docs",
        items: [
          { text: "Admin Dashboard", link: "/01_ADMIN_DASHBOARD" },
          { text: "Student Dashboard", link: "/02_STUDENT_DASHBOARD" }
        ]
      },
      {
        text: "Deep Module Docs",
        items: [
          { text: "Module Index", link: "/modules/" },
          { text: "Admin Dashboard", link: "/modules/admin-dashboard/" },
          { text: "Student Dashboard", link: "/modules/student-dashboard/" },
          { text: "Teacher Dashboard", link: "/modules/teacher-dashboard/" }
        ]
      },
      {
        text: "Admin Dashboard Modules",
        items: [
          { text: "Overview Analytics", link: "/modules/admin-dashboard/overview-analytics" },
          { text: "Admin Access", link: "/modules/admin-dashboard/admin-access" },
          { text: "Document Management", link: "/modules/admin-dashboard/document-management" },
          { text: "Instructor Management", link: "/modules/admin-dashboard/instructor-management" },
          { text: "Booking Management", link: "/modules/admin-dashboard/booking-management" },
          { text: "Student Management", link: "/modules/admin-dashboard/student-management" },
          { text: "Payment Management", link: "/modules/admin-dashboard/payment-management" },
          { text: "Refund Requests", link: "/modules/admin-dashboard/refund-requests" },
          { text: "Help Support", link: "/modules/admin-dashboard/help-support" }
        ]
      },
      {
        text: "Student Dashboard Modules",
        items: [
          { text: "Overview Analytics", link: "/modules/student-dashboard/overview-analytics" },
          { text: "Search Instructors", link: "/modules/student-dashboard/search-instructors" },
          { text: "Booked Lessons", link: "/modules/student-dashboard/booked-lessons" },
          { text: "Profile Setting", link: "/modules/student-dashboard/profile-setting" },
          { text: "Help Support", link: "/modules/student-dashboard/help-support" },
          { text: "Payment History", link: "/modules/student-dashboard/payment-history" },
          { text: "Progress Tracking", link: "/modules/student-dashboard/progress-tracking" },
          { text: "Feedback Rating", link: "/modules/student-dashboard/feedback-rating" },
          { text: "Messages Chat", link: "/modules/student-dashboard/messages-chat" }
        ]
      },
      {
        text: "Teacher Dashboard Modules",
        items: [
          { text: "Overview Analytics", link: "/modules/teacher-dashboard/overview-analytics" },
          { text: "Profile Setting", link: "/modules/teacher-dashboard/profile-setting" },
          { text: "Profile Documents", link: "/modules/teacher-dashboard/profile-documents" },
          { text: "Profile Price Management", link: "/modules/teacher-dashboard/profile-price-management" },
          { text: "Profile Availability Calendar", link: "/modules/teacher-dashboard/profile-availability-calendar" },
          { text: "Profile Ratings Scores", link: "/modules/teacher-dashboard/profile-ratings-scores" },
          { text: "Profile Payment Management", link: "/modules/teacher-dashboard/profile-payment-management" },
          { text: "Help Support", link: "/modules/teacher-dashboard/help-support" },
          { text: "Feedback", link: "/modules/teacher-dashboard/feedback" },
          { text: "My Students", link: "/modules/teacher-dashboard/my-students" },
          { text: "Booking Management", link: "/modules/teacher-dashboard/booking-management" },
          { text: "Messages Chat", link: "/modules/teacher-dashboard/messages-chat" },
          { text: "Transaction History", link: "/modules/teacher-dashboard/transaction-history" }
        ]
      },
      {
        text: "Reference Docs",
        items: [
          { text: "Business Rules", link: "/BUSINESS_RULES_CANCEL_REFUND_PAYMENT_PAYOUT" },
          { text: "Stripe & Payment Guide", link: "/BACKEND_STRIPE_AND_PAYMENT_GUIDE" },
          { text: "Client Handover", link: "/CLIENT_HANDOVER_STRIPE_PAYMENTS_AND_RULES" },
          { text: "Stripe Going Live", link: "/STRIPE_GOING_LIVE_RENDER" },
          { text: "Testing Checklist", link: "/TESTING_CHECKLIST_HANDOVER" },
          { text: "Commission & Stripe Guide", link: "/COMMISSION_AND_STRIPE_GUIDE" },
          { text: "Per-Instructor Commission", link: "/PER_INSTRUCTOR_COMMISSION_GUIDE" },
          { text: "Client Response: Stripe Review", link: "/CLIENT_RESPONSE_STRIPE_INTEGRATION_REVIEW" }
        ]
      }
    ],
    search: {
      provider: "local"
    },
    outline: "deep"
  }
};
