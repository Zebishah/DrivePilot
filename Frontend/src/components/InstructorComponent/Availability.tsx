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
import { useNavigate, useParams } from "react-router-dom";
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
}) => {
  const { id: instructorData } = useParams<{ id: string }>();
  const {
    data,
    loading: queryLoading,
    error,
  } = useQuery(GET_INSTRUCTOR_PROFILE, {
    variables: { id: instructorData },
    skip: !instructorData,
    fetchPolicy: "network-only",
  });

  const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs | null>(null);
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDayData, setSelectedDayData] = useState<any>(null);
  const [hourSlotLoading, setHourSlotLoading] = useState(false);
  const navigate = useNavigate();

  // Debug logs
  console.log("Query data:", data);
  console.log("Query loading:", queryLoading);
  console.log("Query error:", error);

  const instructor =
    data?.getInstructorPublicProfile?.instructor || fallbackInstructor;

  const tariff = data?.getInstructorPublicProfile?.tariff || fallbackTariff;

  // Create an array of available dates from availabilityData
  const availableDates = useMemo(() => {
    const availabilityList =
      data?.getInstructorPublicProfile?.availability || [];

    return availabilityList
      .filter(
        (day: any) =>
          dayjs(day.date).isAfter(dayjs(), "day") ||
          dayjs(day.date).isSame(dayjs(), "day")
      )
      .map((day: any) => dayjs(day.date));
  }, [data]);

  const calculateDuration = (startTime: string, endTime: string) => {
    const start = dayjs(`2000-01-01 ${startTime}`);
    const end = dayjs(`2000-01-01 ${endTime}`);
    const hours = end.diff(start, "hour", true);

    // Round to nearest 0.5 hour and format
    const roundedHours = Math.round(hours * 2) / 2;
    const hoursText = roundedHours === 1 ? "hr" : "hrs";
    return `${roundedHours.toFixed(1)} ${hoursText}`;
  };

  // Group availability by date - show one card per date
  const groupedAvailability = useMemo(() => {
    const availabilityList =
      data?.getInstructorPublicProfile?.availability || [];

    return availabilityList
      .filter((day: any) => {
        const dayDate = dayjs(day.date);

        // Skip past days
        if (dayDate.isBefore(dayjs(), "day")) return false;

        // Filter by selected package end date
        if (selectedPackage?.endDate) {
          const packageEnd = dayjs(Number(selectedPackage.endDate));
          return (
            dayDate.isSame(packageEnd, "day") ||
            dayDate.isBefore(packageEnd, "day")
          );
        }

        // Filter by date picker selection
        if (selectedDate) {
          return dayDate.isSame(selectedDate, "day");
        }

        return true;
      })
      .map((day: any) => {
        const slots = day.availableSlots || [];
        const availableCount = slots.filter((s: any) => !s.booked).length;

        // Calculate total time range
        const times = slots.map((s: any) => ({
          start: dayjs(`2000-01-01 ${s.startTime}`),
          end: dayjs(`2000-01-01 ${s.endTime}`),
        }));

        const earliestStart = times.reduce(
          (min, t) => (t.start.isBefore(min) ? t.start : min),
          times[0]?.start
        );
        const latestEnd = times.reduce(
          (max, t) => (t.end.isAfter(max) ? t.end : max),
          times[0]?.end
        );

        const totalDuration = calculateDuration(
          earliestStart?.format("HH:mm") || "00:00",
          latestEnd?.format("HH:mm") || "00:00"
        );

        return {
          id: day.id,
          date: day.date,
          formattedDate: dayjs(day.date).format("MMMM D, YYYY"),
          availableSlots: slots,
          availableCount,
          timeRange: `${earliestStart?.format("HH:mm")} - ${latestEnd?.format(
            "HH:mm"
          )}`,
          totalDuration,
        };
      });
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
      <SlCalender style={{ color: "var(--ws-ink, #000000)" }} />
    </CalendarIconButton>
  ));

  const handleDayCardClick = (dayData: any) => {
    setSelectedDayData(dayData);
    setModalOpen(true);
  };

  // Add package info message
  const renderPackageInfo = () => {
    if (!selectedPackage) return null;

    return (
      <Typography
        sx={{
          fontFamily: "Poppins, sans-serif",
          color: "var(--ws-primary-ink, #5FC2D3)",
          mb: 2,
        }}
      >
        {`Selected package: ${selectedPackage.lessons} lessons before ${dayjs(
          Number(selectedPackage.endDate)
        ).format("MMM D, YYYY")}`}
      </Typography>
    );
  };

  // Handle hour slot confirmation
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

      if (formattedAvailability.length === 0) {
        toast.error("Please select an availability slot before booking.");
        return;
      }

      if (location.pathname.includes("/student-dashboard/search")) {
        const paymentData = {
          type: "card",
          cardNumber: "5105 **** **** 0505",
        };

        navigate("/student-dashboard/booking-details", {
          state: {
            selectedAvailability: formattedAvailability,
            instructorData,
            paymentMethod: paymentData,
            isCurrentBooking: true,
            bookedLessonFee: tariff.lessonFee,
            bookedLessonDiscount: tariff.lessonDiscount,
            FinalPricePerLesson: tariff.FinalPricePerLesson,
            instructorId: instructorData,
            name: `${instructor.firstName} ${instructor.lastName}`,
            email: instructor.email,
            description: instructor.description,
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
  if (loading || queryLoading) {
    return (
      <Card
        className="dsp-booking-availability__empty"
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
  if (!loading && groupedAvailability.length === 0) {
    return (
      <Card
        id="dsp-availability-section"
        className="dsp-booking-availability__empty"
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
    <div id="dsp-availability-section" className="dsp-booking-availability">
      <Card
        className="dsp-booking-availability__surface"
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
                    bgcolor: "var(--ws-surface, #f0f0f0)",
                    "&:hover": { bgcolor: "var(--ws-surface-muted, #e0e0e0)" },
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
                      backgroundColor: "var(--ws-primary, #5fc2d3)",
                      "& .MuiInputBase-input": {
                        color: "var(--ws-ink, #000000)",
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
                      className: "dsp-booking-availability__date-picker",
                    },
                    day: {
                      sx: (ownerState: any) => {
                        const day = ownerState.day as dayjs.Dayjs;
                        const isAvailable = availableDates.some((d) =>
                          d.isSame(day, "day")
                        );

                        const base: any = {
                          "&.MuiPickersDay-root": {
                            borderRadius: "50%",
                            '&[aria-current="date"]': {
                              border: "2px solid var(--ws-primary, #5fc2d3) !important",
                            },
                            "&.Mui-selected": {
                              backgroundColor: "var(--ws-primary, #5fc2d3) !important",
                              color: "#fff !important",
                              "&:hover": {
                                backgroundColor: "var(--ws-primary, #4bb1c2) !important",
                              },
                            },
                          },
                        };

                        if (isAvailable) {
                          return {
                            ...base,
                            "&.MuiPickersDay-root": {
                              ...base["&.MuiPickersDay-root"],
                              color: "var(--ws-success, #00966D) !important",
                              fontWeight: 700,
                              border: "2px solid var(--ws-success-border, #00966D) !important",
                              backgroundColor: "rgba(0,150,110,0.1) !important",
                              "&:hover": {
                                backgroundColor: "var(--ws-info-soft, #d1f0f7) !important",
                              },
                            },
                          };
                        }

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
            Select Available Days
          </Typography>
          <Typography
            variant="body2"
            color="textSecondary"
            sx={{ fontFamily: "Poppins, sans-serif", mt: 0.5 }}
          >
            Select a date to view and choose its available one-hour time slots.
          </Typography>
          <Grid container spacing={2} marginTop={2}>
            {groupedAvailability.length > 0 ? (
              groupedAvailability.map((dayData) => (
                <Grid item xs={12} sm={6} md={3} key={dayData.id}>
                  <Card
                    className="dsp-booking-availability__day"
                    onClick={() => handleDayCardClick(dayData)}
                    sx={{
                      borderRadius: "10px",
                      backgroundColor: "#FFC80133",
                      border: "1px solid var(--ws-info-border, #cce4f7)",
                      boxShadow: 1,
                      width: "100%",
                      cursor: "pointer",
                      transition: "transform 0.2s, box-shadow 0.2s",
                      "&:hover": {
                        transform: "scale(1.02)",
                        boxShadow: "0px 0px 10px rgba(0, 0, 0, 0.15)",
                      },
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
                          style={{ color: "var(--ws-primary-ink, #7C3AED)" }}
                        />
                        <Typography
                          variant="body1"
                          sx={{
                            fontWeight: "600",
                            fontFamily: "Poppins, sans-serif",
                          }}
                        >
                          {dayData.formattedDate}
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
                        <FaRegCheckCircle style={{ color: "var(--ws-primary-ink, #7C3AED)" }} />
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: "500",
                            fontFamily: "Poppins, sans-serif",
                          }}
                        >
                          {dayData.timeRange}
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
                          >
                            {dayData.totalDuration}
                          </Typography>
                        </Box>

                        <Chip
                          label={`${dayData.availableCount} slots`}
                          sx={{
                            backgroundColor: "var(--ws-surface-muted, #e0f2fe)",
                            color: "var(--ws-info, #0369a1)",
                            fontSize: "11px",
                            fontFamily: "Poppins, sans-serif",
                            fontWeight: "500",
                            height: "24px",
                          }}
                        />
                      </Box>
                    </CardContent>
                  </Card>
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
                    bgcolor: "var(--ws-surface, #f5f5f5)",
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
                      ? `No availability for ${selectedDate.format(
                          "MMMM D, YYYY"
                        )}`
                      : "No upcoming availability"}
                  </Typography>
                </Box>
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>

      {/* Modal for showing hourly slots */}
      <HourSlotModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={handleHourSlotConfirm}
        originalSlot={
          selectedDayData || {
            id: "",
            date: "",
            formattedDate: "",
            availableSlots: [],
            timeRange: "",
            totalDuration: "",
          }
        }
        loading={hourSlotLoading}
      />
    </div>
  );
};

export default Availability;
