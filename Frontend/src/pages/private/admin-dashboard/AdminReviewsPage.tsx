import { useMemo, useState } from "react";
import { useQuery } from "@apollo/client";
import { MessageSquare, Search, Star } from "lucide-react";
import { GET_ALL_REVIEWS } from "../../../graphql/Queries/ReviewQueries";
import { AdminAvatar, AdminButton, AdminPage, AdminPageHeader, AdminSection, AdminState, AdminStatus, formatAdminDate } from "../../../components/admin/AdminPrimitives";
import { AdminModal } from "../../../components/admin/AdminModal";

type Person = { _id: string; firstName: string; lastName: string; profileImage?: string };
type Review = { _id: string; reviewRating?: number; reviewDescription?: string; reviewStatus?: string; studentId: Person; instructorId: Person; lessonId: string; createdAt: string };

function personName(person?: Person) { return `${person?.firstName || "Unknown"} ${person?.lastName || ""}`.trim(); }

export default function AdminReviewsPage() {
  const { data, loading, error, refetch } = useQuery(GET_ALL_REVIEWS, { fetchPolicy: "cache-and-network" });
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Review | null>(null);
  const reviews: Review[] = useMemo(() => data?.getAllReviews || [], [data]);
  const filtered = useMemo(() => { const needle = search.trim().toLowerCase(); return reviews.filter((review) => !needle || `${personName(review.studentId)} ${personName(review.instructorId)} ${review.reviewDescription || ""}`.toLowerCase().includes(needle)); }, [reviews, search]);
  const average = reviews.length ? (reviews.reduce((sum, review) => sum + Number(review.reviewRating || 0), 0) / reviews.length).toFixed(1) : "0.0";
  if (loading && !data) return <AdminPage><AdminState type="loading" title="Loading reviews" description="Preparing Student reviews of Instructors." /></AdminPage>;
  if (error && !data) return <AdminPage><AdminState type="error" title="We couldn’t load reviews" description="Refresh the page and try again." onRetry={() => void refetch()} /></AdminPage>;
  return <AdminPage>
    <AdminPageHeader title="Reviews & ratings" description="Monitor Student reviews and marketplace reputation." />
    <section className="dsp-admin-metrics" aria-label="Review summary">
      <div className="dsp-admin-metric dsp-admin-metric--violet"><span className="dsp-admin-metric__icon dsp-admin-metric__icon--violet"><MessageSquare size={19} /></span><span className="dsp-admin-metric__copy"><span className="dsp-admin-metric__label">Total reviews</span><strong>{reviews.length}</strong><small>Published Student reviews</small></span></div>
      <div className="dsp-admin-metric dsp-admin-metric--amber"><span className="dsp-admin-metric__icon dsp-admin-metric__icon--amber"><Star size={19} /></span><span className="dsp-admin-metric__copy"><span className="dsp-admin-metric__label">Average rating</span><strong>{average}</strong><small>Across available review records</small></span></div>
    </section>
    <AdminSection title="Student reviews of Instructors" description="Admin visibility only. Review editing and moderation remain governed by existing product rules.">
      <div className="dsp-admin-toolbar"><label className="dsp-admin-search"><Search size={16} aria-hidden="true" /><input className="dsp-admin-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search student, instructor or review" aria-label="Search reviews" /></label><span className="dsp-admin-result-count">Showing {filtered.length} of {reviews.length}</span></div>
      <div className="dsp-admin-table-wrap"><table className="dsp-admin-table"><thead><tr><th>Student</th><th>Instructor</th><th>Rating</th><th>Review</th><th>Submitted</th><th>Action</th></tr></thead><tbody>{filtered.map((review) => <tr key={review._id}><td><div className="dsp-admin-table__person"><AdminAvatar name={personName(review.studentId)} src={review.studentId?.profileImage} size="sm" /><div><strong>{personName(review.studentId)}</strong><span>Student</span></div></div></td><td><div className="dsp-admin-table__person"><AdminAvatar name={personName(review.instructorId)} src={review.instructorId?.profileImage} size="sm" /><div><strong>{personName(review.instructorId)}</strong><span>Instructor</span></div></div></td><td><span className="dsp-admin-rating"><Star size={14} fill="currentColor" /> {review.reviewRating || "—"}</span></td><td className="dsp-admin-excerpt">{review.reviewDescription || "No written review"}</td><td>{formatAdminDate(review.createdAt)}</td><td><AdminButton variant="ghost" onClick={() => setSelected(review)}>View</AdminButton></td></tr>)}</tbody></table>{!filtered.length && <AdminState type="empty" title="No reviews found" description={search ? "Try a different search term." : "Student reviews will appear here when they are submitted."} />}</div>
    </AdminSection>
    <AdminModal open={Boolean(selected)} onClose={() => setSelected(null)} title="Review details" subtitle="Student review of an Instructor" size="md" footer={<AdminButton variant="secondary" onClick={() => setSelected(null)}>Close</AdminButton>}>
      {selected && <div className="dsp-admin-review-detail"><div className="dsp-admin-review-detail__people"><div><AdminAvatar name={personName(selected.studentId)} src={selected.studentId?.profileImage} size="lg" /><strong>{personName(selected.studentId)}</strong><span>Student</span></div><div><AdminAvatar name={personName(selected.instructorId)} src={selected.instructorId?.profileImage} size="lg" /><strong>{personName(selected.instructorId)}</strong><span>Instructor</span></div></div><div className="dsp-admin-review-detail__rating"><Star size={19} fill="currentColor" /> {selected.reviewRating || "—"}<AdminStatus tone="neutral">{selected.reviewStatus || "Submitted"}</AdminStatus></div><blockquote>{selected.reviewDescription || "No written review was provided."}</blockquote><dl><div><dt>Lesson</dt><dd>{selected.lessonId}</dd></div><div><dt>Submitted</dt><dd>{formatAdminDate(selected.createdAt)}</dd></div></dl></div>}
    </AdminModal>
  </AdminPage>;
}
