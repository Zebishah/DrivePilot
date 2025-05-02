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
} from "@mui/material";
import { Star, Edit, EditIcon } from "lucide-react";
import { useQuery } from "@apollo/client";
import { GET_TEACHER_PROFILE } from "../../../graphql/mutations/profile";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { DocumentsTab } from "./tabs/DocumentsTab";
import { TariffTab } from "./tabs/TariffTab";
import { AvailabilityTab } from "./tabs/AvailabilityTab";
import { RatingsTab } from "./tabs/RatingsTab";
import { PaymentTab } from "./tabs/PaymentTab";
import { LuMapPin } from "react-icons/lu";
type TabValue = "documents" | "tariff" | "availability" | "ratings" | "payment";

export default function ProfileSetting() {
  const [tabValue, setTabValue] = React.useState<TabValue>("documents");
  const navigate = useNavigate();
  const location = useLocation();
  const [isAvatarLoading, setIsAvatarLoading] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const { loading, error, data } = useQuery(GET_TEACHER_PROFILE);

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

  const teacherData = data?.teacherProfile;
  if (!teacherData)
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
    fatherName: string;
    dateOfBirth: string;
    email: string;
    location: string;
    languagePreference: string;
    phone: string;
    profileImage: string;
    experience: string;
    rating: number;
    introduction: string;
    documents: Document[];
  }

  const profileData: ProfileData = {
    fullName: `${teacherData.firstName} ${teacherData.lastName}`,
    fatherName: teacherData.fatherName || "Not Provided",
    dateOfBirth: teacherData.dateOfBirth
      ? new Date(teacherData.dateOfBirth).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "Not Provided",
    email: teacherData.email,
    location: teacherData.location,
    languagePreference: teacherData.languagePreference || "Not Provided",
    phone: teacherData.phone,
    experience: teacherData.experience,
    profileImage: teacherData.profileImage,
    rating: 4, // This field isn't in your API response
    introduction: teacherData.description,
    documents:
      teacherData.documents.map(
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
    navigate("/teacher-dashboard/settings/edit-profile"); // Updated path
  };

  // Render EditProfile if the current path is /teacher-dashboard/settings/edit-profile
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
                    <LuMapPin color="gray" />{" "}
                    <Typography variant="body2" color="text.secondary">
                      {profileData.location}
                    </Typography>
                  </Box>

                  <Box sx={{ display: "flex", gap: 0.5, mt: 1 }}>
                    {[...Array(5)].map((_, index) => (
                      <Star
                        key={index}
                        size={20}
                        fill={index < profileData.rating ? "#FFD700" : "none"}
                        stroke={index < profileData.rating ? "#FFD700" : "#ccc"}
                      />
                    ))}
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
                    {profileData.fullName}
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
                  <Typography
                    variant="body1"
                    color="black"
                    sx={{ fontSize: "18px" }}
                  >
                    {profileData.location}
                  </Typography>
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
                    {profileData.dateOfBirth}
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
                    {profileData.phone}
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
                    {profileData.email}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 0.6 }}
                  >
                    Experience
                  </Typography>
                  <Typography
                    variant="body1"
                    color="black"
                    sx={{ fontSize: "18px" }}
                  >
                    {profileData.experience}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs Section */}
      <Tabs
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
      </Tabs>

      {/* Tab Content */}
      {tabValue === "documents" && (
        <DocumentsTab documents={profileData.documents} />
      )}
      {tabValue === "tariff" && <TariffTab />}
      {tabValue === "availability" && <AvailabilityTab />}
      {tabValue === "ratings" && <RatingsTab />}
      {tabValue === "payment" && <PaymentTab />}
    </Box>
  );
}
