import { useState, useEffect, useRef } from "react";
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
  Select,
  MenuItem,
  FormHelperText,
  InputAdornment,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@apollo/client";
import { UPDATE_STUDENT_PROFILE } from "../../../graphql/mutations/profile";
import { toast } from "react-hot-toast";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { ApolloError } from "@apollo/client";
import axios from "axios";
import { LuMapPin } from "react-icons/lu";
import _ from "lodash";
import { EditIcon } from "lucide-react";
import { useFileUpload } from "../../../hooks/useUploadURL";
import { useAuth } from "../../../context/AuthContext";
import { GET_STUDENT_PROFILE } from "../../../graphql/mutations/studentProfile";
import { BackButton } from "../../../components/InstructorComponent/common/BackButton";
// Define the interfaces for the data
interface ProfileData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  location: string;
  fatherName: string;
  description: string;
  homeAddress: string;
  profileImage?: string;
  zipCode: string;
  dateOfBirth?: string;
  languagePreference: string[]; // Changed from string to string[]
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

export default function EditStudentProfile() {
  const navigate = useNavigate();
  const { loading, error, data } = useQuery(GET_STUDENT_PROFILE);
  const [updateProfile] = useMutation(UPDATE_STUDENT_PROFILE);
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [formData, setFormData] = useState<ProfileData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    location: "",
    fatherName: "",
    description: "",
    profileImage: "",
    homeAddress: "",
    zipCode: "",
    dateOfBirth: "",
    languagePreference: [], // Changed from empty string to empty array
  });
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const lastRequestTime = useRef(0);
  // Get today's date at the start of the day for maximum date validation
  const { uploadFile } = useFileUpload();
  const [isAvatarLoading, setIsAvatarLoading] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const { user } = useAuth();
  const abortControllerRef = useRef<AbortController | null>(null);
  // Update form data when profile data is loaded
  useEffect(() => {
    if (data?.studentProfile) {
      const profile = data.studentProfile;

      setFormData({
        firstName: profile.firstName || "",
        lastName: profile.lastName || "",
        email: profile.email || "",
        phone: profile.phone || "",
        location: profile.location || "",
        fatherName: profile.fatherName || "",
        description: profile.description || "",
        homeAddress: profile.homeAddress || "",
        zipCode: profile.zipCode || "",
        profileImage: profile.profileImage || "",
        dateOfBirth: profile.dateOfBirth || "",
        languagePreference: Array.isArray(profile.languagePreference)
          ? profile.languagePreference
          : profile.languagePreference
            ? [profile.languagePreference]
            : [],
      });

      // Only set the avatar preview if there's a profile image
      if (profile.profileImage) {
        setAvatarPreview(profile.profileImage);
        setIsImageLoading(true);

        // Check if the image is already loaded (cached)
        const img = new Image();
        img.src = profile.profileImage;
        if (img.complete) {
          setIsImageLoading(false);
        } else {
          img.onload = () => setIsImageLoading(false);
          img.onerror = () => setIsImageLoading(false);
        }
      } else {
        setAvatarPreview(null);
        setIsImageLoading(false);
      }
    }
  }, [data]);
  const handleProfileImageUpload = async (file: File) => {
    try {
      setIsAvatarLoading(true);
      const uploadResult = await uploadFile(file, user?.id, user?.role);
      if (!uploadResult.success) {
        toast.error(`Image upload failed: ${uploadResult.message}`);
        return;
      }

      // Create preview URL before updating state
      const previewUrl = URL.createObjectURL(file);
      setAvatarPreview(previewUrl);

      setFormData((prev) => ({
        ...prev,
        profileImage: uploadResult.fileUrl,
      }));

      // Set isImageLoading to true to show loading state while the new image loads
      setIsImageLoading(true);

      toast.success("Profile image updated successfully");
    } catch (err) {
      toast.error(`Error updating profile image: ${err?.message}`);
    } finally {
      setIsAvatarLoading(false);
      // isImageLoading will be set to false when the image loads or errors in the Avatar component
    }
  };
  const handleInputChange = (field: keyof ProfileData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  //   Handle date of birth change
  const handleDateOfBirthChange = (newValue: Date | null) => {
    handleInputChange("dateOfBirth", newValue ? newValue.toISOString() : "");
  };

  const fetchLocations = useRef(
    _.debounce(async (inputValue) => {
      if (!inputValue) {
        setSuggestions([]);
        return;
      }

      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;
      const requestId = Date.now();
      lastRequestTime.current = requestId;

      try {
        const response = await axios.get(
          "https://nominatim.openstreetmap.org/search",
          {
            params: {
              q: inputValue,
              format: "json",
              addressdetails: 1,
              limit: 10,
              countrycodes: "ch", // Restrict to Switzerland with country code "ch"
            },
            signal: controller.signal,
          }
        );

        // Only update if this is the latest request
        if (lastRequestTime.current === requestId) {
          // Double-check that all results are from Switzerland
          interface OpenStreetMapResult {
            address: {
              country_code?: string;
            };
          }

          const swissLocations = response.data.filter(
            (place: OpenStreetMapResult) =>
              place.address && place.address.country_code === "ch"
          );
          setSuggestions(swissLocations);
          setShowSuggestions(true);
        }
      } catch (error) {
        if (!axios.isCancel(error)) {
          console.error("Error fetching locations:", error);
          setSuggestions([]);
        }
      }
    }, 300) // 300ms debounce time
  ).current;
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
            !data?.studentProfile ||
            value !== data.studentProfile[key as keyof ProfileData]
          ) {
            acc[key as keyof ProfileData] = value;
          }
          return acc;
        },
        {} as Partial<ProfileData>
      );

      // If no fields have changed, just navigate back
      if (Object.keys(changedFields).length === 0) {
        navigate("/student-dashboard/settings");
        return;
      }

      // Call the updateProfile mutation with the changed fields
      await updateProfile({
        variables: {
          input: changedFields,
        },
        refetchQueries: [
          {
            query: GET_STUDENT_PROFILE,
          },
        ],
      });
      toast.success("Profile updated successfully");
      navigate("/student-dashboard/settings");
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
  const renderAvatar = () => {
    // During file upload processing
    if (isAvatarLoading) {
      return (
      <Box className="dsp-student-page dsp-student-profile-edit-page dsp-student-state-wrap"
        sx={{
            width: 130,
            height: 130,
            borderRadius: "50%",
            bgcolor: "var(--ws-surface-muted, #e0e0e0)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            mb: 2,
          }}
        >
          <CircularProgress size={24} />
        </Box>
      );
    }

    return (
      <Box sx={{ position: "relative" }}>
        {/* Skeleton that shows while image is loading */}
        {isImageLoading && (
          <Box
            sx={{
              position: "absolute",
              top: 0,
              left: 0,
              width: 130,
              height: 130,
              borderRadius: "50%",
              bgcolor: "var(--ws-surface-muted, #e0e0e0)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1,
              mb: 2,
            }}
          >
            <CircularProgress size={24} />
          </Box>
        )}

        {/* The actual avatar image */}
        <Avatar
          src={avatarPreview || "/default-avatar.jpg"}
          sx={{
            width: 130,
            height: 130,
            mb: 2,
            zIndex: isImageLoading ? 0 : 1,
          }}
          imgProps={{
            onLoad: () => setIsImageLoading(false),
            onError: () => {
              setIsImageLoading(false);
              // If the image fails to load, clear the preview
              if (avatarPreview) {
                setAvatarPreview(null);
              }
            },
          }}
        />
        <Box
          sx={{
            position: "relative",
            bottom: 44,
            right: "calc(50% - 168px)",
            backgroundColor: "var(--ws-surface, #ffffff)",
            borderRadius: "50%",
            width: 32,
            height: 32,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: 1,
            zIndex: 2,
          }}
        >
          <EditIcon fontSize="small" />
        </Box>
      </Box>
    );
  };
  if (loading) {
    return (
      <Box className="dsp-student-page dsp-student-profile-edit-page dsp-student-state-wrap"
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
      <Box className="dsp-student-page dsp-student-profile-edit-page" sx={{ p: 3 }}>
        <Typography color="error">Error: {error.message}</Typography>
      </Box>
    );
  }
  const handlePhoneChange = (e) => {
    let value = e.target.value.replace(/\D/g, ""); // Remove all non-numeric characters

    // Only allow 9 digits max
    if (value.length > 9) {
      value = value.slice(0, 9);
    }

    handleInputChange("phone", value); // Save only 9-digit number (e.g., 791234567)
  };
  return (
    <Box className="dsp-student-page dsp-student-profile-edit-page"
      sx={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        bgcolor: "var(--ws-surface, #f5f7fa)",
      }}
    >
      <Box>
        <BackButton variant="outline" label="Back" />
      </Box>

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
              }}
            >
              <label htmlFor="avatar-upload" style={{ cursor: "pointer" }}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleProfileImageUpload(file);
                  }}
                  id="avatar-upload"
                  hidden
                />
                {renderAvatar()}
              </label>
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  mt: -2,
                }}
              >
                <Typography
                  variant="h6"
                  color="var(--ws-ink, #000000)"
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
                color: "var(--ws-ink, #000000)",
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
                  backgroundColor: "var(--ws-surface-muted, #EEEEEE)",
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
                  disabled={!!formData.email} // <-- Disable if value exists
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
                                      color: "var(--ws-info, #2c3e50)",
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
                    disabled={!!data.studentProfile.dateOfBirth} // Disable if value exists
                    maxDate={new Date()} // Max = must be born on or before this date
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
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "row",

                    gap: 1,
                  }}
                >
                  <InputLabel
                    htmlFor="languagePreference"
                    sx={{ fontSize: "16px" }}
                  >
                    Language Preferences
                  </InputLabel>

                  <FormHelperText sx={{ mt: 0.2 }}>
                    (You can select multiple languages)
                  </FormHelperText>
                </Box>

                <Select
                  id="languagePreference"
                  fullWidth
                  multiple
                  displayEmpty
                  value={formData.languagePreference}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFormData({
                      ...formData,
                      languagePreference:
                        typeof value === "string" ? [value] : value,
                    });
                  }}
                  renderValue={(selected) => {
                    if (selected.length === 0) {
                      return <em>Select languages</em>;
                    }
                    return selected.join(", ");
                  }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      padding: 1.1,
                      borderRadius: 1.6,
                    },
                  }}
                >
                  <MenuItem value="" disabled>
                    Select languages
                  </MenuItem>
                  <MenuItem value="Français">Français (French)</MenuItem>
                  <MenuItem value="Deutsch">Deutsch (German)</MenuItem>
                  <MenuItem value="Italiano">Italiano (Italian)</MenuItem>
                  <MenuItem value="English">English</MenuItem>
                </Select>
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
                  onChange={handlePhoneChange}
                  placeholder="79 123 45 67"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">+41</InputAdornment>
                    ),
                  }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      padding: 1.1,
                      borderRadius: 1.6,
                    },
                  }}
                  fullWidth
                />
              </Grid>
              {/* <Grid
                item
                xs={12}
                sm={6}
                sx={{ display: "flex", flexDirection: "column", gap: 1 }}
              >
                <InputLabel htmlFor="fullName" sx={{ fontSize: "16px" }}>
                  Father Name
                </InputLabel>
                <TextField
                  id="fullName"
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
              </Grid> */}
            </Grid>
            <Box sx={{ display: "flex", justifyContent: "center", mt: 5 }}>
              <Button
                variant="contained"
                sx={{
                  bgcolor: "var(--ws-primary, #5ec2d2)",
                  "&:hover": { bgcolor: "var(--ws-primary, #4ba1b0)" },
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
