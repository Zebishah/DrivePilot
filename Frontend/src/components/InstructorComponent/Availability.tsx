
import React, { useState } from 'react';
import { Card, CardContent, Typography, Grid, Box } from '@mui/material';
import { FaRegCheckCircle } from 'react-icons/fa';
import { IoMdTime } from 'react-icons/io';
import { TiLocationOutline } from 'react-icons/ti';
import { SlCalender } from 'react-icons/sl';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import styled from 'styled-components';

interface TimeSlot {
  id: number;
  time: string;
  duration: string;
  location: string;
}

const timeSlots: TimeSlot[] = [
  { id: 1, time: '12:00 pm - 01:00 pm', duration: '1 hr lesson', location: 'Bern, SWI' },
  { id: 2, time: '01:00 pm - 02:00 pm', duration: '1 hr lesson', location: 'Bern, SWI' },
  { id: 3, time: '02:00 pm - 03:00 pm', duration: '1 hr lesson', location: 'Bern, SWI' },
  { id: 4, time: '12:00 pm - 01:00 pm', duration: '1 hr lesson', location: 'Bern, SWI' },
  { id: 5, time: '01:00 pm - 02:00 pm', duration: '1 hr lesson', location: 'Bern, SWI' },
  { id: 6, time: '02:00 pm - 03:00 pm', duration: '1 hr lesson', location: 'Bern, SWI' },
  { id: 7, time: '12:00 pm - 01:00 pm', duration: '1 hr lesson', location: 'Bern, SWI' },
  { id: 8, time: '01:00 pm - 02:00 pm', duration: '1 hr lesson', location: 'Bern, SWI' },
  { id: 9, time: '02:00 pm - 03:00 pm', duration: '1 hr lesson', location: 'Bern, SWI' },
  { id: 10, time: '02:00 pm - 03:00 pm', duration: '1 hr lesson', location: 'Bern, SWI' },
  { id: 11, time: '02:00 pm - 03:00 pm', duration: '1 hr lesson', location: 'Bern, SWI' },
  { id: 12, time: '02:00 pm - 03:00 pm', duration: '1 hr lesson', location: 'Bern, SWI' }
];

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
    transform: translate3d(-30%, -50%, 0) !important; /* Adjust positioning */
  }
`;

const Availability: React.FC = () => {
  const [startDate, setStartDate] = useState<Date | null>(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);

  const CustomInput = React.forwardRef(({ value, onClick }: any, ref: any) => (
    <CalendarIconButton onClick={onClick} ref={ref}>
      <SlCalender style={{ color: 'black' }} />
    </CalendarIconButton>
  ));

  const handleCardClick = (id: number) => {
    setSelectedSlot(id);
  };

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
          }} variant="subtitle1" marginTop={2}>
            Select Available Time Slots
          </Typography>

          <Grid container spacing={2} marginTop={2}>
            {timeSlots.map((slot) => (
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
                      <Typography variant="body1" 
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

                      variant="body2" fontWeight="bold">
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
                      variant="body2" fontWeight="bold">
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











