import React from "react";
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
} from "@mui/material";
import { Star, Edit } from "lucide-react";
import { useQuery } from '@apollo/client';
import { GET_TEACHER_PROFILE } from "../../../graphql/mutations/profile";
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { DocumentsTab } from "./tabs/DocumentsTab";
import { TariffTab } from "./tabs/TariffTab";
import { AvailabilityTab } from "./tabs/AvailabilityTab";
import { RatingsTab } from "./tabs/RatingsTab";
import { PaymentTab } from "./tabs/PaymentTab";

type TabValue = 'documents' | 'tariff' | 'availability' | 'ratings' | 'payment';

export default function ProfileSetting() {
  const [tabValue, setTabValue] = React.useState<TabValue>('documents');
  const navigate = useNavigate();
  const location = useLocation();

  const { loading, error, data } = useQuery(GET_TEACHER_PROFILE);

  if (loading) return <Box sx={{ p: 3 }}><Typography>Loading...</Typography></Box>;
  if (error) return <Box sx={{ p: 3 }}><Typography>Error: {error.message}</Typography></Box>;

  const teacherData = data?.teacherProfile;
  if (!teacherData) return <Box sx={{ p: 3 }}><Typography>No profile data found</Typography></Box>;


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
    experience: string;
    rating: number;
    introduction: string;
    documents: Document[];
  }

  const profileData: ProfileData = {
    fullName: `${teacherData.firstName} ${teacherData.lastName}`,
    fatherName: teacherData.fatherName || "Not Provided",
    dateOfBirth: teacherData.dateOfBirth 
      ? new Date(teacherData.dateOfBirth).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      : "Not Provided",
    email: teacherData.email,
    location: teacherData.location,
    languagePreference: teacherData.languagePreference || "Not Provided",
    phone: teacherData.phone,
    experience: teacherData.experience,
    rating: 4, // This field isn't in your API response
    introduction: teacherData.description,
    documents: teacherData.documents.map((doc: { documentType: string; documentUrl: string }) => ({
      documentType: doc.documentType,
      documentUrl: doc.documentUrl
    })) || [] // Ensure documents is an array even if empty
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: TabValue) => {
    setTabValue(newValue);
  };

  const handleEditProfile = () => {
    navigate('/teacher-dashboard/settings/edit-profile'); // Updated path
  };

  // Render EditProfile if the current path is /teacher-dashboard/settings/edit-profile
  if (location.pathname.includes('edit-profile')) {
    return <Outlet />; // Render the EditProfile component
  }


  return (
    <Box sx={{ p: 3, bgcolor: "#f5f7fa", minHeight: "100vh" }}>

      {/* Profile and Personal Information Section */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* My Profile Card */}
        <Grid item xs={12} md={6}>
          <Card sx={{ p: 2 }}>
            <CardContent>
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}
              >
                <Avatar
                  src="path/to/profile-image.jpg"
                  sx={{ width: 100, height: 100 }}
                />
                <Box>
                  <Typography variant="h6">{profileData.fullName}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {profileData.location}
                  </Typography>
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
              <Typography variant="body2" color="text.secondary">
                <strong>Introduction</strong>
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                {profileData.introduction}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Personal Information Card */}
        <Grid item xs={12} md={6}>
          <Card sx={{ p: 2, height: "100%" }}>
            <CardContent>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 2,
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
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Full Name
                  </Typography>
                  <Typography variant="body1">
                    {profileData.fullName}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Location
                  </Typography>
                  <Typography variant="body1">
                    {profileData.location}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Father Name
                  </Typography>
                  <Typography variant="body1">
                    {profileData.fatherName}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Language Preference
                  </Typography>
                  <Typography variant="body1">
                    {profileData.languagePreference}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Date of Birth
                  </Typography>
                  <Typography variant="body1">
                    {profileData.dateOfBirth}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Phone Number
                  </Typography>
                  <Typography variant="body1">{profileData.phone}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Email Address
                  </Typography>
                  <Typography variant="body1">{profileData.email}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Experience
                  </Typography>
                  <Typography variant="body1">
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
      {tabValue === 'documents' && <DocumentsTab documents={profileData.documents} />}
      {tabValue === 'tariff' && <TariffTab />}
      {tabValue === 'availability' && <AvailabilityTab />}
      {tabValue === 'ratings' && <RatingsTab />}
      {tabValue === 'payment' && <PaymentTab />}
    </Box>
  );
}
