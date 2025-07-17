import React, { useState } from "react";
import {
  Grid,
  Paper,
  Typography,
  Box,
  Modal,
  IconButton,
  Stack,
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
}

export const DocumentsTab: React.FC<DocumentsTabProps> = ({
  documents,
  instructorId,
  isAdmin = false,
  onDocumentsUpdate,
}) => {
  const [open, setOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [hoveredDoc, setHoveredDoc] = useState<number | null>(null);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);

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

  if (!documents || documents.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: "center" }}>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
            py: 4,
          }}
        >
          <DescriptionIcon sx={{ fontSize: 60, color: "text.secondary" }} />
          <Typography variant="h6" color="text.secondary">
            No documents uploaded yet
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Upload your documents to get started
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setUpdateModalOpen(true)}
            sx={{
              mt: 2,
              borderRadius: 2,
              textTransform: "none",
              boxShadow: 3,
              "&:hover": { boxShadow: 6 },
            }}
          >
            Add Documents
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <>
      <Box sx={{ p: 3 }}>
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
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setUpdateModalOpen(true)}
            sx={{
              borderRadius: 2,
              textTransform: "none",
              boxShadow: 3,
              background: "linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)",
              "&:hover": {
                boxShadow: 6,
                background: "linear-gradient(45deg, #1976D2 30%, #1976D2 90%)",
              },
            }}
          >
            Add More Documents
          </Button>
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
                        : "#ff9800"
                  }`,
                }}
                onClick={() => handleOpen(doc)}
                onMouseEnter={() => setHoveredDoc(index)}
                onMouseLeave={() => setHoveredDoc(null)}
              >
                {doc.status === "rejected" && (
                  <Box
                    sx={{
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      transform: "translate(-50%, -50%)",
                      zIndex: 3,
                      backgroundColor: "rgba(255, 255, 255, 0.95)",
                      borderRadius: 2,
                      p: 1,
                      boxShadow: 2,
                    }}
                  >
                    <Button
                      variant="contained"
                      color="primary"
                      size="small"
                      startIcon={<AddIcon />}
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent opening the view modal
                        handleRejectedDocumentUpload(doc.documentType);
                      }}
                      sx={{
                        textTransform: "none",
                        fontSize: "0.75rem",
                        px: 2,
                        py: 0.5,
                      }}
                    >
                      Upload Document
                    </Button>
                  </Box>
                )}
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
                    color={getStatusColor(doc.status)}
                    size="small"
                    sx={{
                      fontWeight: "bold",
                      textTransform: "uppercase",
                      fontSize: "0.7rem",
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
                      backgroundColor: "rgba(0,0,0,0.7)",
                      borderRadius: "50%",
                      width: 40,
                      height: 40,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <VisibilityIcon sx={{ color: "white", fontSize: 20 }} />
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
                      backgroundColor: "#f8f9fa",
                      borderRadius: 2,
                      position: "relative",
                      mb: 2,
                    }}
                  >
                    <DescriptionIcon sx={{ fontSize: 60, color: "#e53e3e" }} />
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
              borderBottom: "1px solid #e0e0e0",
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
                color={getStatusColor(selectedDoc?.status || "pending")}
                size="small"
                sx={{ mt: 1 }}
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
              bgcolor: "#f8f9fa",
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
              borderBottom: "1px solid #e0e0e0",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              bgcolor: "primary.main",
              color: "white",
            }}
          >
            <Typography variant="h6" component="h2" fontWeight="bold">
              Update Documents
            </Typography>
            <IconButton
              onClick={handleUpdateModalClose}
              sx={{
                color: "white",
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
