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
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import VisibilityIcon from "@mui/icons-material/Visibility";

interface Document {
  documentType: string;
  documentUrl: string;
}

interface DocumentsTabProps {
  documents: Document[];
}

export const DocumentsTab: React.FC<DocumentsTabProps> = ({ documents }) => {
  const [open, setOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [hoveredDoc, setHoveredDoc] = useState<number | null>(null);

  const handleOpen = (doc: Document) => {
    setSelectedDoc(doc);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedDoc(null);
  };

  if (!documents || documents.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: "center" }}>
        <Typography variant="body1" color="text.secondary">
          No documents uploaded yet
        </Typography>
      </Box>
    );
  }

  return (
    <>
      <Grid container spacing={3}>
        {documents.map((doc: Document, index: number) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Paper
              sx={{
                p: 2,
                textAlign: "center",
                cursor: "pointer",
                "&:hover": { boxShadow: 4 },
                transition: "box-shadow 0.3s",
                position: "relative",
                overflow: "hidden",
              }}
              onClick={() => handleOpen(doc)}
              onMouseEnter={() => setHoveredDoc(index)}
              onMouseLeave={() => setHoveredDoc(null)}
            >
              {/* Eye icon overlay - appears on hover */}
              <Fade in={hoveredDoc === index}>
                <Box
                  sx={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    zIndex: 2,
                    backgroundColor: "rgba(0,0,0,0.5)",
                    borderRadius: "50%",
                    width: 32,
                    height: 32,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <VisibilityIcon sx={{ color: "white", fontSize: 18 }} />
                </Box>
              </Fade>

              {doc.documentUrl?.endsWith(".pdf") ? (
                <Box
                  sx={{
                    width: "100%",
                    height: "150px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    backgroundColor: "#f5f5f5",
                    borderRadius: "8px",
                    position: "relative",
                  }}
                >
                  <iframe
                    src={doc.documentUrl}
                    title={doc.documentType}
                    style={{
                      width: "100%",
                      height: "100%",
                      border: "none",
                    }}
                  />
                </Box>
              ) : (
                <Box sx={{ position: "relative", height: "150px" }}>
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
              <Typography variant="body1" sx={{ mt: 1 }}>
                {doc.documentType}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Modal
        open={open}
        onClose={handleClose}
        aria-labelledby="document-preview-modal"
        aria-describedby="document-preview-modal-description"
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Box
          sx={{
            position: "relative",
            width: "80%",
            maxWidth: "900px",
            maxHeight: "90vh",
            bgcolor: "background.paper",
            boxShadow: 24,
            p: 2,
            borderRadius: 1,
            outline: "none",
          }}
        >
          <IconButton
            aria-label="close"
            onClick={handleClose}
            sx={{
              position: "absolute",
              right: 8,
              top: 8,
              color: (theme) => theme.palette.grey[500],
              zIndex: 1,
            }}
          >
            <CloseIcon />
          </IconButton>

          <Stack spacing={2}>
            <Typography variant="h6" component="h2">
              {selectedDoc?.documentType}
            </Typography>

            <Box
              sx={{
                width: "100%",
                height: "70vh",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                overflow: "auto",
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
          </Stack>
        </Box>
      </Modal>
    </>
  );
};
