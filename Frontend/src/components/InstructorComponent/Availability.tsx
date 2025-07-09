import React, { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Box,
  Skeleton,
  IconButton,
  Chip,
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
import {
  fallbackInstructor,
  fallbackTariff,
  HourSlot,
} from "../../types/HourSlots";

import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import HourSlotModal from "../StudentComponents/HourSlotModal";
import { getDurationInHours } from "../../utils/HourSlotsUtills";
import { IoTimeOutline } from "react-icons/io5";
import { Slot } from "../../types/Student";
import { GET_INSTRUCTOR_PROFILE } from "../../graphql/mutations/instructorPublic";
import { useQuery } from "@apollo/client";

// Types for Availability
interface AvailabilitySlot {
  _id: string;
  date: string;
  startTime: string;
  endTime: string;
  booked: boolean;
  status: string;
}

interface AvailabilityProps {
  availabilityData: AvailabilitySlot[];
  loading: boolean;
  onSelectAvailability?: (availability: AvailabilitySlot[]) => void;
  selectedPackage?: {
    startDate: string;
    endDate: string;
    lessons: number;
  } | null;
  instructorData: string;
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
  selectedPackage,
  instructorData,
}) => {
  const { error, data } = useQuery(GET_INSTRUCTOR_PROFILE, {
    variables: { id: instructorData || "" },
    errorPolicy: "all",
    fetchPolicy: "cache-and-network", // Ensures fresh data
  });

  const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs | null>(null);
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSlotForModal, setSelectedSlotForModal] = useState<any>(null);
  const [hourSlotLoading, setHourSlotLoading] = useState(false);
  const navigate = useNavigate();

  const instructor =
    data?.getInstructorPublicProfile?.instructor || fallbackInstructor;
  const tariff = data?.getInstructorPublicProfile?.tariff || fallbackTariff;
  // Create an array of available dates from availabilityData
  const availableDates = useMemo(() => {
    return availabilityData
      .filter((slot) => dayjs(slot.date).isAfter(dayjs(), "day"))
      .map((slot) => dayjs(slot.date));
  }, [availabilityData]);

  const calculateDuration = (startTime: string, endTime: string) => {
    const start = dayjs(`2000-01-01 ${startTime}`);
    const end = dayjs(`2000-01-01 ${endTime}`);
    const hours = end.diff(start, "hour", true);

    // Round to nearest 0.5 hour and format
    const roundedHours = Math.round(hours * 2) / 2;
    const hoursText = roundedHours === 1 ? "hr" : "hrs";
    return `${roundedHours.toFixed(1)} ${hoursText} lesson`;
  };

  // Filter slots based on selected date
  const transformedSlots = useMemo(() => {
    const availability = data?.getInstructorPublicProfile?.availability || [];

    return availability
      .filter((slot: any) => {
        // Filter out past dates
        if (dayjs(slot.date).isBefore(dayjs(), "day")) return false;

        // If package selected, only show slots before or on the end date
        if (selectedPackage?.endDate) {
          const slotDate = dayjs(slot.date);
          const packageEnd = dayjs(Number(selectedPackage.endDate));
          return (
            slotDate.isSame(packageEnd, "day") ||
            slotDate.isBefore(packageEnd, "day")
          );
        }

        // If date selected, show slots for that date
        if (selectedDate) {
          return dayjs(slot.date).isSame(selectedDate, "day");
        }

        // Otherwise show all future slots
        return true;
      })
      .map((slot: any) => ({
        id: slot._id,
        time: `${slot.startTime} - ${slot.endTime}`,
        duration: calculateDuration(slot.startTime, slot.endTime),
        date: slot.date,
        booked: slot.hourlySlots?.every((hSlot: any) => hSlot.booked) || false,
        hourlySlots: slot.hourlySlots || [],
      }));
  }, [data, selectedDate, selectedPackage]);

  // Custom date validation
  const shouldDisableDate = (date: dayjs.Dayjs) => {
    const isPastDate = date.isBefore(dayjs(), "day");
    const isAvailable = availableDates.some((availableDate) =>
      availableDate.isSame(date, "day")
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

  // Add package info message
  const renderPackageInfo = () => {
    if (!selectedPackage) return null;

    return (
      <Typography
        sx={{
          fontFamily: "Poppins, sans-serif",
          color: "#5FC2D3",
          mb: 2,
        }}
      >
        {`Selected package: ${selectedPackage.lessons} lessons before

        ${dayjs(Number(selectedPackage.endDate)).format("MMM D, YYYY")}`}
      </Typography>
    );
  };
  const handleSelectHours = (slot: Slot) => {
    setSelectedSlotForModal(slot);
    setModalOpen(true);
  };

  // Add this function to handle hour slot confirmation
  const handleHourSlotConfirm = async (selectedHourSlots: HourSlot[]) => {
    setHourSlotLoading(true);

    try {
      // Convert hour slots back to availability format for consistency
      const formattedAvailability = selectedHourSlots.map((hourSlot) => ({
        _id: hourSlot.id,
        date: hourSlot.date,
        startTime: hourSlot.startTime,
        endTime: hourSlot.endTime,
      }));

      // Call your existing handleBookNow logic
      if (formattedAvailability.length === 0) {
        toast.error("Please select an availability slot before booking.");
        return;
      }

      if (location.pathname.includes("/student-dashboard/search")) {
        navigate("/student-dashboard/book", {
          state: {
            instructorId: instructorData,
            selectedAvailability: formattedAvailability,
            instructorData: {
              id: instructor._id,
              name: `${instructor.firstName} ${instructor.lastName}`,
              email: instructor.email,
              description: instructor.description,
              lessonFee: tariff.lessonFee,
              lessonDiscount: tariff.lessonDiscount,
              discountStartDate: tariff.discountStartDate,
              discountEndDate: tariff.discountEndDate,
            },
          },
        });
      } else {
        navigate("/auth/signin", {
          state: { from: location.pathname },
          replace: true,
        });
      }
    } catch (error) {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setHourSlotLoading(false);
      setModalOpen(false);
    }
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
            <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
              {selectedDate && (
                <IconButton
                  onClick={() => setSelectedDate(null)}
                  size="small"
                  sx={{
                    bgcolor: "#f0f0f0",
                    "&:hover": { bgcolor: "#e0e0e0" },
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
                  views={["year", "month", "day"]}
                  sx={{
                    "& .MuiInputBase-root": {
                      height: "40px",
                      borderRadius: "8px",
                      backgroundColor: "#5fc2d3",
                      "& .MuiInputBase-input": {
                        color: "black",
                        fontWeight: 500,
                        padding: "8px",
                      },
                      "& .MuiOutlinedInput-notchedOutline": {
                        border: "none",
                      },
                    },
                  }}
                  slotProps={{
                    textField: {
                      size: "small",
                      placeholder: "Select date",
                    },
                    day: {
                      sx: (ownerState: any) => {
                        const day = ownerState.day as dayjs.Dayjs;
                        const isAvailable = availableDates.some((d) =>
                          d.isSame(day, "day")
                        );

                        // Base overrides for every day cell
                        const base: any = {
                          "&.MuiPickersDay-root": {
                            borderRadius: "50%",
                            // Highlight today with a subtle outline
                            '&[aria-current="date"]': {
                              border: "2px solid #5fc2d3 !important",
                            },
                            // Selected state
                            "&.Mui-selected": {
                              backgroundColor: "#5fc2d3 !important",
                              color: "#fff !important",
                              "&:hover": {
                                backgroundColor: "#4bb1c2 !important",
                              },
                            },
                          },
                        };

                        // If it's in your availableDates array, merge in these overrides:
                        if (isAvailable) {
                          return {
                            ...base,
                            "&.MuiPickersDay-root": {
                              ...base["&.MuiPickersDay-root"],
                              color: "#00966D !important", // force green text
                              fontWeight: 700,
                              border: "2px solid #00966D !important", // strong green border
                              backgroundColor: "rgba(0,150,110,0.1) !important", // faint bg
                              "&:hover": {
                                backgroundColor: "#d1f0f7 !important",
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
          {renderPackageInfo()}
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
                        <CalendarCheck2
                          size={18}
                          style={{ color: "#25D422" }}
                        />
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
                          justifyContent: "space-between",
                          marginBottom: "0.5rem",
                        }}
                      >
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
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

                        {/* Add hour selection button for multi-hour slots */}
                        {getDurationInHours(slot.time) > 1 && (
                          <Chip
                            icon={<IoTimeOutline size={14} />}
                            label="Select Hours"
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent card click
                              handleSelectHours(slot);
                            }}
                            sx={{
                              backgroundColor: "#e0f2fe",
                              color: "#0369a1",
                              fontSize: "11px",
                              fontFamily: "Poppins, sans-serif",
                              fontWeight: "500",
                              height: "24px",
                              cursor: "pointer",
                              "&:hover": {
                                backgroundColor: "#bae6fd",
                              },
                            }}
                          />
                        )}
                      </Box>
                    </CardContent>
                  </Card>

                  <HourSlotModal
                    open={modalOpen}
                    onClose={() => setModalOpen(false)}
                    onConfirm={handleHourSlotConfirm}
                    originalSlot={
                      selectedSlotForModal || {
                        id: "",
                        time: "",
                        duration: "",
                        date: "",
                        booked: false,
                      }
                    }
                    loading={hourSlotLoading}
                  />
                </Grid>
              ))
            ) : (
              <Grid item xs={12}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    height: "200px",
                    width: "100%",
                    bgcolor: "#f5f5f5",
                    borderRadius: "10px",
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
                      ? `No availability for ${selectedDate.format("MMMM D, YYYY")}`
                      : "No upcoming availability"}
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
