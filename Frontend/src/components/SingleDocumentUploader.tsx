import React, { useState, useRef, useEffect } from "react";
import {
  Paper,
  Typography,
  Button,
  Box,
  IconButton,
  ListItem,
  ListItemIcon,
  ListItemText,
  List,
} from "@mui/material";
import {
  Upload,
  Delete,
  Image as ImageIcon,
  InsertDriveFile,
} from "@mui/icons-material";
import type { UseFormSetValue } from "react-hook-form";

// Define document type
type DocumentType = "Driving License" | "ID Card";

// Define the document file type
type DocumentFile = {
  file: File;
  documentType: DocumentType;
};

type SingleDocumentUploaderProps = {
  documentType: DocumentType;
  onFileUpload: (file: File | null, documentType: DocumentType) => void;
  documentFile?: DocumentFile;
  setValue: UseFormSetValue<any>;
  accept?: string;
};

const SingleDocumentUploader: React.FC<SingleDocumentUploaderProps> = ({
  documentType,
  onFileUpload,
  documentFile,
  setValue,
  accept = ".pdf,.jpg,.jpeg,.png",
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    // Create preview URL for the file if it exists
    if (documentFile?.file) {
      const url = URL.createObjectURL(documentFile.file);
      setPreviewUrl(url);

      // Update the documents array in the form state
      setValue(
        "documents",
        [
          {
            documentType,
            documentUrl: "pending", // Placeholder until actual upload
          },
        ],
        { shouldValidate: true }
      );

      // Cleanup function to revoke the object URL
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
      // Remove the document from the documents array
      setValue("documents", [], { shouldValidate: true });
    }
  }, [documentFile, documentType, setValue]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    onFileUpload(file, documentType);
  };

  const handleRemoveFile = () => {
    onFileUpload(null, documentType);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith("image/")) {
      return <ImageIcon color="primary" />;
    }
    return <InsertDriveFile color="primary" />;
  };

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 3,
        border: "2px dashed",
        borderColor: "primary.main",
        textAlign: "center",
        backgroundColor: "#f5f5f5",
        mb: 3,
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
          onChange={handleFileChange}
          accept={accept}
        />
      </Button>

      {documentFile?.file && (
        <Box sx={{ mt: 2 }}>
          <List dense>
            <ListItem
              secondaryAction={
                <IconButton edge="end" onClick={handleRemoveFile} color="error">
                  <Delete />
                </IconButton>
              }
              sx={{
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 1,
                mb: 1,
                backgroundColor: "background.paper",
              }}
            >
              <ListItemIcon>{getFileIcon(documentFile.file.type)}</ListItemIcon>
              <ListItemText
                primary={documentFile.file.name}
                secondary={`${(documentFile.file.size / 1024).toFixed(2)} KB`}
              />
            </ListItem>
          </List>

          {/* Preview Section - Show preview if it's an image */}
          {documentFile.file.type.startsWith("image/") && previewUrl && (
            <Box sx={{ mt: 2, textAlign: "center" }}>
              <Typography variant="subtitle2" gutterBottom>
                Preview
              </Typography>
              <img
                src={previewUrl}
                alt={documentFile.file.name}
                style={{
                  maxWidth: "100%",
                  maxHeight: "200px",
                  borderRadius: "4px",
                }}
              />
            </Box>
          )}
        </Box>
      )}
    </Paper>
  );
};

export default SingleDocumentUploader;
