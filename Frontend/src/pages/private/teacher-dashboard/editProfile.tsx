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
} from "@mui/material";
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@apollo/client';
import { GET_TEACHER_PROFILE, UPDATE_TEACHER_PROFILE } from '../../../graphql/mutations/profile';
import { toast } from 'react-hot-toast';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { startOfDay } from 'date-fns';
import { ApolloError } from '@apollo/client';

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

export default function EditProfile() {
  const navigate = useNavigate();
  const { loading, error, data } = useQuery(GET_TEACHER_PROFILE);
  const [updateProfile] = useMutation(UPDATE_TEACHER_PROFILE);
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
    handleInputChange('dateOfBirth', newValue ? newValue.toISOString() : '');
  };

  const handleSaveChanges = async () => {
    try {
      // Only include fields that have changed
      const changedFields = Object.entries(formData).reduce((acc, [key, value]) => {
        if (!data?.teacherProfile || value !== data.teacherProfile[key as keyof ProfileData]) {
          acc[key as keyof ProfileData] = value;
        }
        return acc;
      }, {} as Partial<ProfileData>);

      // If no fields have changed, just navigate back
      if (Object.keys(changedFields).length === 0) {
        navigate('/teacher-dashboard/settings');
        return;
      }

      // Call the updateProfile mutation with the changed fields
      await updateProfile({
        variables: {
          input: changedFields
        }
      });

      toast.success('Profile updated successfully');
      navigate('/teacher-dashboard/settings');
    } catch (error) {
      console.error('Error updating profile:', error);
      if (error instanceof ApolloError) {
        if (error.graphQLErrors) {
          console.error('GraphQL Errors:', error.graphQLErrors);
        }
        if (error.networkError) {
          console.error('Network Error:', error.networkError);
        }
      }
      toast.error('Failed to update profile');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
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
        <Card sx={{ p: 2, mb: 3 }}>
          <CardContent>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
              <Avatar
                src="path/to/profile-image.jpg"
                sx={{ width: 100, height: 100 }}
              />
              <Box>
                <Typography variant="h6">{`${formData.firstName} ${formData.lastName}`}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {formData.location}
                </Typography>
              </Box>
            </Box>
            <TextField
              label="Introduction"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              fullWidth
              multiline
              rows={3}
              sx={{ mb: 2 }}
            />
          </CardContent>
        </Card>

        {/* Personal Information Card */}
        <Card sx={{ p: 2 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>Personal Information</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Full Name"
                  value={`${formData.firstName} ${formData.lastName}`}
                  onChange={(e) => {
                    const [first, ...last] = e.target.value.split(' ');
                    setFormData((prev) => ({
                      ...prev,
                      firstName: first || "",
                      lastName: last.join(' ') || "",
                    }));
                  }}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Email Address"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Father Name"
                  value={formData.fatherName}
                  onChange={(e) => handleInputChange('fatherName', e.target.value)}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Location"
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker
                    label="Date of Birth"
                    value={formData.dateOfBirth ? new Date(formData.dateOfBirth) : null}
                    onChange={handleDateOfBirthChange}
                    maxDate={today}
                    slotProps={{ 
                      textField: { 
                        fullWidth: true,
                      } 
                    }}
                  />
                </LocalizationProvider>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Language Preference"
                  value={formData.languagePreference}
                  onChange={(e) => handleInputChange('languagePreference', e.target.value)}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Phone Number"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Experience"
                  value={formData.experience}
                  onChange={(e) => handleInputChange('experience', e.target.value)}
                  fullWidth
                />
              </Grid>
            </Grid>
            <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 3 }}>
              <Button
                variant="contained"
                sx={{ bgcolor: "#5ec2d2", "&:hover": { bgcolor: "#4ba1b0" } }}
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