// components/ContactModal.tsx

import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  IconButton,
  Alert,
  CircularProgress,
} from "@mui/material";
import { Close as CloseIcon, Send as SendIcon } from "@mui/icons-material";
import { useMutation } from "@apollo/client";

import { ContactFormData, ContactModalProps } from "../../types/Faq";
import {
  SendContactEmailMutation,
  SendContactEmailVariables,
} from "../../types/AdminContact";
import { SEND_CONTACT_EMAIL } from "../../graphql/mutations/AdminContact";

const ContactModal: React.FC<ContactModalProps> = ({ open, onClose }) => {
  const [formData, setFormData] = useState<ContactFormData>({
    name: "",
    email: "",
    description: "",
  });

  const [errors, setErrors] = useState<Partial<ContactFormData>>({});
  const [alertMessage, setAlertMessage] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const [sendContactEmail, { loading }] = useMutation<
    SendContactEmailMutation,
    SendContactEmailVariables
  >(SEND_CONTACT_EMAIL, {
    onCompleted: (data) => {
      if (data.sendContactEmail.success) {
        setAlertMessage({
          type: "success",
          message: data.sendContactEmail.message,
        });
        setFormData({ name: "", email: "", description: "" });
        setErrors({});

        // Close modal after 2 seconds on success
        setTimeout(() => {
          handleClose();
        }, 2000);
      } else {
        setAlertMessage({
          type: "error",
          message: data.sendContactEmail.message,
        });
      }
    },
    onError: (error) => {
      console.error("GraphQL Error:", error);
      setAlertMessage({
        type: "error",
        message:
          error.message ||
          "An error occurred while sending your message. Please try again later.",
      });
    },
  });

  const handleChange =
    (field: keyof ContactFormData) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setFormData({ ...formData, [field]: event.target.value });
      if (errors[field]) {
        setErrors({ ...errors, [field]: "" });
      }
      // Clear alert when user starts typing
      if (alertMessage) {
        setAlertMessage(null);
      }
    };

  const validateForm = (): boolean => {
    const newErrors: Partial<ContactFormData> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email is invalid";
    }

    if (!formData.description.trim()) {
      newErrors.description = "Description is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (validateForm()) {
      try {
        await sendContactEmail({
          variables: {
            input: {
              name: formData.name.trim(),
              email: formData.email.trim(),
              description: formData.description.trim(),
            },
          },
        });
      } catch (error) {
        // Error handling is done in the onError callback
        console.error("Submit error:", error);
      }
    }
  };

  const handleClose = () => {
    setFormData({ name: "", email: "", description: "" });
    setErrors({});
    setAlertMessage(null);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          p: 2,
        },
      }}
    >
      <DialogTitle sx={{ textAlign: "center", pb: 1 }}>
        <Typography variant="h5" component="h2" fontWeight="bold">
          Need more Help?
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Please Contact Us.
        </Typography>
        <IconButton
          aria-label="close"
          onClick={handleClose}
          sx={{
            position: "absolute",
            right: 8,
            top: 8,
          }}
          disabled={loading}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        {alertMessage && (
          <Alert
            severity={alertMessage.type}
            sx={{ mb: 2 }}
            onClose={() => setAlertMessage(null)}
          >
            {alertMessage.message}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} noValidate>
          <TextField
            fullWidth
            label="Name"
            variant="outlined"
            value={formData.name}
            onChange={handleChange("name")}
            error={!!errors.name}
            helperText={errors.name}
            disabled={loading}
            sx={{
              mb: 2,
              borderRadius: 1,
              "& .MuiInputBase-root": {
                padding: "12px",
              },
            }}
          />

          <TextField
            fullWidth
            label="Email Address"
            type="email"
            variant="outlined"
            value={formData.email}
            onChange={handleChange("email")}
            error={!!errors.email}
            helperText={errors.email}
            disabled={loading}
            sx={{
              mb: 2,
              borderRadius: 1,
              "& .MuiInputBase-root": {
                padding: "12px",
              },
            }}
          />

          <TextField
            fullWidth
            label="Description"
            multiline
            rows={4}
            variant="outlined"
            value={formData.description}
            onChange={handleChange("description")}
            error={!!errors.description}
            helperText={errors.description}
            disabled={loading}
            sx={{ mb: 2 }}
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          fullWidth
          variant="contained"
          onClick={handleSubmit}
          size="large"
          disabled={loading}
          startIcon={
            loading ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              <SendIcon />
            )
          }
          sx={{
            bgcolor: "#4DD0E1",
            "&:hover": {
              bgcolor: "#26C6DA",
            },
            "&:disabled": {
              bgcolor: "#B0BEC5",
            },
            py: 1.5,
            borderRadius: 1,
          }}
        >
          {loading ? "Sending..." : "Send"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ContactModal;
