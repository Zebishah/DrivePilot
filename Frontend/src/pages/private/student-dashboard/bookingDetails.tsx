import React from 'react';
import { Box, Typography, Card, CardContent, Grid, Button, Avatar } from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const BookingDetails: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedAvailability, instructorData, paymentMethod } = location.state || {};

  const handleConfirm = () => {
    // Handle confirmation logic
    navigate('/student-dashboard/overview');
  };

  const handleReschedule = () => {
    // Handle rescheduling logic
  };

  const handleCancel = () => {
    // Handle cancellation logic
  };

  return (
    <Box sx={{ p: 3, bgcolor: '#f5f5f5', minHeight: '100vh' }}>
      <Card sx={{ mb: 3 }}>
        <Box
          sx={{
            mb: 2,
            pb: 1.6,
            px: 2,
            pt: 1.3,
            width: '100%',
            borderBottom: 1,
            borderBottomColor: 'gray',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
            Booking Details
          </Typography>
          <Box>
            <Button
              variant="contained"
              sx={{ mr: 1 }}
              onClick={handleReschedule}
            >
              Rescheduling
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={handleCancel}
            >
              Cancel Booking
            </Button>
          </Box>
        </Box>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
            Payment Method
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Avatar sx={{ bgcolor: '#6a1b9a', mr: 2 }}>S</Avatar>
            <Box>
              <Typography variant="body1">{paymentMethod?.type || 'N/A'}</Typography>
              <Typography variant="body2" color="textSecondary">
                {paymentMethod?.cardNumber || 'N/A'}
              </Typography>
            </Box>
          </Box>

          <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
            Overview
          </Typography>
          <Typography variant="body1">
            <strong>Lesson Number:</strong> {selectedAvailability?.length || 0}
          </Typography>
          <Typography variant="body1">
            <strong>Total Duration:</strong> {selectedAvailability?.length || 0} Hours
          </Typography>
          <Typography variant="body1">
            <strong>Start Date:</strong> {selectedAvailability?.[0]?.date ? new Date(selectedAvailability[0].date).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric'
            }) : 'Not selected'}
          </Typography>
          <Typography variant="body1">
            <strong>End Date:</strong> {selectedAvailability?.[selectedAvailability.length - 1]?.date ? new Date(selectedAvailability[selectedAvailability.length - 1].date).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric'
            }) : 'Not selected'}
          </Typography>

          <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, mt: 3 }}>
            Scheduled Lessons
          </Typography>
          <Grid container spacing={2}>
            {selectedAvailability && selectedAvailability.length > 0 ? (
              selectedAvailability.map((slot: any, index: number) => (
                <Grid item xs={12} sm={4} key={index}>
                  <Card
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      p: 1,
                      bgcolor: '#e6f0fa',
                      borderRadius: 2,
                    }}
                  >
                    <CheckCircleIcon sx={{ color: 'green', mr: 1 }} />
                    <CardContent sx={{ p: 1 }}>
                      <Typography variant="body1">
                        {slot.startTime} - {slot.endTime}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        1 hr lesson
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        {new Date(slot.date).toLocaleDateString([], {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))
            ) : (
              <Grid item xs={12}>
                <Typography variant="body1" color="textSecondary">
                  No lessons selected
                </Typography>
              </Grid>
            )}
          </Grid>

          <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1, mt: 3 }}>
            Instructor Information
          </Typography>
          <Typography variant="body1">
            <strong>Name:</strong> {instructorData?.name || 'Not available'}
          </Typography>
          <Typography variant="body1">
            <strong>Contact:</strong>{' '}
            <a href={`mailto:${instructorData?.email}`}>
              {instructorData?.email || 'Not available'}
            </a>
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            <strong>Description:</strong> {instructorData?.description || 'No description available'}
          </Typography>
        </CardContent>
      </Card>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleConfirm}
        >
          Confirmed
        </Button>
      </Box>
    </Box>
  );
};

export default BookingDetails; 