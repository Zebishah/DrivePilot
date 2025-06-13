// components/ContactForm.tsx

import React, { useState } from "react";
import { TextField, Button, Box, Alert, CircularProgress } from "@mui/material";
import { Send as SendIcon } from "@mui/icons-material";
import { useMutation } from "@apollo/client";

import { ContactFormData } from "../../../types/Faq";
import {
  SendContactEmailMutation,
  SendContactEmailVariables,
} from "../../../types/AdminContact";
import { SEND_CONTACT_EMAIL } from "../../../graphql/mutations/AdminContact";

interface ContactFormProps {
  onSubmit?: (formData: ContactFormData) => void;
}

const ContactForm: React.FC<ContactFormProps> = ({ onSubmit }) => {
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

        // Call onSubmit if provided
        if (onSubmit) {
          onSubmit(formData);
        }

        // Clear success message after 5 seconds
        setTimeout(() => {
          setAlertMessage(null);
        }, 5000);
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

  return (
    <Box>
      {alertMessage && (
        <Alert
          severity={alertMessage.type}
          sx={{ mb: 3 }}
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
            mb: 3,
            "& .MuiOutlinedInput-root": {
              borderRadius: 2,
              "&:hover .MuiOutlinedInput-notchedOutline": {
                borderColor: "#4db6ac",
              },
              "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                borderColor: "#4db6ac",
              },
              "& .MuiOutlinedInput-input": {
                padding: "14px 16px !important",
                fontSize: "1rem",
              },
            },
            "& .MuiInputLabel-root": {
              fontSize: "1rem",
              "&.Mui-focused": {
                color: "#4db6ac",
              },
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
            mb: 3,
            "& .MuiOutlinedInput-root": {
              borderRadius: 2,
              "&:hover .MuiOutlinedInput-notchedOutline": {
                borderColor: "#4db6ac",
              },
              "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                borderColor: "#4db6ac",
              },
              "& .MuiOutlinedInput-input": {
                padding: "14px 16px !important",
                fontSize: "1rem",
              },
            },
            "& .MuiInputLabel-root": {
              fontSize: "1rem",
              "&.Mui-focused": {
                color: "#4db6ac",
              },
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
          sx={{
            mb: 3,
            "& .MuiOutlinedInput-root": {
              borderRadius: 2,
              "&:hover .MuiOutlinedInput-notchedOutline": {
                borderColor: "#4db6ac",
              },
              "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                borderColor: "#4db6ac",
              },
            },
            "& .MuiInputLabel-root.Mui-focused": {
              color: "#4db6ac",
            },
          }}
        />

        <Button
          fullWidth
          variant="contained"
          type="submit"
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
            backgroundColor: "#4db6ac",
            "&:hover": {
              backgroundColor: "#26a69a",
            },
            "&:disabled": {
              backgroundColor: "#B0BEC5",
            },
            py: 1.5,
            borderRadius: 2,
            textTransform: "none",
            fontWeight: 500,
            fontSize: "1rem",
          }}
        >
          {loading ? "Sending..." : "Send Message"}
        </Button>
      </Box>
    </Box>
  );
};

export default ContactForm;
