// components/ContactDetails.tsx
import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Alert,
  CircularProgress,
} from "@mui/material";
import { useQuery, useMutation } from "@apollo/client";
import {
  CREATE_CONTACT_DETAIL,
  UPDATE_CONTACT_DETAIL,
} from "../../graphql/mutations/AdminContact";
import { GET_MY_CONTACT_DETAIL } from "../../graphql/Queries/AdminContact";
import { ContactDetail } from "../../types/AdminContact";

const ContactDetails: React.FC = () => {
  const [email, setEmail] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const { data, loading, error, refetch } = useQuery(GET_MY_CONTACT_DETAIL, {
    fetchPolicy: "cache-and-network",
  });

  const [createContactDetail, { loading: createLoading }] = useMutation(
    CREATE_CONTACT_DETAIL,
    {
      onCompleted: (data) => {
        setEmail(data.createContactDetail.supportEmail);
        setIsEditing(false);
        refetch();
      },
      onError: (error) => {
        console.error("Error creating contact detail:", error);
      },
    }
  );

  const [updateContactDetail, { loading: updateLoading }] = useMutation(
    UPDATE_CONTACT_DETAIL,
    {
      onCompleted: (data) => {
        setEmail(data.updateContactDetail.supportEmail);
        setIsEditing(false);
        refetch();
      },
      onError: (error) => {
        console.error("Error updating contact detail:", error);
      },
    }
  );

  useEffect(() => {
    if (data?.getMyContactDetail) {
      const contactDetail: ContactDetail = data.getMyContactDetail;
      setEmail(contactDetail.supportEmail);
    }
  }, [data]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    try {
      const existingContact = data?.getMyContactDetail;

      if (existingContact) {
        // Update existing contact detail
        await updateContactDetail({
          variables: {
            id: existingContact._id,
            supportEmail: email.trim(),
          },
        });
      } else {
        // Create new contact detail
        await createContactDetail({
          variables: {
            supportEmail: email.trim(),
          },
        });
      }
    } catch (error) {
      console.error("Error submitting contact detail:", error);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    if (data?.getMyContactDetail) {
      setEmail(data.getMyContactDetail.supportEmail);
    } else {
      setEmail("");
    }
    setIsEditing(false);
  };

  const isSubmitting = createLoading || updateLoading;
  const existingContact = data?.getMyContactDetail;
  const showForm = isEditing || !existingContact;

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        Error loading contact details: {error.message}
      </Alert>
    );
  }

  return (
    <Box>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
          Contact Details
        </Typography>

        <Alert severity="info" sx={{ mb: 3 }}>
          This is the email where students and instructors will send their help
          queries.
        </Alert>

        {!showForm && existingContact ? (
          <Box>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Support Email:
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                {existingContact.supportEmail}
              </Typography>
            </Box>
            <Button
              variant="outlined"
              onClick={handleEdit}
              sx={{ textTransform: "none" }}
            >
              Update Email
            </Button>
          </Box>
        ) : (
          <form onSubmit={handleSubmit}>
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 2,
                px: 1,
                py: 2,
              }}
            >
              <TextField
                label="Support Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                fullWidth
                required
                placeholder="Enter support email address"
                disabled={isSubmitting}
                sx={{
                  backgroundColor: "#f9f9f9",
                  borderRadius: 1,
                  "& .MuiInputBase-root": {
                    padding: "12px",
                  },
                }}
              />
              <Box sx={{ display: "flex", gap: 2 }}>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={isSubmitting || !email.trim()}
                  startIcon={
                    isSubmitting ? <CircularProgress size={16} /> : null
                  }
                  sx={{ textTransform: "none" }}
                >
                  {isSubmitting
                    ? existingContact
                      ? "Updating..."
                      : "Saving..."
                    : existingContact
                      ? "Update"
                      : "Submit"}
                </Button>
                {existingContact && (
                  <Button
                    variant="outlined"
                    onClick={handleCancel}
                    disabled={isSubmitting}
                    sx={{ textTransform: "none" }}
                  >
                    Cancel
                  </Button>
                )}
              </Box>
            </Box>
          </form>
        )}
      </Paper>
    </Box>
  );
};

export default ContactDetails;
