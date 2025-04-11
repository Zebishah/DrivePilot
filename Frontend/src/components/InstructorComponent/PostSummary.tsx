import React from 'react';
import { useQuery } from '@apollo/client';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Box, Card, Avatar, Button, Typography, Tabs, Tab, Skeleton } from '@mui/material';
import Availability from './Availability';
import Summary from './Summary';
import Reviews from './Reviews';
import { GET_INSTRUCTOR_PROFILE } from '../../graphql/mutations/instructorPublic';

// GraphQL Query remains the same as previous implementation

const ProfileSummary: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = React.useState(0);
  const [selectedAvailability, setSelectedAvailability] = React.useState<any>(null);

  const { loading, error, data } = useQuery(GET_INSTRUCTOR_PROFILE, {
    variables: { id: id || '' },
    errorPolicy: 'all', // Allows partial data retrieval even if there's an error
  });


  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // Fallback data for when no data is available
  const fallbackInstructor = {
    firstName: 'Instructor',
    lastName: 'Not Found',
    location: 'N/A',
    imageUrl: "/images/instructorprofile.png",
    experience: 0,
    description: 'No description available',
    rating: 0,
  };

  const fallbackTariff = {
    lessonFee: 0,
    bulkPackages: [],
    packageDiscount: 0,
  };

  const fallbackAvailability = [];

  // Determine the actual data to use
  const instructor = data?.getInstructorPublicProfile?.instructor || fallbackInstructor;
  const tariff = data?.getInstructorPublicProfile?.tariff || fallbackTariff;
  const availability = data?.getInstructorPublicProfile?.availability || fallbackAvailability;

  const handleBookNow = () => {
    if (!selectedAvailability) {
      // You might want to show an error message here
      return;
    }

    if (location.pathname.includes('/student-dashboard/search')) {
      navigate('/student-dashboard/book', { 
        state: { 
          instructorId: id,
          selectedAvailability: selectedAvailability,
          instructorData: {
            name: `${instructor.firstName} ${instructor.lastName}`,
            email: instructor.email,
            description: instructor.description
          }
        }
      });
    } else {
      navigate('/auth/signin', { 
        state: { from: location.pathname },
        replace: true 
      });
    }
  };

  // Render loading state with skeleton loaders
  if (loading) {
    return (
      <Box sx={{ maxWidth: 1400, margin: 'auto', marginTop: '3rem', padding: { xs: '0 1rem', sm: '0 2rem', md: '0 3rem', lg: '0 4rem', xl: '0 5rem' } }}>
        <Card sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' } }}>
          <Skeleton variant="rectangular" width={250} height={250} />
          <Box sx={{ flex: 1, padding: 2 }}>
            <Skeleton variant="text" width="60%" height={40} />
            <Skeleton variant="text" width="40%" height={30} />
            <Box sx={{ display: 'flex', marginTop: 2 }}>
              {[1, 2, 3].map((item) => (
                <Box key={item} sx={{ flex: 1, marginRight: 2 }}>
                  <Skeleton variant="text" width="50%" />
                  <Skeleton variant="text" width="30%" />
                </Box>
              ))}
            </Box>
          </Box>
          <Skeleton variant="rectangular" width={150} height={50} sx={{ margin: 2 }} />
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1400, margin: 'auto', marginTop: '3rem', padding: { xs: '0 1rem', sm: '0 2rem', md: '0 3rem', lg: '0 4rem', xl: '0 5rem' } }}>
      <Card sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' } }}>
        <Avatar
          src={instructor.imageUrl || "/images/instructorprofile.png"}
          alt={`${instructor.firstName} ${instructor.lastName}`}
          sx={{ width: { xs: 200, sm: 250 }, height: { xs: 200, sm: 250, md: '100%' }, borderRadius: 0 }}
        />
        <Box
          sx={{
            flex: 1,
            padding: 2,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ marginTop: { xs: '1rem', sm: '1.5rem', md: '2rem' } }}>
            <Typography sx={{ fontFamily: 'Poppins, sans-serif' }} variant="h5">
              {`${instructor.firstName} ${instructor.lastName}`}
            </Typography>
            <Typography sx={{ fontFamily: 'Poppins, sans-serif' }} variant="subtitle1" color="textSecondary">
              {`${instructor?.address} , ${instructor.location} ` || 'Location Not Available'}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' } }}>
            <Box sx={{ paddingRight: { md: '2rem' }, borderRight: { md: '1px solid #ccc' }, marginBottom: { xs: '1rem', md: '0' } }}>
              <Typography variant="body2">
                <strong>{instructor.experience || 0}</strong>
              </Typography>
              <Typography sx={{ fontFamily: 'Poppins, sans-serif' }}>Trips</Typography>
            </Box>
            <Box sx={{ paddingLeft: '2rem', paddingRight: '2rem', borderRight: { md: '1px solid #ccc' }, marginBottom: { xs: '1rem', md: '0' } }}>
              <Typography variant="body2">
                <strong>{instructor.rating?.toFixed(1) || 'N/A'}</strong>
              </Typography>
              <Typography sx={{ fontFamily: 'Poppins, sans-serif' }}>Ratings</Typography>
            </Box>
            <Box sx={{ paddingLeft: '2rem' }}>
              <Typography variant="body2">
                <strong>${tariff.lessonFee || 0}/lesson</strong>
              </Typography>
              <Typography sx={{ fontFamily: 'Poppins, sans-serif' }}>Fair</Typography>
            </Box>
          </Box>
        </Box>
        <Button
          variant="contained"
          disabled={loading}
          onClick={handleBookNow}
          sx={{
            margin: 2,
            marginTop: { xs: 2, md: 8 },
            alignSelf: 'center',
            backgroundColor: '#55AFBD',
            width: { xs: '12rem', sm: '14rem' },
            height: '3rem',
            textTransform: 'none',
            fontFamily: 'Poppins, sans-serif',
            color: "black",
            opacity: loading ? 0.5 : 1
          }}
        >
          {loading ? 'Loading...' : 'Book Now'}
        </Button>
      </Card>

      <Tabs
        sx={{
          marginTop: '1rem',
          '& .MuiTabs-indicator': {
            backgroundColor: 'black',
            fontWeight: '500',
            height: '2px',
          },
        }}
        value={activeTab}
        onChange={handleTabChange}
        variant="scrollable"
        scrollButtons="auto"
      >
        <Tab
          sx={{
            textTransform: 'none',
            fontWeight: activeTab === 0 ? '600' : '400',
            color: activeTab === 0 ? 'black !important' : 'inherit',
            fontFamily: 'Poppins, sans-serif',
          }}
          label="Profile Summary"
        />
        <Tab
          sx={{
            textTransform: 'none',
            fontWeight: activeTab === 1 ? '600' : '400',
            color: activeTab === 1 ? 'black !important' : 'inherit',
            fontFamily: 'Poppins, sans-serif',
          }}
          label="Availability"
        />
        <Tab
          sx={{
            textTransform: 'none',
            fontWeight: activeTab === 2 ? '600' : '400',
            color: activeTab === 2 ? 'black !important' : 'inherit',
            fontFamily: 'Poppins, sans-serif',
          }}
          label="Reviews"
        />
      </Tabs>

      {activeTab === 0 && <Summary instructorData={instructor} tariffData={tariff} loading={loading} />}
      {activeTab === 1 && <Availability 
        availabilityData={availability} 
        loading={loading} 
        onSelectAvailability={setSelectedAvailability}
      />}
      {activeTab === 2 && <Reviews loading={loading} />}
    </Box>
  );
};

export default ProfileSummary;