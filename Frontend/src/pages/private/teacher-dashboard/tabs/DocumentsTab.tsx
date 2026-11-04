import React, { useState } from "react";
import {
  Grid,
  Paper,
  Typography,
  Box,
  Modal,
  IconButton,
  Fade,
  Button,
  Chip,
} from "@mui/material";
import {
  Close as CloseIcon,
  Visibility as VisibilityIcon,
  Add as AddIcon,
  Description as DescriptionIcon,
} from "@mui/icons-material";
import InstructorDocumentUpdate from "../../../../components/InstructorComponent/DocumentUpdate/DocumentUpdateModal";
import { RefreshCw } from "lucide-react";

interface Document {
  documentType: string;
  documentUrl: string;
  status: "pending" | "accepted" | "rejected";
}

interface DocumentsTabProps {
  documents: Document[];
  instructorId?: string;
  isAdmin?: boolean;
  onDocumentsUpdate?: () => void;
  refetch?: () => void;
  isRefetching?: boolean;
}

export const DocumentsTab: React.FC<DocumentsTabProps> = ({
  documents,
  instructorId,
  isAdmin = false,
  onDocumentsUpdate,
  refetch,
  isRefetching,
}) => {
  const [open, setOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [hoveredDoc, setHoveredDoc] = useState<number | null>(null);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);

  const statusCounts = documents.reduce(
    (counts, document) => {
      counts[document.status] += 1;
      return counts;
    },
    { accepted: 0, pending: 0, rejected: 0 } as Record<Document["status"], number>,
  );

  // Add this new state in DocumentsTab component
  const [preSelectedDocType, setPreSelectedDocType] = useState<string | null>(
    null
  );
  const handleOpen = (doc: Document) => {
    setSelectedDoc(doc);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedDoc(null);
  };

  const handleRejectedDocumentUpload = (documentType: string) => {
    const swissFrontRejected = documents.find(
      (doc) =>
        doc.documentType === "Swiss Driving License (Front)" &&
        doc.status === "rejected"
    );

    const swissBackRejected = documents.find(
      (doc) =>
        doc.documentType === "Swiss Driving License (Back)" &&
        doc.status === "rejected"
    );

    if (
      documentType === "Swiss Driving License (Front)" ||
      documentType === "Swiss Driving License (Back)"
    ) {
      if (swissFrontRejected || swissBackRejected) {
        // Open modal for both front & back
        setPreSelectedDocType("Swiss Driving License");
        setUpdateModalOpen(true);
        return;
      }
    }

    // Default case: open modal for this single doc
    setPreSelectedDocType(documentType);
    setUpdateModalOpen(true);
  };

  // Update the handleUpdateModalClose function
  const handleUpdateModalClose = () => {
    setUpdateModalOpen(false);
    setPreSelectedDocType(null); // Reset preselected type
    if (onDocumentsUpdate) {
      onDocumentsUpdate();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "accepted":
        return "success";
      case "rejected":
        return "error";
      case "pending":
      default:
        return "warning";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "accepted":
        return "✓";
      case "rejected":
        return "✗";
      case "pending":
      default:
        return "⏳";
    }
  };

  // if (!documents || documents.length === 0) {
  //   return (
  //     <Box sx={{ p: 3, textAlign: "center" }}>
  //       <Box
  //         sx={{
  //           display: "flex",
  //           flexDirection: "column",
  //           alignItems: "center",
  //           gap: 2,
  //           py: 4,
  //         }}
  //       >
  //         <DescriptionIcon sx={{ fontSize: 60, color: "text.secondary" }} />
  //         <Typography variant="h6" color="text.secondary">
  //           No documents uploaded yet
  //         </Typography>
  //         <Typography variant="body2" color="text.secondary">
  //           Upload your documents to get started
  //         </Typography>
  //         <Button
  //           variant="contained"
  //           startIcon={<AddIcon />}
  //           onClick={() => setUpdateModalOpen(true)}
  //           sx={{
  //             mt: 2,
  //             borderRadius: 2,
  //             textTransform: "none",
  //             boxShadow: 3,
  //             "&:hover": { boxShadow: 6 },
  //           }}
  //         >
  //           Add Documents
  //         </Button>
  //       </Box>
  //     </Box>
  //   );
  // }

  return (
    <>
      <Box className="dsp-documents-tab" sx={{ p: 3 }}>
        <Box className="dsp-documents-summary">
          <Box className="dsp-documents-summary__intro">
            <span className="dsp-documents-summary__eyebrow">Verification progress</span>
            <Typography variant="h6">Keep your instructor profile ready</Typography>
            <Typography variant="body2">
              Approved documents can be reviewed by the marketplace team before you publish availability.
            </Typography>
          </Box>
          <Box className="dsp-documents-summary__progress" aria-label={`${statusCounts.accepted} of ${documents.length} documents approved`}>
            <strong>{documents.length ? Math.round((statusCounts.accepted / documents.length) * 100) : 0}%</strong>
            <span>profile documentation complete</span>
            <div className="dsp-documents-summary__track"><span style={{ width: `${documents.length ? (statusCounts.accepted / documents.length) * 100 : 0}%` }} /></div>
          </Box>
          <Box className="dsp-documents-summary__stats">
            <span><strong>{statusCounts.accepted}</strong> Approved</span>
            <span><strong>{statusCounts.pending}</strong> Pending</span>
            <span><strong>{statusCounts.rejected}</strong> Needs attention</span>
          </Box>
        </Box>
        {/* Header with Add More Documents Button */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 3,
          }}
        >
          <Typography variant="h5" fontWeight="bold">
            Documents ({documents.length})
          </Typography>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 2,
            }}
          >
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
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setUpdateModalOpen(true)}
              sx={{
                borderRadius: 2,
                textTransform: "none",
                boxShadow: 3,
                background: "var(--dsp-primary-gradient)",
                "&:hover": {
                  boxShadow: 6,
                  background: "var(--dsp-primary-gradient-soft)",
                },
              }}
            >
              Add More Documents
            </Button>
          </Box>
        </Box>

        <Grid container spacing={3}>
          {documents.map((doc: Document, index: number) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
              <Paper
                elevation={2}
                sx={{
                  p: 3,
                  textAlign: "center",
                  cursor: "pointer",
                  position: "relative",
                  overflow: "hidden",
                  borderRadius: 3,
                  transition: "all 0.3s ease",
                  "&:hover": {
                    transform: "translateY(-4px)",
                    boxShadow: 6,
                  },
                  border: `2px solid ${
                    doc.status === "accepted"
                      ? "#4caf50"
                      : doc.status === "rejected"
                        ? "#f44336"
                        : "#FFD700"
                  }`,
                }}
                onClick={() => handleOpen(doc)}
                onMouseEnter={() => setHoveredDoc(index)}
                onMouseLeave={() => setHoveredDoc(null)}
              >
                {/* Status Badge */}
                <Box
                  sx={{
                    position: "absolute",
                    top: 12,
                    left: 12,
                    zIndex: 2,
                  }}
                >
                  <Chip
                    label={`${getStatusIcon(doc.status)} ${doc?.status}`}
                    color={
                      doc.status === "pending"
                        ? undefined
                        : getStatusColor(doc.status)
                    }
                    size="small"
                    sx={{
                      fontWeight: "bold",
                      textTransform: "uppercase",
                      fontSize: "0.7rem",
                      bgcolor: doc.status === "pending" ? "#FFD700" : undefined, // Yellow color
                      color: doc.status === "pending" ? "#000" : undefined, // Black text for contrast
                    }}
                  />
                </Box>

                {/* Eye icon overlay - appears on hover */}
                <Fade in={hoveredDoc === index}>
                  <Box
                    sx={{
                      position: "absolute",
                      top: 12,
                      right: 12,
                      zIndex: 2,
                      backgroundColor: "rgba(var(--ws-accent-rgb, 124, 58, 237), 0.92)",
                      borderRadius: "50%",
                      width: 40,
                      height: 40,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <VisibilityIcon sx={{ color: "#ffffff", fontSize: 20 }} />
                  </Box>
                </Fade>

                {/* Document Preview */}
                {doc.documentUrl?.endsWith(".pdf") ? (
                  <Box
                    sx={{
                      width: "100%",
                      height: "180px",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      alignItems: "center",
                      backgroundColor: "var(--ws-surface, #f8f9fa)",
                      borderRadius: 2,
                      position: "relative",
                      mb: 2,
                    }}
                  >
                    <DescriptionIcon sx={{ fontSize: 60, color: "var(--ws-danger, #e53e3e)" }} />
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ mt: 1 }}
                    >
                      PDF Document
                    </Typography>
                  </Box>
                ) : (
                  <Box sx={{ position: "relative", height: "180px", mb: 2 }}>
                    <img
                      src={doc.documentUrl}
                      alt={doc.documentType}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        borderRadius: "8px",
                      }}
                    />
                  </Box>
                )}

                <Typography
                  variant="body1"
                  fontWeight="medium"
                  sx={{
                    color: "text.primary",
                    lineHeight: 1.2,
                    minHeight: "2.4em",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {doc.documentType}
                </Typography>
                {doc.status === "rejected" && (
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={(event) => {
                      event.stopPropagation();
                      handleRejectedDocumentUpload(doc.documentType);
                    }}
                    sx={{ mt: 1, textTransform: "none" }}
                  >
                    Replace document
                  </Button>
                )}
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Document Preview Modal */}
      <Modal
        open={open}
        onClose={handleClose}
        aria-labelledby="document-preview-modal"
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backdropFilter: "blur(4px)",
        }}
      >
        <Box
          sx={{
            position: "relative",
            width: "90%",
            maxWidth: "1000px",
            maxHeight: "90vh",
            bgcolor: "background.paper",
            boxShadow: 24,
            borderRadius: 3,
            outline: "none",
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              p: 3,
              borderBottom: "1px solid var(--ws-border, #e0e0e0)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Box>
              <Typography variant="h6" component="h2" fontWeight="bold">
                {selectedDoc?.documentType}
              </Typography>
              <Chip
                label={selectedDoc?.status?.toUpperCase()}
                color={
                  selectedDoc?.status === "pending"
                    ? undefined
                    : getStatusColor(selectedDoc?.status || "pending")
                }
                size="small"
                sx={{
                  bgcolor:
                    selectedDoc?.status === "pending" ? "#FFD700" : undefined,
                  color: selectedDoc?.status === "pending" ? "#000" : undefined,
                }}
              />
            </Box>
            <IconButton
              onClick={handleClose}
              sx={{
                color: "text.secondary",
                "&:hover": { bgcolor: "action.hover" },
              }}
            >
              <CloseIcon />
            </IconButton>
          </Box>

          <Box
            sx={{
              width: "100%",
              height: "70vh",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              overflow: "auto",
              bgcolor: "var(--ws-surface, #f8f9fa)",
            }}
          >
            {selectedDoc?.documentUrl?.endsWith(".pdf") ? (
              <iframe
                src={selectedDoc.documentUrl}
                title={selectedDoc.documentType}
                style={{
                  width: "100%",
                  height: "100%",
                  border: "none",
                }}
              />
            ) : (
              <img
                src={selectedDoc?.documentUrl}
                alt={selectedDoc?.documentType}
                style={{
                  maxWidth: "100%",
                  maxHeight: "100%",
                  objectFit: "contain",
                }}
              />
            )}
          </Box>
        </Box>
      </Modal>

      {/* Document Update Modal */}
      <Modal
        open={updateModalOpen}
        onClose={handleUpdateModalClose}
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backdropFilter: "blur(4px)",
        }}
      >
        <Box
          sx={{
            position: "relative",
            width: "95%",
            maxWidth: "1200px",
            maxHeight: "95vh",
            bgcolor: "background.paper",
            boxShadow: 24,
            borderRadius: 3,
            outline: "none",
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              p: 3,
              borderBottom: "1px solid var(--ws-border, #e0e0e0)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              bgcolor: "primary.main",
              color: "var(--ws-on-primary, #ffffff)",
            }}
          >
            <Typography variant="h6" component="h2" fontWeight="bold">
              Update Documents
            </Typography>
            <IconButton
              onClick={handleUpdateModalClose}
              sx={{
                color: "#ffffff",
                "&:hover": { bgcolor: "rgba(255,255,255,0.1)" },
              }}
            >
              <CloseIcon />
            </IconButton>
          </Box>

          <Box
            sx={{
              height: "85vh",
              overflow: "auto",
              p: 0,
            }}
          >
            <InstructorDocumentUpdate
              instructorId={instructorId}
              isAdmin={isAdmin}
              existingDocuments={documents}
              onUpdate={handleUpdateModalClose}
              preSelectedDocType={preSelectedDocType} // Add this prop
            />
          </Box>
        </Box>
      </Modal>
    </>
  );
};

export default DocumentsTab;
