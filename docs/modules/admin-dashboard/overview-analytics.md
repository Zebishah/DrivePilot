# Admin Dashboard → Overview / Analytics (deep)

**Module:** `admin-dashboard`  
**Feature:** `overview-analytics`  
**Route:** `/admin-dashboard/overview`

This doc describes **every** code file, **every** GraphQL query/typeDef, and **every** resolver involved in the Admin Overview (Analytics) screen, plus how the frontend integrates with the API.

---

## 1. Purpose and flow

- **Purpose:** Show platform analytics: overall stats (registrations, lessons booked, reviews, attendance) and graphs (active users, revenue per instructor, bookings per instructor, total earnings, conversion rates). Optional filter by date range and by instructor(s).
- **Flow:** User opens Overview → frontend sends `getAdminAnalytics(filter)` and `getAllInstructors()` → backend computes stats and graph data from DB → UI renders cards and charts (e.g. ApexCharts). Changing filter re-sends `getAdminAnalytics` with new `filter`.

---

## 2. Frontend – every file

### 2.1 Page component

| File | Role | Exports | Imports (main) | GraphQL / API |
|------|------|--------|----------------|---------------|
| `Frontend/src/pages/private/admin-dashboard/adminOverview.tsx` | Main Analytics page; filter UI, stats cards, charts | `AnalyticsDashboard` (named export, used by router) | `useQuery` (Apollo), `GET_ADMIN_ANALYTICS`, `GET_ALL_INSTRUCTORS` from `../../../graphql/Queries/AdminContact`, `FilterType`, `AnalyticsFilterInput`, `AdminAnalytics`, `Instructor` from `../../../types/AdminContact`, `format` (date-fns), `react-apexcharts` (dynamic) | Uses `GET_ADMIN_ANALYTICS` with variable `filter` (AnalyticsFilterInput). Uses `GET_ALL_INSTRUCTORS` (no variables). |

- **State:** `filters` (AnalyticsFilterInput), `selectedInstructors`, `dateRange`, `isFilterOpen`, `showFromDatePicker`, `showToDatePicker`.
- **Queries used:**
  - `useQuery(GET_ADMIN_ANALYTICS, { variables: { filter: filters } })` → `data.getAdminAnalytics` (overallStats, graphData).
  - `useQuery(GET_ALL_INSTRUCTORS)` → `data.getAllInstructors` (list for filter dropdown).
- **Behavior:** Filter apply/clear updates `filters` and refetches analytics. Stats and graph data are derived from `getAdminAnalytics`; instructor list from `getAllInstructors`.

### 2.2 GraphQL operations (frontend)

| File | Role |
|------|------|
| `Frontend/src/graphql/Queries/AdminContact.ts` | Defines the two queries used by Overview. |

**Query 1: GetAdminAnalytics**

- **Operation name:** `GetAdminAnalytics`
- **Variables:** `$filter: AnalyticsFilterInput` (optional)
- **Requested fields:**
  - `getAdminAnalytics(filter: $filter) { overallStats { totalRegistrations, totalLessonsBooked, reviewsGiven, lessonAttendance, attendanceRate }, graphData { activeUsers { time, students, instructors }, averageRevenuePerInstructor { time, averageRevenue }, bookingsPerInstructor { time, averageBookings }, totalEarnings { time, totalEarnings }, conversionRates { time, visitors, registrations, rate } } }`
- **Used in:** `adminOverview.tsx` (useQuery with `variables: { filter: filters }`).

**Query 2: GetAllInstructors**

- **Operation name:** `GetAllInstructors`
- **Variables:** none
- **Requested fields:** `getAllInstructors { _id, firstName, lastName }`
- **Used in:** `adminOverview.tsx` (useQuery, no variables).

### 2.3 Types (frontend)

| File | Role | Types / enums used by Overview |
|------|------|---------------------------------|
| `Frontend/src/types/AdminContact.ts` | Shared types for admin contact/analytics | `FilterType` (enum), `AnalyticsFilterInput`, `AdminAnalytics`, `OverallStats`, `ActiveUserDataPoint`, `RevenueDataPoint`, `BookingDataPoint`, `EarningDataPoint`, `ConversionDataPoint`, `GraphData`; `Instructor` (for dropdown). |

---

## 3. Backend – TypeDefs (every type and field)

**File:** `server/src/graphql/typeDefs/AdminOverallAnalyticsTypes.js`

| Kind | Name | Definition |
|------|------|------------|
| Enum | `FilterType` | `LAST_WEEK`, `THIS_WEEK`, `LAST_MONTH`, `THIS_MONTH`, `LAST_YEAR`, `THIS_YEAR`, `LAST_6_MONTHS`, `CUSTOM` |
| Input | `AnalyticsFilterInput` | `instructorIds: [ID]`, `filterType: FilterType`, `fromDate: String`, `toDate: String` |
| Type | `OverallStats` | `totalRegistrations: Int`, `totalLessonsBooked: Int`, `reviewsGiven: Int`, `lessonAttendance: Int`, `attendanceRate: Float` |
| Type | `ActiveUserDataPoint` | `time: String`, `students: Int`, `instructors: Int` |
| Type | `RevenueDataPoint` | `time: String`, `averageRevenue: Float` |
| Type | `BookingDataPoint` | `time: String`, `averageBookings: Float` |
| Type | `EarningDataPoint` | `time: String`, `totalEarnings: Float` |
| Type | `ConversionDataPoint` | `time: String`, `visitors: Int`, `registrations: Int`, `rate: Float` |
| Type | `GraphData` | `activeUsers: [ActiveUserDataPoint]`, `averageRevenuePerInstructor: [RevenueDataPoint]`, `bookingsPerInstructor: [BookingDataPoint]`, `totalEarnings: [EarningDataPoint]`, `conversionRates: [ConversionDataPoint]` |
| Type | `AdminAnalytics` | `overallStats: OverallStats`, `graphData: GraphData` |
| Type | `Instructor` | `_id: ID!`, `firstName: String!`, `lastName: String!` |
| Query | `getAdminAnalytics(filter: AnalyticsFilterInput): AdminAnalytics` | Returns analytics for the given filter. |
| Query | `getAllInstructors: [Instructor!]!` | Returns list of instructors (id, firstName, lastName) for filter dropdown. |

---

## 4. Backend – Resolvers (every function)

**File:** `server/src/graphql/resolvers/AdminAnalytics.resolver.js`

**Dependencies:** `mongoose`, `dayjs`, `User`, `Instructor` (from `../../models/User`), `studentBookingModel` (from `../../models/studentBooking.model`), `Review` (from `../../models/Reviews`), `Visitor` (from `../../models/Visitors`).

| Resolver | Arguments | What it does | Models / services |
|----------|-----------|--------------|--------------------|
| `Query.getAdminAnalytics` | `(_, { filter })` | Reads `filter.instructorIds`, `filterType`, `fromDate`, `toDate`. Computes date range (from/to) from filterType or custom dates. Builds `matchInstructor` if instructorIds provided. **Overall stats:** (1) `totalRegistrations` = User count (Student/Instructor, createdAt in range). (2) `totalLessonsBooked` = aggregate on studentBookingModel, slots in range, booked, status not cancelled/refund. (3) `reviewsGiven` = Review count, completed, in range. (4) Attended lessons = slots in range, booked, (status completed or slot end ≤ now). (5) `attendanceRate` = attended / total booked (capped 100%). **Graph data:** Groups by day/week/month by duration; for each bucket computes activeUsers (unique students/instructors from slots), averageRevenuePerInstructor, bookingsPerInstructor, totalEarnings (delivered slots), conversionRates (visitors vs registrations from Visitor + User). Returns `{ overallStats, graphData }`. | User, studentBookingModel, Review, Visitor |
| `Query.getAllInstructors` | `(_, __)` | Finds all instructors with projection `_id firstName lastName`; returns array of `{ _id, firstName, lastName }`. | Instructor |

---

## 5. Data flow (step-by-step)

1. User navigates to `/admin-dashboard/overview` → router renders `AnalyticsDashboard` from `adminOverview.tsx`.
2. Component mounts → `useQuery(GET_ADMIN_ANALYTICS, { variables: { filter: filters } })` and `useQuery(GET_ALL_INSTRUCTORS)` run (initial `filters` may be e.g. `{ filterType: "LAST_MONTH" }`).
3. Apollo sends GraphQL requests to backend:
   - `Query.getAdminAnalytics(filter)` → resolver computes date range, runs User/studentBookingModel/Review/Visitor reads and aggregations, returns `AdminAnalytics`.
   - `Query.getAllInstructors` → resolver returns Instructor list.
4. Frontend receives `getAdminAnalytics` and `getAllInstructors`; renders stats cards from `overallStats` and charts from `graphData`; populates filter dropdown from `getAllInstructors`.
5. User changes filter (date range and/or instructors) and applies → `filters` state updates → `GET_ADMIN_ANALYTICS` refetches with new `filter` → resolver runs again with new range/instructorIds → UI updates.

---

## 6. Quick reference (file → role)

| Path | Role |
|------|------|
| `Frontend/src/pages/private/admin-dashboard/adminOverview.tsx` | Analytics page; uses GET_ADMIN_ANALYTICS + GET_ALL_INSTRUCTORS |
| `Frontend/src/graphql/Queries/AdminContact.ts` | Defines GET_ADMIN_ANALYTICS, GET_ALL_INSTRUCTORS |
| `Frontend/src/types/AdminContact.ts` | FilterType, AnalyticsFilterInput, AdminAnalytics, graph types, Instructor |
| `server/src/graphql/typeDefs/AdminOverallAnalyticsTypes.js` | FilterType, AnalyticsFilterInput, AdminAnalytics, GraphData, OverallStats, Instructor, getAdminAnalytics, getAllInstructors |
| `server/src/graphql/resolvers/AdminAnalytics.resolver.js` | getAdminAnalytics (stats + graph), getAllInstructors (list for dropdown) |
| `server/src/models/User.js` (Instructor) | getAllInstructors reads from Instructor |
| `server/src/models/studentBooking.model.js` | getAdminAnalytics aggregates bookings/slots |
| `server/src/models/Reviews.js` | getAdminAnalytics counts reviews |
| `server/src/models/Visitors.js` | getAdminAnalytics conversion buckets |

---

This is the **deep** doc template: every file, every query, every typeDef field, every resolver. Other admin-dashboard features (admin-access, documents, …) will follow the same structure in their own `.md` files under `docs/modules/admin-dashboard/`.
