import React, { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Box,
  Skeleton,
  IconButton,
} from "@mui/material";
import { FaRegCheckCircle } from "react-icons/fa";
import { IoMdTime } from "react-icons/io";
import { TiLocationOutline } from "react-icons/ti";
import { SlCalender } from "react-icons/sl";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";
import styled from "styled-components";
import { CalendarCheck2 } from "lucide-react";
import { Clear } from "@mui/icons-material";

// Types for Availability
interface AvailabilitySlot {
  _id: string;
  date: string;
  startTime: string;
  endTime: string;
}

interface AvailabilityProps {
  availabilityData: AvailabilitySlot[];
  loading: boolean;
  onSelectAvailability?: (availability: AvailabilitySlot[]) => void;
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
  background-color: #5fc2d3;
  cursor: pointer;
  position: relative;
`;

const CustomDatePicker = styled(DatePicker)`
  .react-datepicker-popper {
    z-index: 2;
    transform: translate3d(-30%, -50%, 0) !important;
  }
`;

const Availability: React.FC<AvailabilityProps> = ({
  availabilityData,
  loading,
  onSelectAvailability,
}) => {
  const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs | null>(null);
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);

  // Create an array of available dates from availabilityData
  const availableDates = useMemo(() => {
    return availabilityData
      .filter(slot => dayjs(slot.date).isAfter(dayjs(), 'day'))
      .map(slot => dayjs(slot.date));
  }, [availabilityData]);

  const calculateDuration = (startTime: string, endTime: string) => {
    const start = dayjs(`2000-01-01 ${startTime}`);
    const end = dayjs(`2000-01-01 ${endTime}`);
    const hours = end.diff(start, 'hour', true);

    // Round to nearest 0.5 hour and format
    const roundedHours = Math.round(hours * 2) / 2;
    const hoursText = roundedHours === 1 ? 'hr' : 'hrs';
    return `${roundedHours.toFixed(1)} ${hoursText} lesson`;
  };


  // Filter slots based on selected date
  const transformedSlots = useMemo(() => {
    if (!availabilityData || availabilityData.length === 0) return [];

    return availabilityData
      .filter((slot) => {
        // Filter out past dates
        if (dayjs(slot.date).isBefore(dayjs(), 'day')) return false;
        // If no date selected, show all future slots
        if (!selectedDate) return true;
        // If date selected, show slots for that date
        return dayjs(slot.date).isSame(selectedDate, 'day');
      })
      .map((slot) => ({
        id: slot._id,
        time: `${slot.startTime} - ${slot.endTime}`,
        duration: calculateDuration(slot.startTime, slot.endTime),
        location: "Location Not Specified",
        date: slot.date,
      }));
  }, [availabilityData, selectedDate]);

  // Custom date validation
  const shouldDisableDate = (date: dayjs.Dayjs) => {
    const isPastDate = date.isBefore(dayjs(), 'day');
    const isAvailable = availableDates.some(availableDate =>
      availableDate.isSame(date, 'day')
    );
    return isPastDate || !isAvailable;
  };

  const CustomInput = React.forwardRef(({ value, onClick }: any, ref: any) => (
    <CalendarIconButton onClick={onClick} ref={ref}>
      <SlCalender style={{ color: "black" }} />
    </CalendarIconButton>
  ));

  const handleCardClick = (id: string) => {
    setSelectedSlots((prev) => {
      // Create new selection array (correctly removing or adding the clicked ID)
      const newSelection = prev.includes(id)
        ? prev.filter((slotId) => slotId !== id)
        : [...prev, id];

      // Get the full availability data for ONLY the currently selected slots
      const selectedAvailabilityData = availabilityData.filter((slot) =>
        newSelection.includes(slot._id)
      );

      // Pass the filtered availability data to the parent component
      if (onSelectAvailability) {
        onSelectAvailability(selectedAvailabilityData);
      }

      return newSelection;
    });
  };

  // Render loading state
  if (loading) {
    return (
      <Card
        sx={{
          marginTop: 2,
          height: { xs: "auto", md: 600 },
          borderRadius: "10px",
          marginBottom: "1rem",
          boxShadow: 2,
          padding: 2,
        }}
      >
        <CardContent>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 2,
            }}
          >
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
          height: { xs: "auto", md: 600 },
          borderRadius: "10px",
          marginBottom: "1rem",
          boxShadow: 2,
          padding: 2,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Typography
          variant="h6"
          color="textSecondary"
          sx={{
            fontFamily: "Poppins, sans-serif",
            textAlign: "center",
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
          height: { xs: "auto", md: 600 },
          borderRadius: "10px",
          marginBottom: "1rem",
          boxShadow: 2,
          padding: 2,
        }}
      >
        <CardContent>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              position: "relative",
              alignItems: "center",
              marginBottom: 2,
              gap: 2,
            }}
          >
            <Typography
              sx={{
                fontWeight: "600",
                fontFamily: "Poppins, sans-serif",
              }}
              variant="h6"
            >
              Availability
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              {selectedDate && (
                <IconButton
                  onClick={() => setSelectedDate(null)}
                  size="small"
                  sx={{
                    bgcolor: '#f0f0f0',
                    '&:hover': { bgcolor: '#e0e0e0' }
                  }}
                >
                  <Clear fontSize="small" />
                </IconButton>
              )}
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker
                  value={selectedDate}
                  onChange={(newValue) => setSelectedDate(newValue)}
                  shouldDisableDate={shouldDisableDate}
                  disablePast
                  views={['year', 'month', 'day']}
                  sx={{
                    '& .MuiInputBase-root': {
                      height: '40px',
                      borderRadius: '8px',
                      backgroundColor: '#5fc2d3',
                      '& .MuiInputBase-input': {
                        color: 'black',
                        fontWeight: 500,
                        padding: '8px',
                      },
                      '& .MuiOutlinedInput-notchedOutline': {
                        border: 'none',
                      },
                    },
                  }}
                  slotProps={{
                    textField: {
                      size: 'small',
                      placeholder: 'Select date',
                    },
                    day: {
                      sx: (ownerState: any) => {
                        const day = ownerState.day as dayjs.Dayjs;
                        const isAvailable = availableDates.some(d =>
                          d.isSame(day, 'day')
                        );

                        // Base overrides for every day cell
                        const base: any = {
                          '&.MuiPickersDay-root': {
                            borderRadius: '50%',
                            // Highlight today with a subtle outline
                            '&[aria-current="date"]': {
                              border: '2px solid #5fc2d3 !important',
                            },
                            // Selected state
                            '&.Mui-selected': {
                              backgroundColor: '#5fc2d3 !important',
                              color: '#fff !important',
                              '&:hover': {
                                backgroundColor: '#4bb1c2 !important',
                              },
                            },
                          },
                        };

                        // If it's in your availableDates array, merge in these overrides:
                        if (isAvailable) {
                          return {
                            ...base,
                            '&.MuiPickersDay-root': {
                              ...base['&.MuiPickersDay-root'],
                              color: '#00966D !important',            // force green text
                              fontWeight: 700,
                              border: '2px solid #00966D !important', // strong green border
                              backgroundColor: 'rgba(0,150,110,0.1) !important', // faint bg
                              '&:hover': {
                                backgroundColor: '#d1f0f7 !important',
                              },
                            },
                          };
                        }

                        // Otherwise just return the base
                        return base;
                      },
                    },
                  }}
                />
              </LocalizationProvider>


            </Box>
          </Box>
          <Typography
            sx={{
              fontFamily: "Poppins, sans-serif",
              fontWeight: "600",
            }}
            variant="subtitle1"
            marginTop={2}
          >
            Select Available Time Slots
          </Typography>
          <Grid container spacing={2} marginTop={2}>
            {transformedSlots.length > 0 ? (
              transformedSlots.map((slot) => (
                <Grid item xs={12} sm={6} md={3} key={slot.id}>
                  <Card
                    onClick={() => handleCardClick(slot.id)}
                    sx={{
                      borderRadius: "10px",
                      backgroundColor: selectedSlots.includes(slot.id)
                        ? "#5FC2D333"
                        : "#5FC2D333",
                      border: selectedSlots.includes(slot.id)
                        ? "2px solid #828282"
                        : "1px solid #cce4f7",
                      boxShadow: selectedSlots.includes(slot.id)
                        ? "0px 0px 10px rgba(0, 0, 0, 0.2)"
                        : 1,
                      width: "100%",
                      transform: selectedSlots.includes(slot.id)
                        ? "scale(1.05)"
                        : "scale(1)",
                      transition: "transform 0.2s, box-shadow 0.2s",
                    }}
                  >
                    <CardContent>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          marginBottom: "0.5rem",
                          gap: 1,
                        }}
                      >
                        <CalendarCheck2 size={18} style={{ color: "#25D422" }} />
                        <Typography
                          variant="body1"
                          sx={{
                            fontWeight: "500",
                            fontFamily: "Poppins, sans-serif",
                          }}
                        >
                          {slot.date}
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          marginBottom: "0.5rem",
                          gap: 1,
                        }}
                      >
                        <FaRegCheckCircle style={{ color: "#25D422" }} />
                        <Typography
                          variant="body1"
                          sx={{
                            fontWeight: "500",
                            fontFamily: "Poppins, sans-serif",
                          }}
                        >
                          {slot.time}
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          marginBottom: "0.5rem",
                          gap: 1,
                        }}
                      >
                        <IoMdTime />
                        <Typography
                          sx={{
                            fontWeight: "500",
                            fontFamily: "Poppins, sans-serif",
                          }}
                          variant="body2"
                          fontWeight="bold"
                        >
                          {slot.duration}
                        </Typography>
                      </Box>
                      {/* <Box sx={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem', gap: 1 }}>
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
                      </Box> */}
                    </CardContent>
                  </Card>
                </Grid>
              ))
            ) : (
              <Grid item xs={12}>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '200px',
                    width: '100%',
                    bgcolor: '#f5f5f5',
                    borderRadius: '10px',
                  }}
                >
                  <Typography
                    variant="h6"
                    color="textSecondary"
                    sx={{
                      fontFamily: "Poppins, sans-serif",
                      textAlign: "center",
                    }}
                  >
                    {selectedDate
                      ? `No availability for ${selectedDate.format('MMMM D, YYYY')}`
                      : 'No upcoming availability'}
                  </Typography>
                </Box>
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>
    </div>
  );
};

export default Availability;
