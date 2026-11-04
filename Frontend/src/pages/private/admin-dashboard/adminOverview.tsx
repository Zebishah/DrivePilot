import { useMemo } from "react";
import { useQuery } from "@apollo/client";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  CreditCard,
  FileCheck2,
  ReceiptText,
  RefreshCw,
  ShieldAlert,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { Link } from "react-router-dom";
import { GET_ADMIN_ANALYTICS } from "../../../graphql/Queries/AdminContact";
import { GET_ALL_INSTRUCTORS_DETAILS } from "../../../graphql/Queries/InstructorProfiles";
import { GET_REFUND_REQUESTS } from "../../../graphql/mutations/refundRequest";
import { GET_ADMIN_TRANSACTION_STATS } from "../../../graphql/Queries/transactionQueries";
import { GET_UNREAD_NOTIFICATION_COUNT } from "../../../graphql/Queries/productCapabilities";
import {
  AdminAvatar,
  AdminLinkButton,
  AdminMetricCard,
  AdminPage,
  AdminSection,
  AdminState,
  formatAdminDate,
} from "../../../components/admin/AdminPrimitives";
import {
  ActiveUsersChart,
  type ActiveUserPoint,
} from "../../../components/admin/AdminAnalyticsCharts";
import { formatCHF } from "../../../utils/money";

export function AnalyticsDashboard() {
  const analytics = useQuery(GET_ADMIN_ANALYTICS, {
    fetchPolicy: "cache-and-network",
  });
  const instructors = useQuery(GET_ALL_INSTRUCTORS_DETAILS, {
    fetchPolicy: "cache-and-network",
  });
  const refunds = useQuery(GET_REFUND_REQUESTS, {
    variables: { status: "PENDING" },
    fetchPolicy: "cache-and-network",
  });
  const transactions = useQuery(GET_ADMIN_TRANSACTION_STATS, {
    fetchPolicy: "cache-and-network",
  });
  const notifications = useQuery(GET_UNREAD_NOTIFICATION_COUNT, {
    fetchPolicy: "cache-and-network",
  });

  const stats = analytics.data?.getAdminAnalytics?.overallStats;
  const graph = analytics.data?.getAdminAnalytics?.graphData;
  const instructorRows = useMemo(
    () => instructors.data?.allInstructorsWithDetails || [],
    [instructors.data],
  );
  const pendingDocuments = instructorRows.reduce(
    (total: number, instructor: { documents?: Array<{ status?: string }> }) =>
      total +
      (instructor.documents || []).filter(
        (document) => String(document.status || "").toLowerCase() === "pending",
      ).length,
    0,
  );
  const pendingRefunds = refunds.data?.getRefundRequests?.length || 0;
  const transactionStats = transactions.data?.getAdminTransactionStats;
  const totalUsers = Number(stats?.totalRegistrations || 0);
  const activeInstructors = instructorRows.filter(
    (instructor: { isUserVerified?: boolean }) => instructor.isUserVerified,
  ).length;
  const hasError =
    analytics.error ||
    instructors.error ||
    refunds.error ||
    transactions.error ||
    notifications.error;
  const refresh = () => {
    void analytics.refetch();
    void instructors.refetch();
    void refunds.refetch();
    void transactions.refetch();
    void notifications.refetch();
  };
  const recentInstructors = useMemo(
    () =>
      instructorRows
        .slice()
        .sort(
          (a: { createdAt?: string }, b: { createdAt?: string }) =>
            Number(b.createdAt || 0) - Number(a.createdAt || 0),
        )
        .slice(0, 4),
    [instructorRows],
  );
  const loading = analytics.loading && !analytics.data;
  const paymentCount = transactionStats?.totalPayments || 0;
  const payoutCount = transactionStats?.totalPayouts || 0;
  const refundCount = transactionStats?.totalRefunds || 0;

  if (loading)
    return (
      <AdminPage>
        <AdminState
          type="loading"
          title="Loading platform overview"
          description="Gathering current marketplace metrics."
        />
      </AdminPage>
    );
  if (hasError && !analytics.data)
    return (
      <AdminPage>
        <AdminState
          type="error"
          title="We couldn’t load the platform overview"
          description="Refresh the page and try again. Existing admin data has not been changed."
          onRetry={refresh}
        />
      </AdminPage>
    );

  return (
    <AdminPage className="dsp-admin-overview">
      <div className="dsp-operations-heading">
        <div>
          <span className="dsp-admin-eyebrow">
            YOUR MARKETPLACE AT A GLANCE
          </span>
          <h2>Driving-school operations</h2>
          <p>
            People, lessons, and payments that keep your marketplace moving.
          </p>
        </div>
        <AdminLinkButton to="/admin-dashboard/analytics" icon={BarChart3}>
          View analytics
        </AdminLinkButton>
      </div>
      <section
        className="dsp-admin-metrics"
        aria-label="Marketplace health metrics"
      >
        <AdminMetricCard
          label="Total users"
          value={totalUsers}
          helper={`${stats?.studentRegistrations || 0} students · ${stats?.instructorRegistrations || 0} instructors`}
          icon={UsersRound}
          tone="violet"
        />
        <AdminMetricCard
          label="Active instructors"
          value={activeInstructors}
          helper="Verified instructor profiles"
          icon={ShieldAlert}
          tone="cyan"
        />
        <AdminMetricCard
          label="Lessons booked"
          value={stats?.totalLessonsBooked || 0}
          helper={`${stats?.upcomingLessonsBooked || 0} upcoming · ${stats?.completedLessonsBooked || 0} completed`}
          icon={CalendarDays}
          tone="green"
        />
        <AdminMetricCard
          label="Payment volume"
          value={formatCHF(transactionStats?.totalEarned)}
          helper={
            paymentCount
              ? `${paymentCount} successful payment records`
              : "No successful payments recorded"
          }
          icon={CreditCard}
          tone="amber"
        />
      </section>

      <AdminSection
        title="Needs attention"
        description="Operational items that may need an Admin review."
      >
        <div className="dsp-admin-overview-grid">
          <div className="dsp-admin-card">
            <div className="dsp-admin-card__header">
              <div>
                <h2>Action center</h2>
                <p>
                  Review instructor submissions, bookings, and outstanding
                  requests.
                </p>
              </div>
              <ShieldAlert
                size={19}
                color="var(--ws-primary, #7C3AED)"
                aria-hidden="true"
              />
            </div>
            <div className="dsp-admin-card__body dsp-admin-attention-list">
              <Link
                to="/admin-dashboard/documentsManagement"
                className="dsp-admin-attention-row"
              >
                <span>Instructor documents awaiting review</span>
                <strong>{pendingDocuments}</strong>
              </Link>
              <Link
                to="/admin-dashboard/refund-requests"
                className="dsp-admin-attention-row"
              >
                <span>Pending refund requests</span>
                <strong>{pendingRefunds}</strong>
              </Link>
              <Link
                to="/admin-dashboard/notifications"
                className="dsp-admin-attention-row"
              >
                <span>Unread operational notifications</span>
                <strong>
                  {notifications.data?.unreadNotificationCount || 0}
                </strong>
              </Link>
              <Link
                to="/admin-dashboard/bookingManagement"
                className="dsp-admin-attention-row"
              >
                <span>Upcoming bookings</span>
                <strong>{stats?.upcomingLessonsBooked || 0}</strong>
              </Link>
            </div>
          </div>
          <div className="dsp-admin-card">
            <div className="dsp-admin-card__header">
              <div>
                <h2>Marketplace activity</h2>
                <p>
                  Learner and instructor activity across your driving-school
                  marketplace.
                </p>
              </div>
              <Activity
                size={19}
                color="var(--ws-info, #0EA5E9)"
                aria-hidden="true"
              />
            </div>
            <div className="dsp-admin-card__body">
              <ActiveUsersChart
                points={(graph?.activeUsers || []) as ActiveUserPoint[]}
              />
            </div>
          </div>
        </div>
      </AdminSection>

      <AdminSection
        title="Financial snapshot"
        description="Track recorded payments, instructor payouts, and refunds."
      >
        <div className="dsp-admin-financial-grid">
          <AdminMetricCard
            label="Gross payment volume"
            value={formatCHF(transactionStats?.totalEarned)}
            helper={
              paymentCount
                ? "Full successful payment volume"
                : "No successful payment volume recorded"
            }
            icon={CreditCard}
            tone="violet"
          />
          <AdminMetricCard
            label="Payment transactions"
            value={paymentCount}
            helper={
              paymentCount
                ? `${paymentCount} successful payment records`
                : "No payment records"
            }
            icon={ReceiptText}
            tone="cyan"
          />
          <AdminMetricCard
            label="Payout transactions"
            value={payoutCount}
            helper={
              payoutCount
                ? `${payoutCount} successful payout records`
                : "No payouts recorded"
            }
            icon={WalletCards}
            tone="green"
          />
          <AdminMetricCard
            label="Refund transactions"
            value={refundCount}
            helper={
              refundCount
                ? `${refundCount} successful refund records`
                : "No refunds recorded"
            }
            icon={RefreshCw}
            tone="rose"
          />
        </div>
      </AdminSection>

      <AdminSection
        title="Recent instructors"
        description="Latest instructor profile records."
        action={
          <AdminLinkButton
            to="/admin-dashboard/InstructorManagement"
            icon={ArrowUpRight}
          >
            View all
          </AdminLinkButton>
        }
      >
        <div className="dsp-admin-card">
          {recentInstructors.length ? (
            <div className="dsp-admin-activity">
              {recentInstructors.map(
                (instructor: {
                  id?: string;
                  _id?: string;
                  firstName?: string;
                  lastName?: string;
                  email?: string;
                  profileImage?: string;
                  createdAt?: string;
                  isUserVerified?: boolean;
                }) => {
                  const name =
                    `${instructor.firstName || "Instructor"} ${instructor.lastName || ""}`.trim();
                  return (
                    <div
                      className="dsp-admin-activity__item"
                      key={instructor.id || instructor._id}
                    >
                      <AdminAvatar
                        name={name}
                        src={instructor.profileImage}
                        size="md"
                      />
                      <div className="dsp-admin-activity__copy">
                        <strong>{name}</strong>
                        <span>{instructor.email || "No email available"}</span>
                        <small>
                          {instructor.isUserVerified
                            ? "Verified instructor"
                            : "Instructor profile"}
                        </small>
                      </div>
                      <div className="dsp-admin-activity__aside">
                        <time>{formatAdminDate(instructor.createdAt)}</time>
                        {instructor.isUserVerified && (
                          <span className="dsp-admin-activity__status">
                            Verified
                          </span>
                        )}
                      </div>
                    </div>
                  );
                },
              )}
            </div>
          ) : (
            <AdminState
              type="empty"
              title="No recent instructors"
              description="New instructor profile records will appear here."
            />
          )}
        </div>
      </AdminSection>

      <AdminSection title="Quick actions">
        <div className="dsp-admin-quick-actions">
          <Link
            to="/admin-dashboard/documentsManagement"
            className="dsp-admin-quick-action"
          >
            <span className="dsp-admin-quick-action__icon dsp-admin-quick-action__icon--violet">
              <FileCheck2 size={18} />
            </span>
            <span>
              <strong>Review documents</strong>
              <small>Verify submissions</small>
            </span>
            <ArrowUpRight size={15} />
          </Link>
          <Link
            to="/admin-dashboard/bookingManagement"
            className="dsp-admin-quick-action"
          >
            <span className="dsp-admin-quick-action__icon dsp-admin-quick-action__icon--cyan">
              <CalendarDays size={18} />
            </span>
            <span>
              <strong>Manage bookings</strong>
              <small>Review lesson lifecycle</small>
            </span>
            <ArrowUpRight size={15} />
          </Link>
          <Link
            to="/admin-dashboard/transactions"
            className="dsp-admin-quick-action"
          >
            <span className="dsp-admin-quick-action__icon dsp-admin-quick-action__icon--green">
              <WalletCards size={18} />
            </span>
            <span>
              <strong>View payments</strong>
              <small>Open ledger activity</small>
            </span>
            <ArrowUpRight size={15} />
          </Link>
          <Link
            to="/admin-dashboard/refund-requests"
            className="dsp-admin-quick-action"
          >
            <span className="dsp-admin-quick-action__icon dsp-admin-quick-action__icon--amber">
              <ReceiptText size={18} />
            </span>
            <span>
              <strong>Review refunds</strong>
              <small>Resolve requests</small>
            </span>
            <ArrowUpRight size={15} />
          </Link>
        </div>
      </AdminSection>
    </AdminPage>
  );
}
