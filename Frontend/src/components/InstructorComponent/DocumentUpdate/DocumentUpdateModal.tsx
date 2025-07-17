import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  FormControl,
  Select,
  MenuItem,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Alert,
  Card,
  CardContent,
  Divider,
  LinearProgress,
  Grid,
  Paper,
  InputLabel,
  OutlinedInput,
  Checkbox,
  ListItemText,
} from "@mui/material";
import {
  ExpandMore as ExpandMoreIcon,
  Delete as DeleteIcon,
  Description as DescriptionIcon,
  Edit as EditIcon,
  CloudUpload as CloudUploadIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  HourglassEmpty as HourglassEmptyIcon,
  Upload as UploadIcon,
  Folder as FolderIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon,
} from "@mui/icons-material";
import { gql, useMutation, useQuery } from "@apollo/client";
import { useForm, Controller } from "react-hook-form";
import { useAuth } from "../../../context/AuthContext";
import { useFileUpload } from "../../../hooks/useUploadURL";
import toast from "react-hot-toast";
import DocumentUploaderInstructor from "../../public/DocumentUploaderInstructor";

// GraphQL Mutations
const UPDATE_INSTRUCTOR_DOCUMENTS = gql`
  mutation UpdateInstructorDocuments($input: UpdateInstructorDocumentsInput!) {
    updateInstructorDocuments(input: $input) {
      _id
      documents {
        _id
        documentType
        documentUrl
        status
      }
    }
  }
`;

export const UPDATE_DOCUMENT_STATUS = gql`
  mutation UpdateDocumentStatus($documentId: ID!, $status: String!) {
    updateDocumentStatus(documentId: $documentId, status: $status) {
      _id
      documentType
      status
    }
  }
`;

const GET_INSTRUCTOR_DOCUMENTS = gql`
  query GetInstructorDocuments($instructorId: ID!) {
    getInstructorDocuments(instructorId: $instructorId) {
      _id
      documents {
        _id
        documentType
        documentUrl
        status
      }
    }
  }
`;

interface Document {
  _id: string;
  documentType: string;
  documentUrl: string;
  status: "pending" | "accepted" | "rejected";
}

interface InstructorDocumentUpdateProps {
  instructorId?: string;
  isAdmin?: boolean;
  existingDocuments?: Document[];
  onUpdate?: () => void;
  preSelectedDocType?: string | null; // Add this
}

const InstructorDocumentUpdate: React.FC<InstructorDocumentUpdateProps> = ({
  instructorId,
  isAdmin = false,
  existingDocuments = [],
  onUpdate,
  preSelectedDocType = null, // Add this
}) => {
  const { user } = useAuth();
  const { uploadFile } = useFileUpload();
  const [updateInstructorDocuments] = useMutation(UPDATE_INSTRUCTOR_DOCUMENTS);
  const [updateDocumentStatus] = useMutation(UPDATE_DOCUMENT_STATUS);

  const targetInstructorId = instructorId || user?.id;

  const {
    data: instructorData,
    loading: loadingDocuments,
    refetch,
  } = useQuery(GET_INSTRUCTOR_DOCUMENTS, {
    variables: { instructorId: targetInstructorId },
    skip: !targetInstructorId || existingDocuments.length > 0,
  });

  const [selectedFiles, setSelectedFiles] = useState<
    { file: File; documentType: string }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [statusUpdateDialog, setStatusUpdateDialog] = useState<{
    open: boolean;
    document: Document | null;
  }>({ open: false, document: null });

  // New state for selected categories
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const requiredDocuments = [
    "Swiss Driving License",
    "National ID or Passport",
    "Federal Driving Instructor Certificate",
    "Swiss Criminal Record Extract",
  ];

  const optionalDocuments = [
    "Driving Instructor Authorization",
    "Professional Passenger Transport Authorization",
    "Refresher Training Certificates",
    "Other Document (Optional)",
  ];

  // Combined all documents for dropdown
  const allDocumentCategories = [
    ...requiredDocuments.map((doc) => ({ name: doc, required: true })),
    ...optionalDocuments.map((doc) => ({ name: doc, required: false })),
  ];
  useEffect(() => {
    if (preSelectedDocType) {
      setSelectedCategories([preSelectedDocType]);
    }
  }, [preSelectedDocType]);

  // Add this useEffect after the existing state declarations
  useEffect(() => {
    if (preSelectedDocType) {
      setSelectedCategories([preSelectedDocType]);
    }
  }, [preSelectedDocType]);
  const multipleUploadAllowed = [
    "Professional Passenger Transport Authorization",
    "Refresher Training Certificates",
    "Other Document (Optional)",
  ];

  const documents =
    existingDocuments.length > 0
      ? existingDocuments
      : instructorData?.getInstructorDocuments?.documents || [];

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: {
      documents: [],
    },
  });

  // Check if a document type is accepted (cannot be updated)
  const isDocumentAccepted = (documentType: string): boolean => {
    // Special handling for Swiss Driving License - both front and back must be accepted
    if (documentType === "Swiss Driving License") {
      const frontAccepted = documents.some(
        (doc: Document) =>
          doc.documentType === "Swiss Driving License (Front)" &&
          doc.status === "accepted"
      );
      const backAccepted = documents.some(
        (doc: Document) =>
          doc.documentType === "Swiss Driving License (Back)" &&
          doc.status === "accepted"
      );
      return frontAccepted && backAccepted;
    }

    // For document types that allow multiple uploads, check if we should allow more uploads
    if (allowsMultipleUploads(documentType)) {
      // For multiple upload documents, allow uploads unless specifically restricted
      // You can add specific logic here if needed
      return false; // Always allow uploads for multiple document types
    }

    // For single document types, check if there's an accepted document
    const acceptedDocs = documents.filter(
      (doc: Document) =>
        doc.documentType === documentType && doc.status === "accepted"
    );

    // Only disable if there's an accepted document for single-upload types
    return acceptedDocs.length > 0;
  };
  // Check if document type allows multiple uploads
  const allowsMultipleUploads = (documentType: string): boolean => {
    return multipleUploadAllowed.includes(documentType);
  };

  // Get existing documents for a specific type
  const getExistingDocuments = (documentType: string): Document[] => {
    // Special handling for Swiss Driving License
    if (documentType === "Swiss Driving License") {
      return documents.filter(
        (doc: Document) =>
          doc.documentType === "Swiss Driving License (Front)" ||
          doc.documentType === "Swiss Driving License (Back)"
      );
    }

    return documents.filter(
      (doc: Document) => doc.documentType === documentType
    );
  };

  // Handle category selection change
  const handleCategoryChange = (event: any) => {
    const {
      target: { value },
    } = event;
    setSelectedCategories(typeof value === "string" ? value.split(",") : value);
  };

  // Handle file upload
  const handleFileUpload = (file: File | null, documentType: string) => {
    if (file) {
      if (allowsMultipleUploads(documentType)) {
        setSelectedFiles((prev) => [...prev, { file, documentType }]);
      } else {
        setSelectedFiles((prev) => [
          ...prev.filter((doc) => doc.documentType !== documentType),
          { file, documentType },
        ]);
      }
    } else {
      setSelectedFiles((prev) =>
        prev.filter((doc) => doc.documentType !== documentType)
      );
    }
  };

  // Handle document update submission
  const handleUpdateDocuments = async () => {
    if (selectedFiles.length === 0) {
      toast.error("Please select at least one document to update.");
      return;
    }

    // Check if Swiss Driving License is selected but incomplete
    const hasSwissLicenseFiles = selectedFiles.some(
      (file) =>
        file.documentType === "Swiss Driving License (Front)" ||
        file.documentType === "Swiss Driving License (Back)"
    );

    if (hasSwissLicenseFiles && !isSwissLicenseComplete()) {
      toast.error(
        "Please upload both front and back sides of the Swiss Driving License before submitting."
      );
      return;
    }

    try {
      setLoading(true);

      const documentUploads = await Promise.all(
        selectedFiles.map(async (file) => {
          const uploadResult = await uploadFile(
            file.file,
            targetInstructorId,
            "Instructor"
          );
          if (!uploadResult.success) {
            throw new Error(`File upload failed: ${uploadResult.message}`);
          }
          return {
            documentType: file.documentType,
            documentUrl: uploadResult.fileUrl,
            status: "pending",
          };
        })
      );

      await updateInstructorDocuments({
        variables: {
          input: {
            instructorId: targetInstructorId,
            documents: documentUploads,
          },
        },
      });

      toast.success("Documents updated successfully!");
      setSelectedFiles([]);

      // Refetch the internal query if available
      if (refetch) {
        await refetch();
      }

      // Call the parent update callback to refetch profile data
      if (onUpdate) onUpdate();
    } catch (error) {
      toast.error(`Document update failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle document status update (admin only)
  const handleStatusUpdate = async (newStatus: string) => {
    if (!statusUpdateDialog.document) return;

    try {
      await updateDocumentStatus({
        variables: {
          documentId: statusUpdateDialog.document._id,
          status: newStatus,
        },
      });

      toast.success(`Document status updated to ${newStatus}`);
      setStatusUpdateDialog({ open: false, document: null });

      // Refetch the internal query if available
      if (refetch) {
        await refetch();
      }

      // Call the parent update callback to refetch profile data
      if (onUpdate) onUpdate();
    } catch (error) {
      toast.error(`Status update failed: ${error.message}`);
    }
  };

  // Remove selected file
  const removeSelectedFile = (fileToRemove: {
    file: File;
    documentType: string;
  }) => {
    setSelectedFiles((prev) =>
      prev.filter(
        (f) =>
          !(
            f.documentType === fileToRemove.documentType &&
            f.file.name === fileToRemove.file.name
          )
      )
    );
  };

  // Get status color and icon
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
        return <CheckCircleIcon />;
      case "rejected":
        return <CancelIcon />;
      case "pending":
      default:
        return <HourglassEmptyIcon />;
    }
  };
  const shouldShowUploadSection = (documentType: string): boolean => {
    // Special handling for Swiss Driving License
    if (documentType === "Swiss Driving License") {
      const frontAccepted = documents.some(
        (doc: Document) =>
          doc.documentType === "Swiss Driving License (Front)" &&
          doc.status === "accepted"
      );
      const backAccepted = documents.some(
        (doc: Document) =>
          doc.documentType === "Swiss Driving License (Back)" &&
          doc.status === "accepted"
      );

      // Show upload section if either front or back is not accepted
      return !(frontAccepted && backAccepted);
    }

    // For document types that allow multiple uploads, always show upload section
    if (allowsMultipleUploads(documentType)) {
      return true;
    }

    // For single document types, hide upload section only if there's an accepted document
    const acceptedDocs = documents.filter(
      (doc: Document) =>
        doc.documentType === documentType && doc.status === "accepted"
    );

    return acceptedDocs.length === 0;
  };
  const getSwissLicenseSelectedFiles = () => {
    const frontFile = selectedFiles.find(
      (doc) => doc.documentType === "Swiss Driving License (Front)"
    );
    const backFile = selectedFiles.find(
      (doc) => doc.documentType === "Swiss Driving License (Back)"
    );
    return { frontFile, backFile };
  };
  const isSwissLicenseComplete = () => {
    const { frontFile, backFile } = getSwissLicenseSelectedFiles();
    return frontFile && backFile;
  };

  const renderDocumentSection = (
    docType: string,
    isRequired: boolean = true
  ) => {
    const existingDocs = getExistingDocuments(docType);
    const isAccepted = isDocumentAccepted(docType);
    const allowsMultiple = allowsMultipleUploads(docType);

    return (
      <Card
        key={docType}
        elevation={2}
        sx={{
          mb: 3,
          borderRadius: 3,
          border: isAccepted ? "2px solid #4caf50" : "1px solid #e0e0e0",
          position: "relative",
          overflow: "visible",
        }}
      >
        {isAccepted && (
          <Box
            sx={{
              position: "absolute",
              top: -8,
              right: 16,
              bgcolor: "success.main",
              color: "white",
              px: 2,
              py: 0.5,
              borderRadius: 2,
              fontSize: "0.75rem",
              fontWeight: "bold",
              zIndex: 1,
            }}
          >
            ✓ ACCEPTED
          </Box>
        )}

        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
            <FolderIcon sx={{ mr: 1, color: "primary.main" }} />
            <Typography variant="h6" sx={{ fontWeight: "bold", flexGrow: 1 }}>
              {docType}
            </Typography>
            {isRequired && (
              <Chip
                label="Required"
                color="error"
                size="small"
                variant="outlined"
              />
            )}
            {allowsMultiple && (
              <Chip
                label="Multiple Allowed"
                color="info"
                size="small"
                variant="outlined"
                sx={{ ml: 1 }}
              />
            )}
          </Box>

          {/* Show existing documents */}
          {existingDocs.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography
                variant="subtitle2"
                color="text.secondary"
                sx={{ mb: 2 }}
              >
                Current Documents ({existingDocs.length})
              </Typography>
              <Grid container spacing={2}>
                {existingDocs.map((doc) => (
                  <Grid item xs={12} md={6} key={doc._id}>
                    <Paper
                      elevation={1}
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        border: `1px solid ${
                          doc.status === "accepted"
                            ? "#4caf50"
                            : doc.status === "rejected"
                              ? "#f44336"
                              : "#ff9800"
                        }`,
                      }}
                    >
                      <Box
                        sx={{ display: "flex", alignItems: "center", mb: 1 }}
                      >
                        <DescriptionIcon
                          sx={{ mr: 1, color: "text.secondary" }}
                        />
                        <Typography variant="body2" sx={{ flexGrow: 1 }}>
                          {doc.documentType}
                        </Typography>
                        <Chip
                          icon={getStatusIcon(doc.status)}
                          label={doc.status.toUpperCase()}
                          color={getStatusColor(doc.status)}
                          size="small"
                          sx={{ fontWeight: "bold" }}
                        />
                      </Box>
                      <Box sx={{ display: "flex", gap: 1, mt: 2 }}>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => window.open(doc.documentUrl, "_blank")}
                          sx={{ textTransform: "none" }}
                        >
                          View Document
                        </Button>
                        {isAdmin && (
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<EditIcon />}
                            onClick={() =>
                              setStatusUpdateDialog({
                                open: true,
                                document: doc,
                              })
                            }
                            sx={{ textTransform: "none" }}
                          >
                            Update Status
                          </Button>
                        )}
                      </Box>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}

          <Divider sx={{ my: 2 }} />

          {/* Upload section */}
          {shouldShowUploadSection(docType) ? (
            <Box>
              <Typography
                variant="subtitle2"
                sx={{ mb: 2, color: "text.secondary" }}
              >
                Upload New Document{allowsMultiple ? "s" : ""}
              </Typography>

              {docType === "Swiss Driving License" ? (
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography
                      variant="body2"
                      sx={{ mb: 1, fontWeight: "medium" }}
                    >
                      Front Side
                    </Typography>
                    {!documents.some(
                      (doc: Document) =>
                        doc.documentType === "Swiss Driving License (Front)" &&
                        doc.status === "accepted"
                    ) ? (
                      <DocumentUploaderInstructor
                        onFileUpload={(file) =>
                          handleFileUpload(
                            file,
                            "Swiss Driving License (Front)"
                          )
                        }
                        selectedFile={
                          selectedFiles.find(
                            (doc) =>
                              doc.documentType ===
                              "Swiss Driving License (Front)"
                          )?.file || null
                        }
                        setSelectedFile={(file) =>
                          handleFileUpload(
                            file,
                            "Swiss Driving License (Front)"
                          )
                        }
                        setValue={setValue}
                        documentType="Swiss Driving License (Front)"
                      />
                    ) : (
                      <Alert
                        severity="success"
                        sx={{ borderRadius: 2 }}
                        icon={<CheckCircleIcon />}
                      >
                        <Typography variant="body2">
                          Front side has been <strong>accepted</strong>
                        </Typography>
                      </Alert>
                    )}
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography
                      variant="body2"
                      sx={{ mb: 1, fontWeight: "medium" }}
                    >
                      Back Side
                    </Typography>
                    {!documents.some(
                      (doc: Document) =>
                        doc.documentType === "Swiss Driving License (Back)" &&
                        doc.status === "accepted"
                    ) ? (
                      <DocumentUploaderInstructor
                        onFileUpload={(file) =>
                          handleFileUpload(file, "Swiss Driving License (Back)")
                        }
                        selectedFile={
                          selectedFiles.find(
                            (doc) =>
                              doc.documentType ===
                              "Swiss Driving License (Back)"
                          )?.file || null
                        }
                        setSelectedFile={(file) =>
                          handleFileUpload(file, "Swiss Driving License (Back)")
                        }
                        setValue={setValue}
                        documentType="Swiss Driving License (Back)"
                      />
                    ) : (
                      <Alert
                        severity="success"
                        sx={{ borderRadius: 2 }}
                        icon={<CheckCircleIcon />}
                      >
                        <Typography variant="body2">
                          Back side has been <strong>accepted</strong>
                        </Typography>
                      </Alert>
                    )}
                  </Grid>

                  {/* ADD THIS NEW ALERT SECTION */}
                  {selectedFiles.some(
                    (file) =>
                      file.documentType === "Swiss Driving License (Front)" ||
                      file.documentType === "Swiss Driving License (Back)"
                  ) &&
                    !isSwissLicenseComplete() && (
                      <Grid item xs={12}>
                        <Alert
                          severity="warning"
                          sx={{ borderRadius: 2, mt: 2 }}
                          icon={<HourglassEmptyIcon />}
                        >
                          <Typography variant="body2">
                            <strong>Important:</strong> Please upload both front
                            and back sides of the Swiss Driving License before
                            submitting.
                            {selectedFiles.find(
                              (f) =>
                                f.documentType ===
                                "Swiss Driving License (Front)"
                            )
                              ? " ✓ Front uploaded"
                              : " ⚠️ Front needed"}
                            {selectedFiles.find(
                              (f) =>
                                f.documentType ===
                                "Swiss Driving License (Back)"
                            )
                              ? " ✓ Back uploaded"
                              : " ⚠️ Back needed"}
                          </Typography>
                        </Alert>
                      </Grid>
                    )}
                </Grid>
              ) : docType === "Other Document (Optional)" ? (
                <Box>
                  <input
                    accept=".pdf,.jpg,.jpeg,.png"
                    style={{ display: "none" }}
                    id="other-docs-upload"
                    type="file"
                    multiple
                    onChange={(e) => {
                      const files = e.target.files
                        ? Array.from(e.target.files)
                        : [];
                      files.forEach((file) => {
                        handleFileUpload(file, "Other Document (Optional)");
                      });
                    }}
                  />
                  <label htmlFor="other-docs-upload">
                    <Button
                      variant="outlined"
                      component="span"
                      startIcon={<CloudUploadIcon />}
                      sx={{
                        p: 3,
                        borderRadius: 2,
                        borderStyle: "dashed",
                        textTransform: "none",
                        width: "100%",
                        "&:hover": {
                          bgcolor: "action.hover",
                        },
                      }}
                    >
                      Upload Multiple Files
                    </Button>
                  </label>
                </Box>
              ) : (
                <DocumentUploaderInstructor
                  onFileUpload={(file) => handleFileUpload(file, docType)}
                  selectedFile={
                    selectedFiles.find((doc) => doc.documentType === docType)
                      ?.file || null
                  }
                  setSelectedFile={(file) => handleFileUpload(file, docType)}
                  setValue={setValue}
                  documentType={docType}
                  allowMultiple={allowsMultiple}
                />
              )}
            </Box>
          ) : (
            <Alert
              severity="success"
              sx={{ borderRadius: 2 }}
              icon={<CheckCircleIcon />}
            >
              <Typography variant="body2">
                All documents for this category have been{" "}
                <strong>accepted</strong> and cannot be updated.
              </Typography>
            </Alert>
          )}
        </CardContent>
      </Card>
    );
  };

  if (loadingDocuments) {
    return (
      <Box sx={{ p: 3, textAlign: "center" }}>
        <LinearProgress sx={{ mb: 2 }} />
        <Typography>Loading documents...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4, bgcolor: "#f8f9fa" }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: "bold", mb: 1 }}>
          Document Management
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Select document categories to upload and manage your instructor
          documents
        </Typography>
      </Box>

      {/* Multi-Select Dropdown for Document Categories */}
      <Card elevation={3} sx={{ mb: 4, borderRadius: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
            <FolderIcon sx={{ mr: 1, color: "primary.main" }} />
            <Typography variant="h6" sx={{ fontWeight: "bold" }}>
              Select Document Categories
            </Typography>
          </Box>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel id="document-categories-label">
              Choose Document Categories
            </InputLabel>
            <Select
              labelId="document-categories-label"
              multiple
              value={selectedCategories}
              onChange={handleCategoryChange}
              input={<OutlinedInput label="Choose Document Categories" />}
              renderValue={(selected) => (
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                  {selected.map((value) => {
                    const category = allDocumentCategories.find(
                      (cat) => cat.name === value
                    );
                    return (
                      <Chip
                        key={value}
                        label={value}
                        size="small"
                        color={category?.required ? "error" : "default"}
                        variant="outlined"
                        sx={{ fontSize: "0.75rem" }}
                      />
                    );
                  })}
                </Box>
              )}
              MenuProps={{
                PaperProps: {
                  style: {
                    maxHeight: 400,
                    width: 350,
                  },
                },
              }}
            >
              <MenuItem disabled>
                <Typography
                  variant="subtitle2"
                  sx={{ fontWeight: "bold", color: "error.main" }}
                >
                  Required Documents
                </Typography>
              </MenuItem>
              {allDocumentCategories
                .filter((cat) => cat.required)
                .map((category) => (
                  <MenuItem key={category.name} value={category.name}>
                    <Checkbox
                      checked={selectedCategories.indexOf(category.name) > -1}
                    />
                    <ListItemText primary={category.name} />
                  </MenuItem>
                ))}

              <Divider sx={{ my: 1 }} />

              <MenuItem disabled>
                <Typography
                  variant="subtitle2"
                  sx={{ fontWeight: "bold", color: "info.main" }}
                >
                  Optional Documents
                </Typography>
              </MenuItem>
              {allDocumentCategories
                .filter((cat) => !cat.required)
                .map((category) => (
                  <MenuItem key={category.name} value={category.name}>
                    <Checkbox
                      checked={selectedCategories.indexOf(category.name) > -1}
                    />
                    <ListItemText primary={category.name} />
                  </MenuItem>
                ))}
            </Select>
          </FormControl>

          {selectedCategories.length > 0 && (
            <Alert
              severity="info"
              sx={{ borderRadius: 2 }}
              icon={<DescriptionIcon />}
            >
              <Typography variant="body2">
                You have selected <strong>{selectedCategories.length}</strong>{" "}
                document categories. Scroll down to upload documents for each
                selected category.
              </Typography>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Show Document Sections Based on Selection */}
      {selectedCategories.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography
            variant="h5"
            sx={{ fontWeight: "bold", mb: 3, color: "primary.main" }}
          >
            📋 Selected Document Categories ({selectedCategories.length})
          </Typography>
          {selectedCategories.map((category) => {
            const isRequired = allDocumentCategories.find(
              (cat) => cat.name === category
            )?.required;
            return renderDocumentSection(category, isRequired);
          })}
        </Box>
      )}

      {/* Selected Files Preview */}
      {selectedFiles.length > 0 && (
        <Card elevation={3} sx={{ mb: 4, borderRadius: 3 }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
              <UploadIcon sx={{ mr: 1, color: "primary.main" }} />
              <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                Files Ready for Upload ({selectedFiles.length})
              </Typography>
            </Box>
            <Grid container spacing={2}>
              {selectedFiles.map((selectedFile, index) => (
                <Grid item xs={12} md={6} key={index}>
                  <Paper
                    elevation={1}
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      border: "1px solid #e0e0e0",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                        {selectedFile.documentType}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {selectedFile.file.name}
                      </Typography>
                    </Box>
                    <IconButton
                      onClick={() => removeSelectedFile(selectedFile)}
                      color="error"
                      size="small"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      {selectedCategories.length > 0 && (
        <Box
          sx={{
            position: "sticky",
            bottom: 0,
            bgcolor: "background.paper",
            p: 3,
            borderTop: "1px solid #e0e0e0",
            display: "flex",
            gap: 2,
            justifyContent: "center",
          }}
        >
          <Button
            variant="contained"
            size="large"
            onClick={handleUpdateDocuments}
            disabled={
              loading ||
              selectedFiles.length === 0 ||
              (selectedFiles.some(
                (file) =>
                  file.documentType === "Swiss Driving License (Front)" ||
                  file.documentType === "Swiss Driving License (Back)"
              ) &&
                !isSwissLicenseComplete())
            }
            startIcon={loading ? <HourglassEmptyIcon /> : <UploadIcon />}
            sx={{
              px: 6,
              py: 1.5,
              borderRadius: 3,
              textTransform: "none",
              fontWeight: "bold",
              background: "linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)",
              boxShadow: 4,
              "&:hover": {
                background: "linear-gradient(45deg, #1976D2 30%, #1976D2 90%)",
                boxShadow: 6,
              },
            }}
          >
            {loading
              ? "Uploading..."
              : `Upload ${selectedFiles.length} Document${selectedFiles.length > 1 ? "s" : ""}`}
          </Button>
        </Box>
      )}

      {/* Status Update Dialog (Admin Only) */}
      {isAdmin && (
        <Dialog
          open={statusUpdateDialog.open}
          onClose={() => setStatusUpdateDialog({ open: false, document: null })}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle sx={{ pb: 1 }}>
            <Typography variant="h6" fontWeight="bold">
              Update Document Status
            </Typography>
          </DialogTitle>
          <DialogContent>
            <Box sx={{ mb: 2 }}>
              <Typography sx={{ mb: 1 }}>
                Document:{" "}
                <strong>{statusUpdateDialog.document?.documentType}</strong>
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Current Status:
                </Typography>
                <Chip
                  icon={getStatusIcon(
                    statusUpdateDialog.document?.status || "pending"
                  )}
                  label={statusUpdateDialog.document?.status?.toUpperCase()}
                  color={getStatusColor(
                    statusUpdateDialog.document?.status || "pending"
                  )}
                  size="small"
                />
              </Box>
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 3, pt: 0 }}>
            <Button
              onClick={() =>
                setStatusUpdateDialog({ open: false, document: null })
              }
              sx={{ textTransform: "none" }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => handleStatusUpdate("pending")}
              color="warning"
              variant="outlined"
              sx={{ textTransform: "none" }}
            >
              Mark Pending
            </Button>
            <Button
              onClick={() => handleStatusUpdate("rejected")}
              color="error"
              variant="outlined"
              sx={{ textTransform: "none" }}
            >
              Reject
            </Button>
            <Button
              onClick={() => handleStatusUpdate("accepted")}
              color="success"
              variant="contained"
              sx={{ textTransform: "none" }}
            >
              Accept
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
};

export default InstructorDocumentUpdate;
