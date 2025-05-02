import {
  Box,
  Typography,
  Avatar,
  Card,
  CardContent,
  Grid,
  Button,
} from "@mui/material";
import { LuMapPin } from "react-icons/lu";
import { Edit } from "lucide-react";
import { useQuery } from "@apollo/client";
import { GET_STUDENT_PROFILE } from "../../../graphql/mutations/studentProfile";

export default function StudentProfileSetting() {
  const { loading, error, data } = useQuery(GET_STUDENT_PROFILE);

  if (loading) return <Typography>Loading...</Typography>;
  if (error) return <Typography>Error: {error.message}</Typography>;

  const profileData = {
    fullName: `${data?.studentProfile?.firstName} ${data?.studentProfile?.lastName}`,
    fatherName: data?.studentProfile?.fatherName || "Not Provided",
    dateOfBirth: data?.studentProfile?.dateOfBirth
      ? new Date(data.studentProfile.dateOfBirth).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "Not Provided",
    email: data?.studentProfile?.email,
    location: data?.studentProfile?.location || "Not Provided",
    languagePreference:
      data?.studentProfile?.languagePreference || "Not Provided",
    phone: data?.studentProfile?.phone || "Not Provided",
    description: data?.studentProfile?.description || "No description provided",
  };

  return (
    <Box sx={{ p: 3, bgcolor: "#f5f7fa", minHeight: "100vh" }}>
      {/* Profile and Personal Information Section */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* My Profile Card */}
        <Grid item xs={12} md={4}>
          <Card>
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
                    <Typography variant="body2" color="text.secondary">
                      {profileData.location}
                    </Typography>
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
                {profileData.description}
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
                >
                  Edit Profile
                </Button>
              </Box>

              <Grid container spacing={4} sx={{ p: 2 }}>
                <Grid item xs={6}>
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
                    Father Name
                  </Typography>
                  <Typography
                    variant="body1"
                    color="black"
                    sx={{ fontSize: "18px" }}
                  >
                    {profileData.fatherName}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 0.6 }}
                  >
                    Language Preference
                  </Typography>
                  <Typography
                    variant="body1"
                    color="black"
                    sx={{ fontSize: "18px" }}
                  >
                    {profileData.languagePreference}
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
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
