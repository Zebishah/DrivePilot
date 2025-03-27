import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Avatar,
  Card,
  CardContent,
  Grid,
  TextField,
  Button,
  CircularProgress,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Paper,
  ClickAwayListener,
  InputLabel,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@apollo/client";
import {
  GET_TEACHER_PROFILE,
  UPDATE_TEACHER_PROFILE,
} from "../../../graphql/mutations/profile";
import { toast } from "react-hot-toast";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { startOfDay } from "date-fns";
import { ApolloError } from "@apollo/client";
import axios from "axios";
import { LuMapPin } from "react-icons/lu";
// Define the interfaces for the data
interface ProfileData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  location: string;
  experience: string;
  description: string;
  address: string;
  zipCode: string;
  fatherName?: string;
  dateOfBirth?: string;
  languagePreference?: string;
}

interface LocationSuggestion {
  display_name: string;
  address: {
    road?: string;
    city?: string;
    state?: string;
    country?: string;
  };
}

export default function EditProfile() {
  const navigate = useNavigate();
  const { loading, error, data } = useQuery(GET_TEACHER_PROFILE);
  const [updateProfile] = useMutation(UPDATE_TEACHER_PROFILE);
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [formData, setFormData] = useState<ProfileData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    location: "",
    experience: "",
    description: "",
    address: "",
    zipCode: "",
    fatherName: "",
    dateOfBirth: "",
    languagePreference: "",
  });

  // Get today's date at the start of the day for maximum date validation
  const today = startOfDay(new Date());

  // Update form data when profile data is loaded
  useEffect(() => {
    if (data?.teacherProfile) {
      const profile = data.teacherProfile;
      setFormData({
        firstName: profile.firstName || "",
        lastName: profile.lastName || "",
        email: profile.email || "",
        phone: profile.phone || "",
        location: profile.location || "",
        experience: profile.experience || "",
        description: profile.description || "",
        address: profile.address || "",
        zipCode: profile.zipCode || "",
        fatherName: profile.fatherName || "",
        dateOfBirth: profile.dateOfBirth || "",
        languagePreference: profile.languagePreference || "",
      });
    }
  }, [data]);

  const handleInputChange = (field: keyof ProfileData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Handle date of birth change
  const handleDateOfBirthChange = (newValue: Date | null) => {
    handleInputChange("dateOfBirth", newValue ? newValue.toISOString() : "");
  };

  const fetchLocations = async (inputValue: string) => {
    if (!inputValue) {
      setSuggestions([]);
      return;
    }
    try {
      const response = await axios.get(
        `https://nominatim.openstreetmap.org/search`,
        {
          params: {
            q: inputValue,
            format: "json",
            addressdetails: 1,
            limit: 5,
          },
        }
      );
      setSuggestions(response.data);
      setShowSuggestions(true);
    } catch (error) {
      console.error("Error fetching locations:", error);
      setSuggestions([]);
    }
  };

  const handleLocationChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    handleInputChange("location", value);
    fetchLocations(value);
  };

  const handleSelectSuggestion = (suggestion: LocationSuggestion) => {
    handleInputChange("location", suggestion.display_name);
    setShowSuggestions(false);
  };

  const handleSaveChanges = async () => {
    try {
      // Only include fields that have changed
      const changedFields = Object.entries(formData).reduce(
        (acc, [key, value]) => {
          if (
            !data?.teacherProfile ||
            value !== data.teacherProfile[key as keyof ProfileData]
          ) {
            acc[key as keyof ProfileData] = value;
          }
          return acc;
        },
        {} as Partial<ProfileData>
      );

      // If no fields have changed, just navigate back
      if (Object.keys(changedFields).length === 0) {
        navigate("/teacher-dashboard/settings");
        return;
      }

      // Call the updateProfile mutation with the changed fields
      await updateProfile({
        variables: {
          input: changedFields,
        },
      });

      toast.success("Profile updated successfully");
      navigate("/teacher-dashboard/settings");
    } catch (error) {
      console.error("Error updating profile:", error);
      if (error instanceof ApolloError) {
        if (error.graphQLErrors) {
          console.error("GraphQL Errors:", error.graphQLErrors);
        }
        if (error.networkError) {
          console.error("Network Error:", error.networkError);
        }
      }
      toast.error("Failed to update profile");
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error">Error: {error.message}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "#f5f7fa" }}>
      {/* Main Content */}
      <Box sx={{ flex: 1, p: 3 }}>
        {/* My Profile Card */}
        <Card sx={{ mb: 3 }}>
          <Box
            sx={{
              mb: 2,
              pb: 2,
              px: 2,
              pt: 1.5,
              width: "100%",
              borderBottom: 1,
              borderBottomColor: "gray",
            }}
          >
            <Typography variant="h6">My Profile</Typography>
          </Box>
          <CardContent>
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 2,
                mb: 2,
              }}
            >
              <Avatar
                src="path/to/profile-image.jpg"
                sx={{ width: 130, height: 130 }}
              />
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Typography
                  variant="h6"
                  color="black"
                >{`${formData.firstName} ${formData.lastName}`}</Typography>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 0.5,
                  }}
                >
                  <LuMapPin color="gray" />{" "}
                  <Typography variant="body2" color="text.secondary">
                    {formData.location}
                  </Typography>
                </Box>
              </Box>
            </Box>
            <InputLabel
              htmlFor="introduction"
              sx={{
                mb: 1,
                fontSize: "18px",
                textAlign: "center",
                fontWeight: "bold",
                color: "black",
              }}
            >
              Introduction
            </InputLabel>
            <Box sx={{ display: "flex", justifyContent: "center" }}>
              {" "}
              <TextField
                id="introduction"
                value={formData.description}
                onChange={(e) =>
                  handleInputChange("description", e.target.value)
                }
                fullWidth
                multiline
                sx={{
                  mb: 2,
                  width: "50%",

                  p: "0px !important",
                  backgroundColor: "#EEEEEE",
                }}
              />
            </Box>
          </CardContent>
        </Card>

        {/* Personal Information Card */}
        <Card sx={{ px: 0 }}>
          <CardContent sx={{ mt: -1, px: 0 }}>
            <Box
              sx={{
                mb: 2,
                pb: 2,
                px: 2,
                pt: 1.5,
                width: "100%",
                borderBottom: 1,
                borderBottomColor: "gray",
              }}
            >
              <Typography variant="h6">Personal Information</Typography>
            </Box>

            <Grid container spacing={2} sx={{ px: 2.2, pt: 2 }}>
              <Grid
                item
                xs={12}
                sm={6}
                sx={{ display: "flex", flexDirection: "column", gap: 1 }}
              >
                <InputLabel htmlFor="fullName" sx={{ fontSize: "16px" }}>
                  Full Name
                </InputLabel>
                <TextField
                  id="fullName"
                  value={`${formData.firstName} ${formData.lastName}`}
                  onChange={(e) => {
                    const [first, ...last] = e.target.value.split(" ");
                    setFormData((prev) => ({
                      ...prev,
                      firstName: first || "",
                      lastName: last.join(" ") || "",
                    }));
                  }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      padding: 1.1, // Adjust this value as needed (1 = 8px)
                      borderRadius: 1.6,
                    },
                  }}
                  fullWidth
                />
              </Grid>
              <Grid
                item
                xs={12}
                sm={6}
                sx={{ display: "flex", flexDirection: "column", gap: 1 }}
              >
                <InputLabel htmlFor="emailAddress" sx={{ fontSize: "16px" }}>
                  Email Address
                </InputLabel>
                <TextField
                  id="emailAddress"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      padding: 1.1, // Adjust this value as needed (1 = 8px)
                      borderRadius: 1.6,
                    },
                  }}
                  fullWidth
                />
              </Grid>
              <Grid
                item
                xs={12}
                sm={6}
                sx={{ display: "flex", flexDirection: "column", gap: 1 }}
              >
                <InputLabel htmlFor="fatherName" sx={{ fontSize: "16px" }}>
                  Father Name
                </InputLabel>
                <TextField
                  id="fatherName"
                  value={formData.fatherName}
                  onChange={(e) =>
                    handleInputChange("fatherName", e.target.value)
                  }
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      padding: 1.1, // Adjust this value as needed (1 = 8px)
                      borderRadius: 1.6,
                    },
                  }}
                  fullWidth
                />
              </Grid>
              <Grid
                item
                xs={12}
                sm={6}
                sx={{ display: "flex", flexDirection: "column", gap: 1 }}
              >
                <InputLabel htmlFor="Location" sx={{ fontSize: "16px" }}>
                  Location
                </InputLabel>
                <Box sx={{ position: "relative" }}>
                  <TextField
                    id="Location"
                    value={formData.location}
                    onChange={handleLocationChange}
                    fullWidth
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        padding: 1.1, // Adjust this value as needed (1 = 8px)
                        borderRadius: 1.6,
                      },
                    }}
                  />
                  {showSuggestions && suggestions.length > 0 && (
                    <ClickAwayListener
                      onClickAway={() => setShowSuggestions(false)}
                    >
                      <Paper
                        sx={{
                          position: "absolute",
                          top: "100%",
                          left: 0,
                          right: 0,
                          zIndex: 1000,
                          mt: 1,
                          maxHeight: "200px",
                          overflow: "auto",
                          borderRadius: 2,
                          boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                        }}
                      >
                        <List>
                          {suggestions.map((suggestion, index) => (
                            <ListItem key={index} disablePadding>
                              <ListItemButton
                                onClick={() =>
                                  handleSelectSuggestion(suggestion)
                                }
                                sx={{
                                  "&:hover": {
                                    backgroundColor: "rgba(94, 194, 210, 0.08)",
                                  },
                                }}
                              >
                                <ListItemText
                                  primary={suggestion.display_name}
                                  sx={{
                                    "& .MuiTypography-root": {
                                      fontSize: "0.875rem",
                                      color: "#2c3e50",
                                    },
                                  }}
                                />
                              </ListItemButton>
                            </ListItem>
                          ))}
                        </List>
                      </Paper>
                    </ClickAwayListener>
                  )}
                </Box>
              </Grid>
              <Grid
                item
                xs={12}
                sm={6}
                sx={{ display: "flex", flexDirection: "column", gap: 1 }}
              >
                <InputLabel sx={{ fontSize: "16px" }}>Date of Birth</InputLabel>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker
                    value={
                      formData.dateOfBirth
                        ? new Date(formData.dateOfBirth)
                        : null
                    }
                    onChange={handleDateOfBirthChange}
                    maxDate={today}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                      },
                    }}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        padding: 1.1, // Adjust this value as needed (1 = 8px)
                        borderRadius: 1.6,
                      },
                    }}
                  />
                </LocalizationProvider>
              </Grid>
              <Grid
                item
                xs={12}
                sm={6}
                sx={{ display: "flex", flexDirection: "column", gap: 1 }}
              >
                <InputLabel htmlFor="language" sx={{ fontSize: "16px" }}>
                  Language Preference
                </InputLabel>
                <TextField
                  id="language"
                  value={formData.languagePreference}
                  onChange={(e) =>
                    handleInputChange("languagePreference", e.target.value)
                  }
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      padding: 1.1, // Adjust this value as needed (1 = 8px)
                      borderRadius: 1.6,
                    },
                  }}
                  fullWidth
                />
              </Grid>
              <Grid
                item
                xs={12}
                sm={6}
                sx={{ display: "flex", flexDirection: "column", gap: 1 }}
              >
                <InputLabel htmlFor="PhoneNumber" sx={{ fontSize: "16px" }}>
                  Phone Number
                </InputLabel>
                <TextField
                  id="PhoneNumber"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      padding: 1.1, // Adjust this value as needed (1 = 8px)
                      borderRadius: 1.6,
                    },
                  }}
                  fullWidth
                />
              </Grid>
              <Grid
                item
                xs={12}
                sm={6}
                sx={{ display: "flex", flexDirection: "column", gap: 1 }}
              >
                <InputLabel htmlFor="Experience" sx={{ fontSize: "16px" }}>
                  Experience
                </InputLabel>
                <TextField
                  id="Experience"
                  value={formData.experience}
                  onChange={(e) =>
                    handleInputChange("experience", e.target.value)
                  }
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      padding: 1.1, // Adjust this value as needed (1 = 8px)
                      borderRadius: 1.6,
                    },
                  }}
                  fullWidth
                />
              </Grid>
            </Grid>
            <Box sx={{ display: "flex", justifyContent: "center", mt: 5 }}>
              <Button
                variant="contained"
                sx={{
                  bgcolor: "#5ec2d2",
                  "&:hover": { bgcolor: "#4ba1b0" },
                  paddingX: 4,
                  borderRadius: "8px",
                  py: 1,
                }}
                onClick={handleSaveChanges}
              >
                Save Changes
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
