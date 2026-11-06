import { NetworkStatus, useQuery } from "@apollo/client";
import { DocumentsTab } from "./tabs/DocumentsTab";
import { GET_TEACHER_PROFILE } from "../../../graphql/mutations/profile";
import { EmptyState, ErrorState, LoadingState } from "../../../components/dashboard/DashboardStates";
import InstructorSectionPage from "./InstructorSectionPage";

export default function InstructorDocumentsPage() {
  const { loading, error, data, refetch, networkStatus } = useQuery(GET_TEACHER_PROFILE, {
    notifyOnNetworkStatusChange: true,
  });

  const teacherProfile = data?.teacherProfile;

  return (
    <InstructorSectionPage
      title="Documents"
      description="Upload and manage the documents required for your instructor profile."
      className="dsp-documents-page"
    >
      {loading && <LoadingState label="Loading your documents…" />}
      {error && <ErrorState description={error.message} />}
      {!loading && !error && !teacherProfile && (
        <EmptyState
          title="No profile data found"
          description="Your instructor documents will appear here once your profile is available."
        />
      )}
      {!loading && !error && teacherProfile && (
        <DocumentsTab
          documents={teacherProfile.documents ?? []}
          instructorId={teacherProfile.id}
          onDocumentsUpdate={() => void refetch()}
          refetch={() => void refetch()}
          isRefetching={networkStatus === NetworkStatus.refetch}
        />
      )}
    </InstructorSectionPage>
  );
}
