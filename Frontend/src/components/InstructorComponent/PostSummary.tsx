
import React from 'react';
import { Box, Card, Avatar, Button, Typography, Tabs, Tab } from '@mui/material';
import Availability from './Availability';
import Summary from './Summary';
import Reviews from './Reviews';

const ProfileSummary = () => {
  const [activeTab, setActiveTab] = React.useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  return (
    <Box sx={{ maxWidth: 1400, margin: 'auto', marginTop: '3rem' }}>
      <Card sx={{ display: 'flex' }}>
        <Avatar
          src="/images/instructorprofile.png"
          alt="Tom Watson"
          sx={{ width: 250, height: '100%', borderRadius: 0 }}
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
          <Box
            sx={{
              marginTop: '2rem',
            }}
          >
            <Typography variant="h5">Tom Watson</Typography>
            <Typography variant="subtitle1" color="textSecondary">
              Bern, SWI
            </Typography>
          </Box>
          <Box sx={{ display: 'flex' }}>
            <Box
              sx={{
                paddingRight: '2rem',
                borderRight: '1px solid #ccc',
              }}
            >
              <Typography variant="body2">
                <strong>234</strong>
              </Typography>
              <Typography>Trips</Typography>
            </Box>
            <Box
              sx={{
                paddingLeft: '2rem',
                paddingRight: '2rem',
                borderRight: '1px solid #ccc',
              }}
            >
              <Typography variant="body2">
                <strong>4.8</strong>
              </Typography>
              <Typography>Ratings</Typography>
            </Box>
            <Box sx={{ paddingLeft: '2rem' }}>
              <Typography variant="body2">
                <strong>$30/lesson</strong>
              </Typography>
              <Typography>Fair</Typography>
            </Box>
          </Box>
        </Box>
        <Button
          variant="contained"
          sx={{
            margin: 2,
            marginTop: 8,
            alignSelf: 'center',
            backgroundColor: '#55AFBD',
            width: '14rem',
            height: '3rem',
            textTransform: 'none',
          }}
        >
          Book Now
        </Button>
      </Card>

      {/* Tabs with active styling */}
<Tabs
  sx={{
    marginTop: '1rem',
    '& .MuiTabs-indicator': {
      backgroundColor: 'black', 
      height: '3px', 
    },
  }}
  value={activeTab}
  onChange={handleTabChange}
>
  <Tab
    sx={{
      textTransform: 'none',
      fontWeight: activeTab === 0 ? 'bold' : 'normal', 
      color: activeTab === 0 ? 'black !important' : 'inherit', 
    }}
    label="Profile Summary"
  />
  <Tab
    sx={{
      textTransform: 'none',
      fontWeight: activeTab === 1 ? 'bold' : 'normal', 
      color: activeTab === 1 ? 'black !important' : 'inherit', 
    }}
    label="Availability"
  />
  <Tab
    sx={{
      textTransform: 'none',
      fontWeight: activeTab === 2 ? 'bold' : 'normal', 
      color: activeTab === 2 ? 'black !important' : 'inherit', 
    }}
    label="Reviews"
  />
</Tabs>



      {/* Tab Content */}
      {activeTab === 0 && <Summary />}
      {activeTab === 1 && <Availability />}
      {activeTab === 2 && <Reviews />}
    </Box>
  );
};

export default ProfileSummary;
