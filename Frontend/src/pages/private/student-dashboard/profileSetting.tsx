import React, { useState } from "react";
import {
  Box,
  Typography,
  Avatar,
  Card,
  CardContent,
  Grid,
  Button,
  Tabs,
  Tab,
  CircularProgress,
  Tooltip,
} from "@mui/material";
import { Star, Edit, EditIcon } from "lucide-react";
import { useQuery } from "@apollo/client";
import { Outlet, useNavigate, useLocation } from "react-router-dom";

import { LuMapPin } from "react-icons/lu";
import { GET_STUDENT_PROFILE } from "../../../graphql/mutations/studentProfile";
import { DocumentsTab } from "../teacher-dashboard/tabs/DocumentsTab";
// import { TariffTab } from "../student-dashboard/tabs/TariffTab";
// import { AvailabilityTab } from "../student-dashboard/tabs/AvailabilityTab";
// import { RatingsTab } from "../student-dashboard/tabs/RatingsTab";
// import { PaymentTab } from "../student-dashboard/tabs/PaymentTab";
import ComingSoonPage from "./ComingSoonPage";
import LessonBookingHistory from "./StudentBookings";
import { useAuth } from "../../../context/AuthContext";
type TabValue = "documents" | "tariff" | "availability" | "ratings" | "payment";

export default function StudentProfileSetting() {
  const [tabValue, setTabValue] = React.useState<TabValue>("documents");
  const navigate = useNavigate();
  const location = useLocation();
  const [isAvatarLoading, setIsAvatarLoading] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const { loading, error, data } = useQuery(GET_STUDENT_PROFILE);
  const { user } = useAuth();
  if (loading)
    return (
      <div className="flex items-center justify-center h-screen loading-spinner">
        {/* Spinner */}
        <div className="w-16 h-16 border-4 rounded-full border-t-transparent border-blue-600 animate-spin"></div>
      </div>
    );
  if (error)
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Error: {error.message}</Typography>
      </Box>
    );

  const studentData = data?.studentProfile;

  if (!studentData)
    return (
      <Box sx={{ p: 3 }}>
        <Typography>No profile data found</Typography>
      </Box>
    );

  interface Document {
    documentType: string;
    documentUrl: string;
  }

  interface ProfileData {
    fullName: string;

    dateOfBirth: string;
    email: string;
    location: string;
    languagePreference: string;
    phone: string;
    profileImage: string;
    fatherName: string;
    rating: number;
    introduction: string;
    documents: Document[];
  }

  const profileData: ProfileData = {
    fullName: `${studentData.firstName} ${studentData.lastName}`,
    fatherName: studentData.fatherName || "Not Provided",
    dateOfBirth: studentData.dateOfBirth
      ? new Date(studentData.dateOfBirth).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "Not Provided",
    email: studentData.email,
    location: studentData.location,
    languagePreference: studentData.languagePreference || "Not Provided",
    phone: studentData.phone,

    profileImage: studentData.profileImage,
    rating: 4, // This field isn't in your API response
    introduction: studentData.description,
    documents:
      studentData.documents.map(
        (doc: { documentType: string; documentUrl: string }) => ({
          documentType: doc.documentType,
          documentUrl: doc.documentUrl,
        })
      ) || [], // Ensure documents is an array even if empty
  };

  const handleTabChange = (
    _event: React.SyntheticEvent,
    newValue: TabValue
  ) => {
    setTabValue(newValue);
  };

  const handleEditProfile = () => {
    navigate("/student-dashboard/settings/edit-profile"); // Updated path
  };

  // Render EditProfile if the current path is /student-dashboard/settings/edit-profile
  if (location.pathname.includes("edit-profile")) {
    return <Outlet />; // Render the EditProfile component
  }
  const renderAvatar = () => {
    // During file upload processing
    if (isAvatarLoading) {
      return (
        <Box
          sx={{
            width: 130,
            height: 130,
            borderRadius: "50%",
            bgcolor: "#e0e0e0",
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
              bgcolor: "#e0e0e0",
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
          src={profileData.profileImage || "/default-avatar.jpg"}
          sx={{
            width: 130,
            height: 130,
            zIndex: isImageLoading ? 0 : 1,
          }}
          imgProps={{
            onLoad: () => setIsImageLoading(false),
            onError: () => {
              setIsImageLoading(false);
              // If the image fails to load, clear the preview
            },
          }}
        />
      </Box>
    );
  };
  return (
    <Box sx={{ p: 3, bgcolor: "#f5f7fa", minHeight: "100vh" }}>
      {/* Profile and Personal Information Section */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* My Profile Card */}
        <Grid item xs={12} md={4}>
          <Card sx={{}}>
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
            <CardContent sx={{ p: 1 }}>
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
                {renderAvatar()}
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Typography variant="h6" color="black">
                    {profileData.fullName}
                  </Typography>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 0.5,
                    }}
                  >
                    <LuMapPin color="gray" />
                    <Tooltip title={profileData.location || "Not Provided"}>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          maxWidth: 200,
                        }}
                      >
                        {(profileData.location?.length > 40
                          ? profileData.location.slice(0, 40) + "..."
                          : profileData.location) || "Not Provided"}
                      </Typography>
                    </Tooltip>
                  </Box>
                </Box>
              </Box>
              <Typography
                variant="body1"
                color="black"
                sx={{ textAlign: "center" }}
              >
                <strong>Introduction</strong>
              </Typography>
              <Typography
                variant="body2"
                sx={{ mt: 1, textAlign: "center", px: 2 }}
              >
                {profileData.introduction}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Personal Information Card */}
        <Grid item xs={12} md={8}>
          <Card sx={{ height: "100%", p: "0px !important" }}>
            <CardContent sx={{ p: "0px !important" }}>
              <Box
                sx={{
                  mb: 2,
                  pb: 1.6,
                  px: 2,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  pt: 1.3,
                  width: "100%",
                  borderBottom: 1,
                  borderBottomColor: "gray",
                }}
              >
                <Typography variant="h6">Personal Information</Typography>
                <Button
                  variant="contained"
                  startIcon={<Edit size={16} />}
                  sx={{ bgcolor: "#5ec2d2", "&:hover": { bgcolor: "#4ba1b0" } }}
                  onClick={handleEditProfile} // Navigate to EditProfile page
                >
                  Edit Profile
                </Button>
              </Box>

              <Grid container spacing={4} sx={{ p: 2 }}>
                <Grid item xs={6} spacing={5}>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 0.6 }}
                  >
                    Full Name
                  </Typography>
                  <Typography
                    variant="body1"
                    color="black"
                    sx={{ fontSize: "18px" }}
                  >
                    {profileData.fullName || "Not Provided"}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 0.6 }}
                  >
                    Location
                  </Typography>
                  <Tooltip title={profileData.location || "Not Provided"}>
                    <Typography
                      variant="body1"
                      color="black"
                      sx={{
                        fontSize: "18px",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        maxWidth: 300,
                      }}
                    >
                      {(profileData.location?.length > 40
                        ? profileData.location.slice(0, 40) + "..."
                        : profileData.location) || "Not Provided"}
                    </Typography>
                  </Tooltip>
                </Grid>

                <Grid item xs={6}>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 0.6 }}
                  >
                    Language Preferences
                  </Typography>
                  <Typography
                    variant="body1"
                    color="black"
                    sx={{ fontSize: "18px" }}
                  >
                    {Array.isArray(profileData.languagePreference) &&
                    profileData.languagePreference.length > 0
                      ? profileData.languagePreference.join(", ")
                      : "Not provided"}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 0.6 }}
                  >
                    Date of Birth
                  </Typography>
                  <Typography
                    variant="body1"
                    color="black"
                    sx={{ fontSize: "18px" }}
                  >
                    {profileData.dateOfBirth || "Not Provided"}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 0.6 }}
                  >
                    Phone Number
                  </Typography>
                  <Typography
                    variant="body1"
                    color="black"
                    sx={{ fontSize: "18px" }}
                  >
                    +41 {profileData.phone || "Not Provided"}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 0.6 }}
                  >
                    Email Address
                  </Typography>
                  <Typography
                    variant="body1"
                    color="black"
                    sx={{ fontSize: "18px" }}
                  >
                    {profileData.email || "Not Provided"}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 0.6 }}
                  >
                    fatherName
                  </Typography>
                  <Typography
                    variant="body1"
                    color="black"
                    sx={{ fontSize: "18px" }}
                  >
                    {profileData.fatherName || "Not Provided"}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      {user?.id && <LessonBookingHistory studentId={user.id} />}
      {/* Tabs Section */}
      {/* <Tabs
        value={tabValue}
        onChange={handleTabChange}
        sx={{ mb: 3 }}
        variant="scrollable"
        scrollButtons="auto"
      >
        <Tab value="documents" label="Documents" />
        <Tab value="tariff" label="Tariff Management" />
        <Tab value="availability" label="Availability & Calendar" />
        <Tab value="ratings" label="Ratings & Scores" />
        <Tab value="payment" label="Payment Management" />
      </Tabs> */}

      {/* Tab Content */}
      {/* {tabValue === "documents" && (
        <DocumentsTab documents={profileData.documents} />
      )}
      {tabValue === "tariff" && <ComingSoonPage />}
      {tabValue === "availability" && <ComingSoonPage />}
      {tabValue === "ratings" && <ComingSoonPage />}
      {tabValue === "payment" && <ComingSoonPage />} */}
    </Box>
  );
}
