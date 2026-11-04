import React, { useState, useRef, useEffect } from "react";
import { Paper, Typography, Button, Box, IconButton } from "@mui/material";
import { Upload, Delete } from "@mui/icons-material";
import DescriptionIcon from "@mui/icons-material/Description";
import type { UseFormSetValue } from "react-hook-form";

// Define the type for a single document
type Document = {
  file: File;
  name: string;
  url: string;
  type: string;
};

type DocumentUploaderInstructorProps = {
  onFileUpload: (file: File | null, documentType: string) => void;
  selectedFile: File | null;
  setSelectedFile: (file: File | null) => void;
  setValue: UseFormSetValue<any>;
  documentType: string;
  allowMultiple?: boolean;
};

const DocumentUploaderInstructor: React.FC<DocumentUploaderInstructorProps> = ({
  onFileUpload,
  selectedFile,
  setSelectedFile,
  setValue,
  documentType,
  allowMultiple = false,
}) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (selectedFile && !allowMultiple) {
      const doc = {
        file: selectedFile,
        name: selectedFile.name,
        url: URL.createObjectURL(selectedFile),
        type: selectedFile.type,
      };
      setDocuments([doc]);
    }
  }, [selectedFile, allowMultiple]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? Array.from(event.target.files) : [];
    const newDocs: Document[] = files.map((file) => ({
      file,
      name: file.name,
      url: URL.createObjectURL(file),
      type: file.type,
    }));

    const updatedDocuments = allowMultiple
      ? [...documents, ...newDocs]
      : newDocs.slice(0, 1);

    setDocuments(updatedDocuments);

    // Notify parent
    if (allowMultiple) {
      newDocs.forEach((doc) => onFileUpload(doc.file, documentType));
    } else {
      const doc = newDocs[0];
      setSelectedFile(doc.file);
      onFileUpload(doc.file, documentType);
    }
  };

  const handleRemoveDocument = (docToRemove: Document) => {
    const updated = documents.filter((doc) => doc.name !== docToRemove.name);
    setDocuments(updated);

    if (allowMultiple) {
      const remainingFiles = updated.map((d) => d.file);
      setValue("documents", remainingFiles);
    } else {
      setSelectedFile(null);
      onFileUpload(null, documentType);
    }
  };

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 3,
        border: "2px dashed",
        borderColor: "primary.main",
        textAlign: "center",
        backgroundColor: "var(--ws-surface, #f5f5f5)",
      }}
    >
      <Typography variant="body1" sx={{ mb: 2 }}>
        Please upload your {documentType}
      </Typography>

      <Button
        component="label"
        variant="contained"
        startIcon={<Upload />}
        sx={{ mb: 2 }}
      >
        Upload {documentType}
        <input
          ref={fileInputRef}
          type="file"
          hidden
          multiple={allowMultiple}
          onChange={handleFileUpload}
          accept=".pdf,.jpg,.jpeg,.png"
        />
      </Button>

      <Box sx={{ mt: 2 }}>
        {documents.map((doc, idx) => (
          <Box
            key={idx}
            sx={{
              mt: 2,
              p: 2,
              border: "1px solid var(--ws-border, #e0e0e0)",
              borderRadius: 1,
              backgroundColor: "background.paper",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
              <Typography
                variant="body2"
                sx={{ flexGrow: 1, fontWeight: "bold" }}
              >
                {doc.name}
              </Typography>
              <IconButton onClick={() => handleRemoveDocument(doc)}>
                <Delete fontSize="small" />
              </IconButton>
            </Box>

            {doc.type.startsWith("image/") ? (
              <Box
                sx={{
                  mt: 1,
                  height: "20vh",
                  overflow: "hidden",
                  display: "flex",
                  justifyContent: "center",
                }}
              >
                <img
                  src={doc.url}
                  alt={doc.name}
                  style={{
                    maxWidth: "100%",
                    height: "100%",
                    objectFit: "contain",
                  }}
                />
              </Box>
            ) : (
              <Box
                sx={{
                  mt: 1,
                  p: 2,
                  backgroundColor: "var(--ws-surface, #f5f5f5)",
                  borderRadius: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <DescriptionIcon sx={{ mr: 1, color: "primary.main" }} />
                <Typography variant="body2">
                  PDF Document (Preview not available)
                </Typography>
              </Box>
            )}
          </Box>
        ))}
      </Box>
    </Paper>
  );
};

export default DocumentUploaderInstructor;
