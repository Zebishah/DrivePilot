import React, { useState, useMemo } from "react";
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Badge,
  Divider,
  InputLabel,
  CircularProgress,
  Alert,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DateCalendar } from "@mui/x-date-pickers/DateCalendar";
import { TimePicker } from "@mui/x-date-pickers/TimePicker";
import { PickersDay, PickersDayProps } from "@mui/x-date-pickers/PickersDay";
import {
  format,
  isAfter,
  startOfDay,
  isSameDay,
  isBefore,
  isToday,
  addMinutes,
  differenceInMinutes,
} from "date-fns";
import { useQuery, useMutation } from "@apollo/client";
import {
  GET_TEACHER_AVAILABILITY,
  ADD_AVAILABILITY_SLOT,
  DELETE_AVAILABILITY_SLOT,
} from "../../../../graphql/mutations/availability";
import { GET_TEACHER_PROFILE } from "../../../../graphql/mutations/profile";
import { toast } from "react-hot-toast";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";

interface AvailabilitySlot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  booked?: boolean; // Optional, depending on your schema
}

// Custom day component to show slots count

export function CustomDay(
  props: PickersDayProps<Date> & {
    highlightedDays?: { date: string; count: number }[];
  }
) {
  const { highlightedDays = [], day, outsideCurrentMonth, ...other } = props;

  // Find the slot count for this day
  const slotCount =
    highlightedDays.find((highlight) =>
      isSameDay(new Date(highlight.date + "T00:00:00"), day)
    )?.count || 0;

  return (
    <Badge
      overlap="circular"
      badgeContent={slotCount > 0 ? slotCount : undefined} // Only show badge if count > 0
      sx={{
        "& .MuiBadge-badge": {
          background: "linear-gradient(135deg, #7C3AED, #EC4899)",
          color: "white",
          right: 8,
          top: 8,
          minWidth: "20px",
          height: "20px",
          padding: "0 4px",
          fontSize: "0.75rem",
        },
      }}
    >
      <PickersDay
        {...other}
        outsideCurrentMonth={outsideCurrentMonth}
        day={day}
        sx={{
          borderRadius: "8px",
          "&.MuiPickersDay-root": {
            fontSize: "0.875rem",
            width: "40px",
            height: "40px",
            margin: "2px",
          },
          ...(slotCount > 0 && {
            backgroundColor: "rgba(94, 194, 210, 0.1)",
            "&:hover": {
              backgroundColor: "rgba(94, 194, 210, 0.2)",
            },
          }),
        }}
      />
    </Badge>
  );
}

export const AvailabilityTab: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [isAddSlotOpen, setIsAddSlotOpen] = useState(false);
  const [isAddingSlot, setIsAddingSlot] = useState(false);
  const [isDeletingSlot, setIsDeletingSlot] = useState<string | null>(null);
  const [isRangeMode, setIsRangeMode] = useState(false);

  const today = startOfDay(new Date());

  // Fetch Stripe/payment status so we can gate availability creation
  const { data: profileData } = useQuery(GET_TEACHER_PROFILE, {
    fetchPolicy: "cache-first",
  });
  const onboardingStatus =
    profileData?.teacherProfile?.onboardingStatus ?? null;
  const stripeIsActive = profileData?.teacherProfile?.isActive ?? false;
  const isPaymentReady =
    stripeIsActive && onboardingStatus === "verified";

  const { data, loading, refetch } = useQuery(GET_TEACHER_AVAILABILITY, {
    variables: { month: format(selectedDate || new Date(), "yyyy-MM-dd") },
    fetchPolicy: "network-only", // Don't use cache
    notifyOnNetworkStatusChange: true, // To show loading state during refetch
  });

  // Group slots by date and count them
  const highlightedDays = useMemo(() => {
    if (!data?.teacherAvailability) return [];

    return data.teacherAvailability.map((availability) => ({
      date: format(new Date(availability.date), "yyyy-MM-dd"),
      count: availability.availableSlots.length,
    }));
  }, [data?.teacherAvailability]);

  const [addSlot] = useMutation(ADD_AVAILABILITY_SLOT, {
    onCompleted: () => {
      toast.success("Availability slot added successfully");
      setIsAddingSlot(false);
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to add availability slot: ${error.message}`);
      setIsAddingSlot(false);
    },
  });
  const [deleteSlot] = useMutation(DELETE_AVAILABILITY_SLOT, {
    onCompleted: () => {
      toast.success("Slot deleted successfully");
      setIsDeletingSlot(null);
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to delete slot: ${error.message}`);
      setIsDeletingSlot(null);
    },
  });

  const handleDateChange = (date: Date | null) => {
    if (date && isBefore(startOfDay(date), today)) {
      toast.error("Cannot select past dates");
      return;
    }
    setSelectedDate(date);
  };

  const handleCalendarDateClick = (date: Date | null) => {
    if (!isPaymentReady) {
      toast.error(
        "Complete Stripe payment setup before adding availability slots."
      );
      return;
    }
    handleDateChange(date);
    setIsAddSlotOpen(true);
  };

  const handleAddButtonClick = () => {
    if (!isPaymentReady) {
      toast.error(
        "Complete Stripe payment setup before adding availability slots."
      );
      return;
    }
    setSelectedDate(null);
    setStartTime(null);
    setEndTime(null);
    setIsRangeMode(false);
    setIsAddSlotOpen(true);
  };

  const handleAddSlot = async () => {
    if (!selectedDate || !startTime) {
      toast.error("Please fill in all fields");
      return;
    }

    let effectiveEndTime: Date | null = endTime;

    if (isRangeMode) {
      if (!endTime) {
        toast.error("Please select an end time in range mode");
        return;
      }

      if (isAfter(startTime, endTime)) {
        toast.error("Start time must be before end time");
        return;
      }

      const minutesDiff = differenceInMinutes(endTime, startTime);
      if (minutesDiff < 120) {
        toast.error(
          "Please select a minimum range of 2 hours when using range mode."
        );
        return;
      }
    } else {
      // Single-slot mode: automatically create a 1-hour slot
      const oneHourLater = addMinutes(startTime, 60);
      effectiveEndTime = oneHourLater;
      setEndTime(oneHourLater);
    }

    if (!effectiveEndTime) {
      toast.error("End time could not be determined");
      return;
    }

    // Additional check for today's time slots
    if (isToday(selectedDate)) {
      const now = new Date();
      if (isBefore(startTime, now)) {
        toast.error("Start time must be in the future for today");
        return;
      }
    }

    setIsAddingSlot(true);

    try {
      await addSlot({
        variables: {
          input: {
            date: format(selectedDate, "yyyy-MM-dd"),
            startTime: format(startTime, "HH:mm"),
            endTime: format(effectiveEndTime, "HH:mm"),
            status: "available",
          },
        },
      });

      handleReset();
      setIsAddSlotOpen(false);
    } catch (error) {
      // Error handled by mutation onError callback
      console.error("Error adding slot:", error);
      toast.error("Failed to add slot");
    }
  };

  const handleReset = () => {
    // setSelectedDate(null);
    setStartTime(null);
    setEndTime(null);
    setIsRangeMode(false);
  };

  const handleDeleteSlot = async (id: string) => {
    setIsDeletingSlot(id);
    try {
      await deleteSlot({
        variables: { id },
      });
      await refetch();
      toast.success("Slot deleted successfully");
    } catch {
      toast.error("Failed to delete slot");
    }
  };
  const filteredSlots = useMemo(() => {
    if (!data?.teacherAvailability || !Array.isArray(data.teacherAvailability))
      return [];

    // If no date is selected, show all slots
    if (!selectedDate) return data.teacherAvailability;

    // If a date is selected, filter for that date
    const formattedSelectedDate = format(selectedDate, "yyyy-MM-dd");

    return data.teacherAvailability.filter((slot: AvailabilitySlot) => {
      try {
        // Handle possible invalid date formats more safely
        const slotDate = slot.date ? slot.date.substring(0, 10) : ""; // Get YYYY-MM-DD format
        return slotDate === formattedSelectedDate;
      } catch (err) {
        console.error("Error filtering date:", err, slot);
        return false; // Skip invalid slots
      }
    });
  }, [data?.teacherAvailability, selectedDate]);

  const displaySlots = useMemo(() => {
    if (!filteredSlots.length) return [];

    const now = new Date();
    const today = format(now, "yyyy-MM-dd");

    // Flatten all availableSlots from each teacherAvailability record
    const allSlots = filteredSlots.flatMap((record) =>
      record.availableSlots.map((slot) => ({
        ...slot,
        date: record.date, // attach parent date
        teacherStatus: record.status, // optional if needed
      }))
    );

    // Filter out past slots
    const validSlots = allSlots.filter((slot) => {
      if (!slot.date || !slot.endTime) return false;

      const slotDate = format(new Date(slot.date), "yyyy-MM-dd");

      // ❌ Skip past days entirely
      if (isBefore(new Date(slotDate), startOfDay(now))) return false;

      // 🕒 For today's slots, hide past ones
      if (slotDate === today) {
        const [endHours, endMinutes] = slot.endTime.split(":").map(Number);
        const slotEndTime = new Date(slotDate);
        slotEndTime.setHours(endHours, endMinutes, 0, 0);

        return isAfter(slotEndTime, now); // ✅ Keep only if slot ends in future
      }

      // ✅ Keep all future slots
      return true;
    });

    // Sort by date and start time
    return validSlots.sort((a, b) => {
      try {
        const dateA = a.date || "";
        const dateB = b.date || "";
        const dateComparison = dateA.localeCompare(dateB);
        if (dateComparison !== 0) return dateComparison;

        const startTimeA = a.startTime || "";
        const startTimeB = b.startTime || "";
        return startTimeA.localeCompare(startTimeB);
      } catch (err) {
        console.error("Error sorting slots:", err);
        return 0;
      }
    });
  }, [filteredSlots]);

  const scheduleSummary = useMemo(() => {
    const days = new Set(displaySlots.map((slot) => String(slot.date).slice(0, 10))).size;
    const minutes = displaySlots.reduce((total, slot) => {
      const [startHour, startMinute] = String(slot.startTime || "00:00").split(":").map(Number);
      const [endHour, endMinute] = String(slot.endTime || "00:00").split(":").map(Number);
      const duration = (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
      return total + (Number.isFinite(duration) && duration > 0 ? duration : 0);
    }, 0);
    return { days, hours: Math.round((minutes / 60) * 10) / 10 };
  }, [displaySlots]);

  return (
    <Box className="dsp-availability-tab" sx={{ p: 2 }}>
      <Box className="dsp-availability-summary" aria-label="Availability summary">
        <div className="dsp-summary-card dsp-summary-card--blue"><span className="dsp-summary-card__icon"><EventAvailableIcon fontSize="small" /></span><span className="dsp-summary-card__label">Open slots</span><strong>{displaySlots.length}</strong><small>Future slots currently visible</small></div>
        <div className="dsp-summary-card dsp-summary-card--violet"><span className="dsp-summary-card__icon"><CalendarMonthIcon fontSize="small" /></span><span className="dsp-summary-card__label">Available days</span><strong>{scheduleSummary.days}</strong><small>Days represented by your schedule</small></div>
        <div className="dsp-summary-card dsp-summary-card--neutral"><span className="dsp-summary-card__icon"><AccessTimeIcon fontSize="small" /></span><span className="dsp-summary-card__label">Scheduled hours</span><strong>{scheduleSummary.hours}h</strong><small>Calculated from available slots</small></div>
      </Box>
      <Grid container spacing={3}>
        {/* Calendar Section */}
        <Grid item xs={12} lg={9}>
          <Card
            elevation={0}
            sx={{
              borderRadius: 2,
              border: "1px solid #e0e0e0",
              height: "100%",
            }}
          >
            <CardContent sx={{ p: 2, height: "100%" }}>
              <Typography
                variant="h6"
                sx={{
                  mb: 1,
                  fontWeight: 600,
                  color: "#2c3e50",
                  fontSize: "1.25rem",
                }}
              >
                Calendar
              </Typography>
              {!isPaymentReady && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  You need to complete Stripe onboarding and have payments
                  enabled before you can publish new availability. Go to
                  <strong> Payment Management</strong> to finish
                  setup.
                </Alert>
              )}
              <Divider sx={{ mb: 2 }} />
              <Box
                sx={{
                  width: "100%",
                  display: "flex",
                  justifyContent: "center",
                  "& .MuiDateCalendar-root": {
                    width: "100%",
                    maxHeight: "none",
                  },
                }}
              >
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DateCalendar
                    value={selectedDate}
                    onChange={handleCalendarDateClick}
                    minDate={today}
                    slots={{
                      day: (props) => (
                        <CustomDay
                          {...props}
                          highlightedDays={highlightedDays}
                        />
                      ),
                    }}
                    sx={{
                      width: "100%",
                      maxWidth: "none",
                      maxHeight: "none",
                      "& .MuiPickersCalendarHeader-root": {
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        paddingLeft: "16px",
                        paddingRight: "16px",
                        marginTop: "8px",
                        marginBottom: "16px",
                      },
                      "& .MuiPickersCalendarHeader-label": {
                        fontSize: "1.1rem",
                        fontWeight: 600,
                        color: "#2c3e50",
                      },
                      "& .MuiDayCalendar-header, & .MuiDayCalendar-weekContainer":
                        {
                          display: "flex",
                          justifyContent: "space-around",
                          maxWidth: "none",
                          width: "100%",
                          margin: 0,
                        },
                      "& .MuiDayCalendar-monthView": {
                        width: "100%",
                        margin: 0,
                      },
                      "& .MuiDayCalendar-weekDayLabel": {
                        fontSize: "0.875rem",
                        color: "#64748b",
                        fontWeight: 600,
                        width: "40px",
                        height: "40px",
                        margin: "2px",
                      },
                      "& .MuiPickersDay-root.Mui-selected": {
                        background: "linear-gradient(135deg, #7C3AED, #EC4899)",
                        color: "white",
                        "&:hover": { background: "linear-gradient(135deg, #6D28D9, #DB2777)" },
                      },
                    }}
                  />
                </LocalizationProvider>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Slots List Section */}
        <Grid item xs={12} lg={3}>
          <Card
            elevation={0}
            sx={{
              borderRadius: 2,
              border: "1px solid #e0e0e0",
              height: "50vh",
              overflowY: "auto",
            }}
          >
            <CardContent>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 2,
                }}
              >
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 600, color: "#2c3e50" }}
                >
                  {selectedDate
                    ? `Slots for ${format(selectedDate, "MMM dd, yyyy")}`
                    : "All Available Slots"}
                </Typography>
                <Box sx={{ display: "flex", gap: 1 }}>
                  {selectedDate && (
                    <Button
                      size="small"
                      onClick={() => setSelectedDate(null)}
                      sx={{
                        fontSize: "0.75rem",
                        textTransform: "none",
                        color: "#64748b",
                        bgcolor: "#f1f5f9",
                        borderRadius: 4,
                        "&:hover": {
                          bgcolor: "#e2e8f0",
                        },
                      }}
                    >
                      Show All
                    </Button>
                  )}
                  <IconButton
                    onClick={handleAddButtonClick}
                    sx={{
                      background: "linear-gradient(135deg, #7C3AED, #EC4899)",
                      color: "white",
                      "&:hover": {
                        background: "linear-gradient(135deg, #6D28D9, #DB2777)",
                        transform: "scale(1.05)",
                      },
                      transition: "all 0.2s ease-in-out",
                    }}
                  >
                    <AddIcon />
                  </IconButton>
                </Box>
              </Box>
              <Divider sx={{ mb: 2 }} />
              {loading ? (
                <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
                  <CircularProgress size={32} sx={{ color: "#8B5CF6" }} />
                </Box>
              ) : displaySlots && displaySlots.length > 0 ? (
                displaySlots.map((slot: AvailabilitySlot) => (
                  <Box
                    key={slot.id}
                    sx={{
                      p: 2,
                      mb: 1.5,
                      border: "1px solid #e0e0e0",
                      borderRadius: 2,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      transition: "all 0.2s ease-in-out",
                      "&:hover": {
                        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                        borderColor: "#A855F7",
                      },
                      opacity: isDeletingSlot === slot.id ? 0.5 : 1,
                      pointerEvents:
                        isDeletingSlot === slot.id ? "none" : "auto",
                    }}
                  >
                    <Box>
                      <Typography
                        variant="subtitle2"
                        sx={{ fontWeight: 600, color: "#2c3e50", mb: 0.5 }}
                      >
                        {(() => {
                          try {
                            // Make sure the date string is valid before formatting
                            const dateObj = new Date(slot.date);
                            if (isNaN(dateObj.getTime())) {
                              return slot.date; // Fall back to raw date if invalid
                            }
                            return format(dateObj, "MMM dd, yyyy");
                          } catch (err) {
                            console.error("Date format error:", err);
                            return slot.date; // Fall back to raw date string on error
                          }
                        })()}
                      </Typography>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <AccessTimeIcon
                          sx={{ fontSize: "1rem", color: "#64748b" }}
                        />
                        <Typography variant="body2" sx={{ color: "#64748b" }}>
                          {slot.startTime} - {slot.endTime}
                        </Typography>
                      </Box>
                    </Box>
                    {isDeletingSlot === slot.id ? (
                      <CircularProgress size={20} sx={{ color: "#ef4444" }} />
                    ) : (
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteSlot(slot.id)}
                        sx={{
                          color: "#ef4444",
                          "&:hover": {
                            bgcolor: "rgba(239, 68, 68, 0.08)",
                          },
                        }}
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Box>
                ))
              ) : (
                <Typography
                  sx={{ p: 2, textAlign: "center", color: "#64748b" }}
                >
                  No availability slots{" "}
                  {selectedDate ? "for this date" : "found"}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Add Slot Dialog */}
      <Dialog
        open={isAddSlotOpen}
        onClose={() => !isAddingSlot && setIsAddSlotOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: 2,
            width: "100%",
            maxWidth: "500px",
          },
        }}
      >
        <DialogTitle
          sx={{
            borderBottom: "1px solid #e0e0e0",
            px: 3,
            py: 2,
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 600, color: "#2c3e50" }}>
            Add Availability Slot
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ p: 3, mt: 2 }}>
          <Box>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  <InputLabel sx={{ fontSize: "16px" }}>Select Date</InputLabel>
                  <DatePicker
                    value={selectedDate}
                    onChange={handleDateChange}
                    minDate={today}
                    shouldDisableDate={(date) =>
                      isBefore(startOfDay(date), today)
                    }
                    disabled={isAddingSlot}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        sx: {
                          "& .MuiOutlinedInput-root": {
                            padding: 1.1,
                            borderRadius: 1.6,
                          },
                        },
                      },
                    }}
                  />
                </Box>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={isRangeMode}
                      onChange={(event) => setIsRangeMode(event.target.checked)}
                      disabled={isAddingSlot}
                    />
                  }
                  label="Select a range of slots"
                />
                <Box sx={{ display: "flex", gap: 2 }}>
                  {/* Start Time */}
                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 1 }}
                  >
                    <InputLabel sx={{ fontSize: "16px" }}>
                      Select Start Time
                    </InputLabel>
                    <TimePicker
                      label="Start Time"
                      value={startTime}
                      onChange={(newValue) => {
                        if (!newValue) {
                          setStartTime(null);
                          if (!isRangeMode) {
                            setEndTime(null);
                          }
                          return;
                        }
                        setStartTime(newValue);
                        if (!isRangeMode) {
                          const oneHourLater = addMinutes(newValue, 60);
                          setEndTime(oneHourLater);
                        }
                      }}
                      disabled={isAddingSlot}
                      ampm={false} // ✅ Force 24-hour format
                      minutesStep={5} // optional: step interval
                      format="HH:mm" // ✅ Show as 24-hour
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          sx: {
                            "& .MuiOutlinedInput-root": {
                              padding: 1.1,
                              borderRadius: 1.6,
                            },
                          },
                        },
                      }}
                    />
                  </Box>

                  {/* End Time - only visible in range mode */}
                  {isRangeMode && (
                    <Box
                      sx={{ display: "flex", flexDirection: "column", gap: 1 }}
                    >
                      <InputLabel sx={{ fontSize: "16px" }}>
                        Select End Time
                      </InputLabel>
                      <TimePicker
                        label="End Time"
                        value={endTime}
                        onChange={(newValue) => {
                          if (newValue) setEndTime(newValue);
                        }}
                        disabled={isAddingSlot}
                        ampm={false} // ✅ 24-hour clock
                        minutesStep={5}
                        format="HH:mm"
                        slotProps={{
                          textField: {
                            fullWidth: true,
                            sx: {
                              "& .MuiOutlinedInput-root": {
                                padding: 1.1,
                                borderRadius: 1.6,
                              },
                            },
                          },
                        }}
                      />
                    </Box>
                  )}
                </Box>
              </Box>
            </LocalizationProvider>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: "1px solid #e0e0e0" }}>
          <Button
            onClick={handleAddSlot}
            variant="contained"
            disabled={!selectedDate || isAddingSlot}
            startIcon={
              isAddingSlot ? (
                <CircularProgress size={20} color="inherit" />
              ) : null
            }
            sx={{
              background: "linear-gradient(135deg, #7C3AED, #EC4899)",
              borderRadius: 2,
              py: 1.3,
              px: 4.6,
              textTransform: "none",
              boxShadow: "none",
              "&:hover": {
                background: "linear-gradient(135deg, #6D28D9, #DB2777)",
                boxShadow: "0 2px 8px rgba(124, 58, 237, 0.25)",
              },
            }}
          >
            {isAddingSlot ? "Adding..." : "Add Slot"}
          </Button>
          <Button
            onClick={() => {
              if (!isAddingSlot) {
                handleReset();
              }
            }}
            disabled={isAddingSlot}
            variant="outlined"
            sx={{
              borderRadius: 2,
              textTransform: "none",
              borderColor: "#e0e0e0",
              py: 1.3,
              px: 4.6,
              color: "#64748b",
              "&:hover": {
                borderColor: "#cbd5e1",
                bgcolor: "rgba(203, 213, 225, 0.08)",
              },
            }}
          >
            Reset
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
