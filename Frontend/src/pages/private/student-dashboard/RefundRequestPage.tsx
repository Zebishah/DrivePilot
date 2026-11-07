import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import { useLocation, useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@apollo/client";
import { REQUEST_REFUND, GET_MY_REFUND_REQUESTS } from "../../../graphql/mutations/refundRequest";
import { useFileUpload } from "../../../hooks/useUploadURL";
import { useAuth } from "../../../context/AuthContext";
import toast from "react-hot-toast";

type RefundAttachmentInput = {
  url: string;
  fileName: string;
  mimeType: string;
};

const ACCEPTED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "application/rtf",
  "application/vnd.oasis.opendocument.text",
];

export default function RefundRequestPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { uploadFile, isUploading } = useFileUpload();
  const [message, setMessage] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileInputKey, setFileInputKey] = useState(0);

  const bookingId = location.state?.bookingId as string | undefined;
  const slotId = location.state?.slotId as string | undefined;
  const slotDate = location.state?.slot?.date as string | undefined;
  const slotStart = location.state?.slot?.startTime as string | undefined;
  const slotEnd = location.state?.slot?.endTime as string | undefined;

  const { data: myRefundData } = useQuery(GET_MY_REFUND_REQUESTS, {
    fetchPolicy: "network-only",
  });
  const existingStatus = useMemo(() => {
    const all = myRefundData?.getMyRefundRequests ?? [];
    const found = all.find(
      (r: { bookingId: string; slotId: string; status: string }) =>
        bookingId && slotId && r.bookingId === bookingId && r.slotId === slotId,
    );
    return found?.status as "pending" | "processing" | "approved" | "rejected" | undefined;
  }, [myRefundData, bookingId, slotId]);
  const filePreviews = useMemo(
    () =>
      selectedFiles.map((file) => ({
        file,
        isImage: String(file.type || "").startsWith("image/"),
        previewUrl: URL.createObjectURL(file),
      })),
    [selectedFiles],
  );
  useEffect(() => {
    return () => {
      filePreviews.forEach((entry) => URL.revokeObjectURL(entry.previewUrl));
    };
  }, [filePreviews]);

  const [requestRefund, { loading: requestLoading }] = useMutation(REQUEST_REFUND, {
    onCompleted: () => {
      toast.success("Refund request submitted.");
      navigate("/student-dashboard/book");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to submit refund request.");
    },
  });

  if (!bookingId || !slotId) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          Refund request context is missing. Please open this from your cancelled lesson list.
        </Alert>
        <Button variant="contained" onClick={() => navigate("/student-dashboard/book")}>
          Back to Booked Lessons
        </Button>
      </Box>
    );
  }

  const submitDisabled =
    requestLoading ||
    isUploading ||
    !message.trim() ||
    Boolean(existingStatus);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const incoming = Array.from(files);
    const invalid = incoming.filter((f) => {
      if (String(f.type || "").startsWith("image/")) return false;
      return !ACCEPTED_MIME_TYPES.includes(f.type);
    });
    if (invalid.length > 0) {
      toast.error("Unsupported file detected. Allowed: images and common document formats.");
      return;
    }
    setSelectedFiles((prev) => {
      const merged = [...prev];
      for (const f of incoming) {
        const exists = merged.some(
          (e) =>
            e.name === f.name &&
            e.size === f.size &&
            e.lastModified === f.lastModified,
        );
        if (!exists) merged.push(f);
      }
      return merged;
    });
  };

  const removeFileAt = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const clearAllFiles = () => {
    setSelectedFiles([]);
    setFileInputKey((k) => k + 1);
  };

  const handleSubmit = async () => {
    if (!message.trim()) return;
    if (existingStatus) return;

    const attachments: RefundAttachmentInput[] = [];
    for (const file of selectedFiles) {
      const uploaded = await uploadFile(file, user?.id, user?.role);
      if (!uploaded.success || !uploaded.fileUrl) {
        toast.error(uploaded.message || "Failed to upload attachment.");
        return;
      }
      attachments.push({
        url: uploaded.fileUrl,
        fileName: file.name,
        mimeType: file.type,
      });
    }

    requestRefund({
      variables: {
        bookingId,
        slotId,
        message: message.trim(),
        attachments,
      },
    });
  };

  return (
    <Box sx={{ p: 3 }}>
      <Card>
        <CardContent>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
            Request Refund
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Lesson: {slotDate ?? "—"} {slotStart ?? ""} {slotStart || slotEnd ? "-" : ""}{" "}
            {slotEnd ?? ""}
          </Typography>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Refund requests must be submitted directly through this platform. Requests made outside
            the platform may not be processed. If you do not submit a refund request, you may lose
            your payment.
          </Alert>

          {existingStatus && (
            <Alert severity="info" sx={{ mb: 2 }}>
              A refund request for this lesson is already {existingStatus}. You cannot submit
              another request.
            </Alert>
          )}

          <Stack spacing={2}>
            <TextField
              label="Message to Drive Pilot Support"
              multiline
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              helperText="Please explain the reason for your refund request."
            />
            <Button variant="outlined" component="label">
              Upload Supporting Documents
              <input
                key={fileInputKey}
                type="file"
                hidden
                multiple
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.rtf,.odt,image/*"
                onChange={(e) => handleFiles(e.target.files)}
              />
            </Button>
            {selectedFiles.length > 0 && (
              <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1.5, p: 1.5 }}>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{ mb: 1 }}
                >
                  <Typography variant="body2" color="text.secondary">
                    Selected files ({selectedFiles.length})
                  </Typography>
                  <Button
                    size="small"
                    color="error"
                    onClick={clearAllFiles}
                    sx={{ textTransform: "none" }}
                  >
                    Clear all
                  </Button>
                </Stack>
                <Stack spacing={1.25}>
                  {filePreviews.map(({ file, isImage, previewUrl }, idx) => {
                    return (
                      <Stack
                        key={`${file.name}-${file.size}-${file.lastModified}`}
                        direction="row"
                        alignItems="center"
                        spacing={1.25}
                        sx={{
                          p: 1,
                          border: "1px solid",
                          borderColor: "divider",
                          borderRadius: 1,
                        }}
                      >
                        {isImage ? (
                          <Box
                            component="img"
                            src={previewUrl}
                            alt={file.name}
                            sx={{ width: 42, height: 42, objectFit: "cover", borderRadius: 1 }}
                          />
                        ) : (
                          <Box sx={{ width: 42, height: 42, display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "grey.100", borderRadius: 1 }}>
                            <InsertDriveFileOutlinedIcon fontSize="small" />
                          </Box>
                        )}
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" noWrap title={file.name}>
                            {file.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {(file.size / 1024).toFixed(1)} KB
                          </Typography>
                        </Box>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => removeFileAt(idx)}
                          aria-label={`remove-${file.name}`}
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    );
                  })}
                </Stack>
              </Box>
            )}

            <Stack direction="row" spacing={2}>
              <Button variant="outlined" onClick={() => navigate("/student-dashboard/book")}>
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={submitDisabled}
              >
                {requestLoading || isUploading ? (
                  <>
                    <CircularProgress size={18} sx={{ mr: 1, color: "inherit" }} />
                    Submitting...
                  </>
                ) : (
                  "Submit Refund Request"
                )}
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
