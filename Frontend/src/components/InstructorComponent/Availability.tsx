import React, { useState, useMemo } from 'react';
import { Card, CardContent, Typography, Grid, Box, Skeleton } from '@mui/material';
import { FaRegCheckCircle } from 'react-icons/fa';
import { IoMdTime } from 'react-icons/io';
import { TiLocationOutline } from 'react-icons/ti';
import { SlCalender } from 'react-icons/sl';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import styled from 'styled-components';

// Types for Availability
interface AvailabilitySlot {
  _id: string;
  date: string;
  startTime: string;
  endTime: string;
}

interface AvailabilityProps {
  availabilityData: AvailabilitySlot[];
  loading?: boolean;
}

const CalendarIconWrapper = styled.div`
  position: relative;
`;

const CalendarIconButton = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background-color: #5FC2D3;
  cursor: pointer;
  position: relative;
`;

const CustomDatePicker = styled(DatePicker)`
  .react-datepicker-popper {
    z-index: 2;
    transform: translate3d(-30%, -50%, 0) !important;
  }
`;

const Availability: React.FC<AvailabilityProps> = ({ availabilityData = [], loading = false }) => {
  const [startDate, setStartDate] = useState<Date | null>(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  // Transform availability data into a more usable format
  const transformedSlots = useMemo(() => {
    if (!availabilityData || availabilityData.length === 0) return [];

    return availabilityData.map(slot => ({
      id: slot._id,
      time: `${slot.startTime} - ${slot.endTime}`,
      duration: '1 hr lesson',
      location: 'Location Not Specified',
      date: slot.date
    }));
  }, [availabilityData]);

  const CustomInput = React.forwardRef(({ value, onClick }: any, ref: any) => (
    <CalendarIconButton onClick={onClick} ref={ref}>
      <SlCalender style={{ color: 'black' }} />
    </CalendarIconButton>
  ));

  const handleCardClick = (id: string) => {
    setSelectedSlot(id);
  };

  // Render loading state
  if (loading) {
    return (
      <Card
        sx={{
          marginTop: 2,
          height: { xs: 'auto', md: 600 },
          borderRadius: '10px',
          marginBottom: '1rem',
          boxShadow: 2,
          padding: 2,
        }}
      >
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
            <Skeleton variant="text" width="30%" height={40} />
            <Skeleton variant="circular" width={40} height={40} />
          </Box>
          <Skeleton variant="text" width="50%" height={30} />
          <Grid container spacing={2} marginTop={2}>
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <Grid item xs={12} sm={6} md={3} key={item}>
                <Skeleton variant="rectangular" height={150} />
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>
    );
  }

  // Render no availability message
  if (!loading && (!availabilityData || availabilityData.length === 0)) {
    return (
      <Card
        sx={{
          marginTop: 2,
          height: { xs: 'auto', md: 600 },
          borderRadius: '10px',
          marginBottom: '1rem',
          boxShadow: 2,
          padding: 2,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Typography
          variant="h6"
          color="textSecondary"
          sx={{
            fontFamily: 'Poppins, sans-serif',
            textAlign: 'center'
          }}
        >
          No availability slots found
        </Typography>
      </Card>
    );
  }

  return (
    <div>
      <Card
        sx={{
          marginTop: 2,
          height: { xs: 'auto', md: 600 },
          borderRadius: '10px',
          marginBottom: '1rem',
          boxShadow: 2,
          padding: 2,
        }}
      >
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', position: 'relative', alignItems: 'center' }}>
            <Typography
              sx={{
                fontWeight: '600',
                fontFamily: 'Poppins, sans-serif',
              }}
              variant="h6"
            >
              Availability
            </Typography>
            <CalendarIconWrapper>
              <CustomDatePicker
                selected={startDate}
                onChange={(date: React.SetStateAction<Date | null>) => setStartDate(date)}
                customInput={<CustomInput />}
                onClickOutside={() => setIsCalendarOpen(false)}
                open={isCalendarOpen}
                onInputClick={() => setIsCalendarOpen(true)}
              />
            </CalendarIconWrapper>
          </Box>
          <Typography
            sx={{
              fontFamily: 'Poppins, sans-serif',
              fontWeight: '600',
            }}
            variant="subtitle1"
            marginTop={2}
          >
            Select Available Time Slots
          </Typography>
          <Grid container spacing={2} marginTop={2}>
            {transformedSlots.map((slot) => (
              <Grid item xs={12} sm={6} md={3} key={slot.id}>
                <Card
                  onClick={() => handleCardClick(slot.id)}
                  sx={{
                    borderRadius: '10px',
                    backgroundColor: selectedSlot === slot.id ? '#5FC2D333' : '#5FC2D333',
                    border: selectedSlot === slot.id ? '2px solid #828282' : '1px solid #cce4f7',
                    boxShadow: selectedSlot === slot.id ? '0px 0px 10px rgba(0, 0, 0, 0.2)' : 1,
                    width: '100%',
                    transform: selectedSlot === slot.id ? 'scale(1.05)' : 'scale(1)',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                  }}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem', gap: 1 }}>
                      <FaRegCheckCircle style={{ color: '#25D422' }} />
                      <Typography
                        variant="body1"
                        sx={{
                          fontWeight: '500',
                          fontFamily: 'Poppins, sans-serif',
                        }}
                      >
                        {slot.time}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem', gap: 1 }}>
                      <IoMdTime />
                      <Typography
                        sx={{
                          fontWeight: '500',
                          fontFamily: 'Poppins, sans-serif',
                        }}
                        variant="body2"
                        fontWeight="bold"
                      >
                        {slot.duration}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem', gap: 1 }}>
                      <TiLocationOutline />
                      <Typography
                        sx={{
                          fontWeight: '500',
                          fontFamily: 'Poppins, sans-serif',
                        }}
                        variant="body2"
                        fontWeight="bold"
                      >
                        {slot.location}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>
    </div>
  );
};

export default Availability;