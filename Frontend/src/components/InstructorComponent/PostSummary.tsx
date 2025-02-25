
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
    <Box sx={{ maxWidth: 1400, margin: 'auto', marginTop: '3rem', padding: { xs: '0 1rem', sm: '0 2rem', md: '0 3rem', lg: '0 4rem', xl: '0 5rem' } }}>
      <Card sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' } }}>
        <Avatar
          src="/images/instructorprofile.png"
          alt="Tom Watson"
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
              Tom Watson
            </Typography>
            <Typography sx={{ fontFamily: 'Poppins, sans-serif' }} variant="subtitle1" color="textSecondary">
              Bern, SWI
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' } }}>
            <Box sx={{ paddingRight: { md: '2rem' }, borderRight: { md: '1px solid #ccc' }, marginBottom: { xs: '1rem', md: '0' } }}>
              <Typography variant="body2">
                <strong>234</strong>
              </Typography>
              <Typography sx={{ fontFamily: 'Poppins, sans-serif' }}>Trips</Typography>
            </Box>
            <Box sx={{ paddingLeft: '2rem', paddingRight: '2rem', borderRight: { md: '1px solid #ccc' }, marginBottom: { xs: '1rem', md: '0' } }}>
              <Typography variant="body2">
                <strong>4.8</strong>
              </Typography>
              <Typography sx={{ fontFamily: 'Poppins, sans-serif' }}>Ratings</Typography>
            </Box>
            <Box sx={{ paddingLeft: '2rem' }}>
              <Typography variant="body2">
                <strong>$30/lesson</strong>
              </Typography>
              <Typography sx={{ fontFamily: 'Poppins, sans-serif' }}>Fair</Typography>
            </Box>
          </Box>
        </Box>
        <Button
          variant="contained"
          sx={{
            margin: 2,
            marginTop: { xs: 2, md: 8 },
            alignSelf: 'center',
            backgroundColor: '#55AFBD',
            width: { xs: '12rem', sm: '14rem' },
            height: '3rem',
            textTransform: 'none',
            fontFamily: 'Poppins, sans-serif',
            color:"black"
          }}
        >
          Book Now
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

      {activeTab === 0 && <Summary />}
      {activeTab === 1 && <Availability />}
      {activeTab === 2 && <Reviews />}
    </Box>
  );
};

export default ProfileSummary;