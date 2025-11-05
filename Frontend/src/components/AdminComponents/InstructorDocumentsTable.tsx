import React, { useState, useMemo, useEffect } from "react";
import { NetworkStatus, useQuery } from "@apollo/client";
import {
  Search,
  Filter,
  Eye,
  User,
  FileText,
  RefreshCw,
  Calendar,
} from "lucide-react";
import { StatusDropdown } from "./StatusDropdown";

import { useNavigate, useSearchParams } from "react-router-dom";
import { GET_ALL_INSTRUCTORS } from "../../graphql/Queries/InstructorProfiles";
import { FlattenedDocument, Instructor } from "../../types/Instructor";

export const InstructorDocumentsTable: React.FC = () => {
  const navigate = useNavigate();
  const { data, loading, error, refetch, networkStatus } = useQuery(
    GET_ALL_INSTRUCTORS,
    {
      notifyOnNetworkStatusChange: true, // ✅ Required for refetch status to trigger
    }
  );

  const isRefetching = networkStatus === NetworkStatus.refetch;

  const [searchParams, setSearchParams] = useSearchParams();

  const [searchTerm, setSearchTerm] = useState(
    searchParams.get("search") || ""
  );
  const [statusFilter, setStatusFilter] = useState(
    searchParams.get("status") || "all"
  );
  const [instructorFilter, setInstructorFilter] = useState(
    searchParams.get("instructor") || "all"
  );
  useEffect(() => {
    const params: any = {};
    if (searchTerm) params.search = searchTerm;
    if (statusFilter !== "all") params.status = statusFilter;
    if (instructorFilter !== "all") params.instructor = instructorFilter;

    setSearchParams(params);
  }, [searchTerm, statusFilter, instructorFilter]);

  // Fetch documents when component mounts
  // useEffect(() => {
  //   refetch();
  // }, []); // Empty dependency array means this runs once on mount

  // Function to format timestamp to readable date/time
  const formatDateTime = (timestamp: string) => {
    try {
      const date = new Date(parseInt(timestamp));
      return {
        date: date.toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "2-digit",
        }),
        time: date.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }),
      };
    } catch (error) {
      return { date: "Invalid Date", time: "" };
    }
  };

  // Flatten documents for table display
  const flattenedDocuments = useMemo(() => {
    if (!data?.allInstructors) return [];

    const flattened: FlattenedDocument[] = [];
    data.allInstructors.forEach((instructor: Instructor) => {
      // Group Swiss Driving License documents
      const swissDocs = instructor.documents.filter((doc) =>
        doc.documentType.startsWith("Swiss Driving License")
      );
      const otherDocs = instructor.documents.filter(
        (doc) => !doc.documentType.startsWith("Swiss Driving License")
      );

      // Handle Swiss Driving License as collective
      if (swissDocs.length > 0) {
        const frontDoc = swissDocs.find((doc) =>
          doc.documentType.includes("Front")
        );
        const backDoc = swissDocs.find((doc) =>
          doc.documentType.includes("Back")
        );

        // Create a collective entry using the first document's status as primary
        const primaryDoc = frontDoc || backDoc || swissDocs[0];

        flattened.push({
          ...primaryDoc,
          instructor,
          isCollective: true,
          collectiveGroupKey: "Swiss Driving License",
          documentType: "Swiss Driving License",
          allSameTypeDocs: swissDocs,
          frontDocument: frontDoc,
          backDocument: backDoc,
        });
      }

      // Handle other documents normally
      otherDocs.forEach((doc) => {
        flattened.push({
          ...doc,
          instructor,
        });
      });
    });

    // Sort by createdAt timestamp (latest to oldest)
    return flattened.sort((a, b) => {
      const timestampA = parseInt(a.createdAt);
      const timestampB = parseInt(b.createdAt);
      return timestampB - timestampA; // Descending order (latest first)
    });
  }, [data]);

  // Filter documents
  const filteredDocuments = useMemo(() => {
    const filtered = flattenedDocuments.filter((doc) => {
      const matchesSearch =
        doc.instructor.firstName
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        doc.instructor.lastName
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        doc.documentType.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || doc.status === statusFilter;

      const matchesInstructor =
        instructorFilter === "all" || doc.instructor._id === instructorFilter;

      return matchesSearch && matchesStatus && matchesInstructor;
    });

    // Maintain sorting after filtering
    return filtered.sort((a, b) => {
      const timestampA = parseInt(a.createdAt);
      const timestampB = parseInt(b.createdAt);
      return timestampB - timestampA; // Descending order (latest first)
    });
  }, [flattenedDocuments, searchTerm, statusFilter, instructorFilter]);

  // Get unique instructors for filter
  const uniqueInstructors = useMemo(() => {
    if (!data?.allInstructors) return [];
    return data.allInstructors.map((instructor: Instructor) => ({
      _id: instructor._id,
      name: `${instructor.firstName} ${instructor.lastName}`,
    }));
  }, [data]);

  const handleViewDetails = (document: FlattenedDocument) => {
    if (
      document.isCollective &&
      document.collectiveGroupKey === "Swiss Driving License"
    ) {
      navigate(
        `/admin-dashboard/document-details/${document.instructor._id}/Swiss%20Driving%20License`
      );
    } else {
      navigate(
        `/admin-dashboard/document-details/${document.instructor._id}/${encodeURIComponent(document.documentType)}`
      );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-lg font-semibold mb-2">
            Error loading data
          </div>
          <div className="text-gray-600">{error.message}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className=" mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Instructor Documents
          </h1>
          <p className="text-gray-600">
            Manage and review instructor document submissions
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={20}
              />
              <input
                type="text"
                placeholder="Search instructors or documents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <Filter
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={20}
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="accepted">Accepted</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            {/* Instructor Filter */}
            <div className="relative">
              <User
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={20}
              />
              <select
                value={instructorFilter}
                onChange={(e) => setInstructorFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
              >
                <option value="all">All Instructors</option>
                {uniqueInstructors.map((instructor) => (
                  <option key={instructor._id} value={instructor._id}>
                    {instructor.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-4 flex justify-between w-full">
          <span className="text-sm text-gray-600">
            Showing {filteredDocuments.length} of {flattenedDocuments.length}{" "}
            documents (sorted by latest first)
          </span>
          <button
            onClick={() => refetch()}
            title="Refresh Students"
            disabled={isRefetching}
            className="inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-md shadow-sm text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRefetching ? (
              <svg
                className="animate-spin w-4 h-4 mr-2 text-gray-500"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4l4-4-4-4v4a8 8 0 00-8 8z"
                ></path>
              </svg>
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            {isRefetching ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Instructor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Document Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Document Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created Date & Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredDocuments.map((document) => {
                  const dateTime = formatDateTime(document.createdAt);
                  return (
                    <tr
                      key={`${document.instructor._id}-${document._id}`}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            {document.instructor.profileImage ? (
                              <img
                                className="h-10 w-10 rounded-full object-cover"
                                src={document.instructor.profileImage}
                                alt={`${document.instructor.firstName} ${document.instructor.lastName}`}
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                                <User className="h-5 w-5 text-gray-600" />
                              </div>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {document.instructor.firstName}{" "}
                              {document.instructor.lastName}
                            </div>
                            <div className="text-sm text-gray-500">
                              {document.instructor.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <FileText className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-900">
                            {document.documentType}
                            {document.isCollective && (
                              <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                                Front & Back
                              </span>
                            )}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {document.isCollective &&
                        document.collectiveGroupKey ===
                          "Swiss Driving License" ? (
                          <div className="space-y-1">
                            {document.frontDocument && (
                              <div className="text-xs text-gray-600">
                                <span className="font-medium">Front:</span>{" "}
                                {document.frontDocument.documentUrl
                                  ?.split("/")
                                  .pop()
                                  ?.substring(0, 30)}
                                ...
                              </div>
                            )}
                            {document.backDocument && (
                              <div className="text-xs text-gray-600">
                                <span className="font-medium">Back:</span>{" "}
                                {document.backDocument.documentUrl
                                  ?.split("/")
                                  .pop()
                                  ?.substring(0, 30)}
                                ...
                              </div>
                            )}
                            {!document.frontDocument &&
                              !document.backDocument && (
                                <div className="text-xs text-gray-500">
                                  No documents available
                                </div>
                              )}
                          </div>
                        ) : (
                          <div className="text-xs text-gray-600">
                            {document.documentUrl
                              ?.split("/")
                              .pop()
                              ?.substring(0, 40)}
                            ...
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                          <div className="text-sm">
                            <div className="text-gray-900 font-medium">
                              {dateTime.date}
                            </div>
                            <div className="text-gray-500 text-xs">
                              {dateTime.time}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusDropdown
                          currentStatus={document.status}
                          documentId={document._id}
                          isCollective={document.isCollective}
                          documents={document.allSameTypeDocs}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleViewDetails(document)}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-[#5DC3D2] text-white rounded-lg hover:bg-[#5DC3D2] transition-colors"
                        >
                          <Eye size={16} />
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredDocuments.length === 0 && (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                No documents found
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Try adjusting your search or filter criteria.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InstructorDocumentsTable;
