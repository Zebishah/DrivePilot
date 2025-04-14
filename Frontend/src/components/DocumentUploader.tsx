import type React from "react";
import { useState, useRef, useEffect } from "react";
import {
  Paper,
  Typography,
  Button,
  Box,
  IconButton,
  ListItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import {
  Upload,
  Delete,
  Image as ImageIcon,
  InsertDriveFile,
} from "@mui/icons-material";
import type { UseFormSetValue } from "react-hook-form";
import { List } from "@mui/material";

// Define the type for a single document
type Document = {
  file: File;
  name: string;
  url: string;
  type: string;
  id: string; // Unique identifier for each file
};

type DocumentUploaderProps = {
  onFileUpload: (files: File[] | null, documentType: string) => void;
  selectedFiles: File[] | null;
  setSelectedFiles: (files: File[] | null) => void;
  setValue: UseFormSetValue<any>;
  documentType: string;
  maxFiles?: number;
  accept?: string;
};
const DocumentUploader: React.FC<DocumentUploaderProps> = ({
  onFileUpload,
  selectedFiles,
  setSelectedFiles,
  setValue,
  documentType,
  maxFiles = 5,
  accept = ".pdf,.jpg,.jpeg,.png",
}) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (selectedFiles && selectedFiles.length > 0) {
      const newDocuments = selectedFiles.map((file) => ({
        file,
        name: file.name,
        url: URL.createObjectURL(file),
        type: file.type,
        id: `${file.name}-${file.lastModified}-${file.size}`,
      }));
      setDocuments(newDocuments);
    } else {
      setDocuments([]);
    }
  }, [selectedFiles]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);

    if (files.length === 0) return;

    // Check if adding these files would exceed maxFiles limit
    if (documents.length + files.length > maxFiles) {
      alert(`You can upload a maximum of ${maxFiles} files`);
      return;
    }

    const newDocuments = files.map((file) => ({
      file,
      name: file.name,
      url: URL.createObjectURL(file),
      type: file.type,
      id: `${file.name}-${file.lastModified}-${file.size}`,
    }));

    const updatedDocuments = [...documents, ...newDocuments];
    setDocuments(updatedDocuments);

    // Convert to File array and send to parent
    const fileArray = updatedDocuments.map((doc) => doc.file);
    onFileUpload(fileArray, documentType);
    setSelectedFiles(fileArray);
    setValue("documentUrl", "uploaded", { shouldValidate: true });
  };

  const handleRemoveFile = (id: string) => {
    const updatedDocuments = documents.filter((doc) => doc.id !== id);
    setDocuments(updatedDocuments);

    if (updatedDocuments.length === 0) {
      onFileUpload(null, documentType);
      setSelectedFiles(null);
      setValue("documentUrl", "", { shouldValidate: true });
    } else {
      const fileArray = updatedDocuments.map((doc) => doc.file);
      onFileUpload(fileArray, documentType);
      setSelectedFiles(fileArray);
    }
  };

  const handleRemoveAll = () => {
    setDocuments([]);
    onFileUpload(null, documentType);
    setSelectedFiles(null);
    setValue("documentUrl", "", { shouldValidate: true });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) {
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
      }}
    >
      <Typography variant="body1" sx={{ mb: 2 }}>
        Please upload your {documentType} (max {maxFiles} files)
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
          onChange={handleFileUpload}
          accept={accept}
          multiple
        />
      </Button>

      {documents.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 1,
            }}
          >
            <Typography variant="subtitle2">
              {documents.length} file(s) selected
            </Typography>
            <Button
              size="small"
              color="error"
              onClick={handleRemoveAll}
              disabled={documents.length === 0}
            >
              Remove All
            </Button>
          </Box>

          <List dense sx={{ maxHeight: 300, overflow: "auto" }}>
            {documents.map((document) => (
              <ListItem
                key={document.id}
                secondaryAction={
                  <IconButton
                    edge="end"
                    onClick={() => handleRemoveFile(document.id)}
                    color="error"
                  >
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
                <ListItemIcon>{getFileIcon(document.type)}</ListItemIcon>
                <ListItemText
                  primary={document.name}
                  secondary={`${(document.file.size / 1024).toFixed(2)} KB`}
                />
              </ListItem>
            ))}
          </List>

          {/* Preview Section - Show preview for the first file */}
          {documents.length > 0 && documents[0].type.startsWith("image/") && (
            <Box sx={{ mt: 2, textAlign: "center" }}>
              <Typography variant="subtitle2" gutterBottom>
                Preview (first image)
              </Typography>
              <img
                src={documents[0].url}
                alt={documents[0].name}
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

export default DocumentUploader;
