import { useMemo, useState } from "react";
import { useQuery } from "@apollo/client";
import { Clock3, Search } from "lucide-react";
import { GET_ALL_FEEDBACKS } from "../../../graphql/Queries/LessonFeedback";
import { GET_ALL_INSTRUCTORS_DETAILS } from "../../../graphql/Queries/InstructorProfiles";
import { GET_ALL_STUDENTS_ADMIN } from "../../../graphql/Queries/StudentQueries";
import { AdminAvatar, AdminButton, AdminPage, AdminPageHeader, AdminSection, AdminState, formatAdminDate } from "../../../components/admin/AdminPrimitives";
import { AdminModal } from "../../../components/admin/AdminModal";

type Feedback = { _id: string; lessonId: string; bookingId: string; instructorId: string; studentId: string; feedbackTags: string[]; hoursRemaining: string | number; message: string; createdAt: string };
type UserRow = { id?: string; _id?: string; firstName?: string; lastName?: string; profileImage?: string };
const nameOf = (person?: UserRow) => `${person?.firstName || "Unknown"} ${person?.lastName || ""}`.trim();

export default function AdminStudentFeedbackPage() {
  const feedbackQuery = useQuery(GET_ALL_FEEDBACKS, { fetchPolicy: "cache-and-network" });
  const instructorsQuery = useQuery(GET_ALL_INSTRUCTORS_DETAILS, { fetchPolicy: "cache-and-network" });
  const studentsQuery = useQuery(GET_ALL_STUDENTS_ADMIN, { fetchPolicy: "cache-and-network" });
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Feedback | null>(null);
  const feedbacks: Feedback[] = useMemo(() => feedbackQuery.data?.getAllFeedbacks || [], [feedbackQuery.data]);
  const instructors: UserRow[] = useMemo(() => instructorsQuery.data?.allInstructorsWithDetails || [], [instructorsQuery.data]);
  const students: UserRow[] = useMemo(() => studentsQuery.data?.allStudentsWithLessonStats || [], [studentsQuery.data]);
  const findUser = (id: string, list: UserRow[]) => list.find((user) => String(user.id || user._id) === String(id));
  const filtered = useMemo(() => { const needle = search.trim().toLowerCase(); return feedbacks.filter((item) => { const student = nameOf(findUser(item.studentId, students)); const instructor = nameOf(findUser(item.instructorId, instructors)); return !needle || `${student} ${instructor} ${item.message} ${item.feedbackTags.join(" ")}`.toLowerCase().includes(needle); }); }, [feedbacks, search, students, instructors]);
  const loading = feedbackQuery.loading || instructorsQuery.loading || studentsQuery.loading;
  const error = feedbackQuery.error || instructorsQuery.error || studentsQuery.error;
  const retry = () => { void feedbackQuery.refetch(); void instructorsQuery.refetch(); void studentsQuery.refetch(); };
  if (loading && !feedbackQuery.data) return <AdminPage><AdminState type="loading" title="Loading student feedback" description="Preparing Instructor feedback records." /></AdminPage>;
  if (error && !feedbackQuery.data) return <AdminPage><AdminState type="error" title="We couldn’t load student feedback" description="Refresh the page and try again." onRetry={retry} /></AdminPage>;
  return <AdminPage>
    <AdminPageHeader title="Student feedback" description="Review Instructor feedback recorded for completed lessons." />
    <AdminSection title="Instructor → Student feedback" description="Feedback is read-only here and remains distinct from Student reviews of Instructors.">
      <div className="dsp-admin-toolbar"><label className="dsp-admin-search"><Search size={16} aria-hidden="true" /><input className="dsp-admin-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search student, instructor or focus" aria-label="Search student feedback" /></label><span className="dsp-admin-result-count">Showing {filtered.length} of {feedbacks.length}</span></div>
      <div className="dsp-admin-table-wrap"><table className="dsp-admin-table"><thead><tr><th>Student</th><th>Instructor</th><th>Lesson</th><th>Skills practiced</th><th>Hours remaining</th><th>Date</th><th>Action</th></tr></thead><tbody>{filtered.map((item) => { const student = findUser(item.studentId, students); const instructor = findUser(item.instructorId, instructors); return <tr key={item._id}><td><div className="dsp-admin-table__person"><AdminAvatar name={nameOf(student)} src={student?.profileImage} size="sm" /><div><strong>{nameOf(student)}</strong><span>Student</span></div></div></td><td><div className="dsp-admin-table__person"><AdminAvatar name={nameOf(instructor)} src={instructor?.profileImage} size="sm" /><div><strong>{nameOf(instructor)}</strong><span>Instructor</span></div></div></td><td>Lesson {item.lessonId.slice(-6)}</td><td><div className="dsp-admin-tags">{item.feedbackTags.slice(0, 2).map((tag) => <span key={tag}>{tag}</span>)}{item.feedbackTags.length > 2 && <span>+{item.feedbackTags.length - 2}</span>}</div></td><td>{item.hoursRemaining} hrs</td><td>{formatAdminDate(item.createdAt)}</td><td><AdminButton variant="ghost" onClick={() => setSelected(item)}>View</AdminButton></td></tr>; })}</tbody></table>{!filtered.length && <AdminState type="empty" title="No feedback found" description={search ? "Try a different search term." : "Instructor feedback will appear here after completed lessons."} />}</div>
    </AdminSection>
    <AdminModal open={Boolean(selected)} onClose={() => setSelected(null)} title="Feedback details" subtitle="Instructor feedback for a Student lesson" size="md" footer={<AdminButton variant="secondary" onClick={() => setSelected(null)}>Close</AdminButton>}>
      {selected && <div className="dsp-admin-feedback-detail"><div className="dsp-admin-feedback-detail__metric"><Clock3 size={18} /><strong>{selected.hoursRemaining} hrs</strong><span>Hours remaining</span></div><div className="dsp-admin-tags dsp-admin-tags--large">{selected.feedbackTags.map((tag) => <span key={tag}>{tag}</span>)}</div><div className="dsp-admin-feedback-detail__message" dangerouslySetInnerHTML={{ __html: selected.message }} /><dl><div><dt>Lesson</dt><dd>{selected.lessonId}</dd></div><div><dt>Feedback date</dt><dd>{formatAdminDate(selected.createdAt)}</dd></div></dl></div>}
    </AdminModal>
  </AdminPage>;
}
