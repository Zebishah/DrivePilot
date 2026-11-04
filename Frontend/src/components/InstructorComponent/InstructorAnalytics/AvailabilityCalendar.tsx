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
} from "date-fns";
import { useQuery, useMutation } from "@apollo/client";

import { toast } from "react-hot-toast";

import {
  ADD_AVAILABILITY_SLOT,
  DELETE_AVAILABILITY_SLOT,
  GET_TEACHER_AVAILABILITY,
} from "../../../graphql/mutations/availability";

interface AvailabilitySlot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  booked?: boolean; // Optional, depending on your schema
}

// Custom day component to show slots count
function CustomDay(
  props: PickersDayProps<Date> & {
    highlightedDays?: { date: string; count: number }[];
  }
) {
  const { highlightedDays = [], day, outsideCurrentMonth, ...other } = props;

  const isHighlighted = highlightedDays.some((highlight) =>
    isSameDay(new Date(highlight.date + "T00:00:00"), day)
  );

  const slotCount =
    highlightedDays.find((highlight) =>
      isSameDay(new Date(highlight.date + "T00:00:00"), day)
    )?.count || 0;

  return (
    <Badge
      overlap="circular"
      badgeContent={isHighlighted ? slotCount : undefined}
      sx={{
        "& .MuiBadge-badge": {
          backgroundColor: "var(--ws-primary, #5ec2d2)",
          color: "var(--ws-on-primary, #ffffff)",
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
          ...(isHighlighted && {
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

export const AvailabilityTabOverview: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [isAddSlotOpen, setIsAddSlotOpen] = useState(false);
  const [isAddingSlot, setIsAddingSlot] = useState(false);
  const [isDeletingSlot, setIsDeletingSlot] = useState<string | null>(null);

  const today = startOfDay(new Date());

  const { data, loading, refetch } = useQuery(GET_TEACHER_AVAILABILITY, {
    variables: { month: format(selectedDate || new Date(), "yyyy-MM-dd") },
    fetchPolicy: "network-only", // Don't use cache
    notifyOnNetworkStatusChange: true, // To show loading state during refetch
  });

  // Group slots by date and count them
  const highlightedDays = useMemo(() => {
    if (!data?.teacherAvailability) return [];

    const groupedSlots = data.teacherAvailability.reduce(
      (acc: { [key: string]: number }, slot: AvailabilitySlot) => {
        // Ensure we're using the date in local timezone
        const date = new Date(slot.date);
        const localDate = format(date, "yyyy-MM-dd");
        acc[localDate] = (acc[localDate] || 0) + 1;
        return acc;
      },
      {}
    );

    return Object.entries(groupedSlots).map(([date, count]) => ({
      date,
      count: count as number,
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
    handleDateChange(date);
    setIsAddSlotOpen(true);
  };

  const handleAddButtonClick = () => {
    setSelectedDate(null);
    setStartTime(null);
    setEndTime(null);
    setIsAddSlotOpen(true);
  };

  const handleAddSlot = async () => {
    if (!selectedDate || !startTime || !endTime) {
      toast.error("Please fill in all fields");
      return;
    }

    if (isAfter(startTime, endTime)) {
      toast.error("Start time must be before end time");
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
            endTime: format(endTime, "HH:mm"),
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
  };

  const handleDeleteSlot = async (id: string) => {
    setIsDeletingSlot(id);
    try {
      await deleteSlot({
        variables: { id },
      });
      await refetch();
      toast.success("Slot deleted successfully");
    } catch (error) {
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

  // Sort slots chronologically if showing all slots
  const displaySlots = useMemo(() => {
    if (!filteredSlots.length) return [];

    return [...filteredSlots].sort((a, b) => {
      try {
        // First compare by date - safely handle missing properties
        const dateA = a.date || "";
        const dateB = b.date || "";
        const dateComparison = dateA.localeCompare(dateB);
        if (dateComparison !== 0) return dateComparison;

        // Then compare by start time if dates are the same
        const startTimeA = a.startTime || "";
        const startTimeB = b.startTime || "";
        return startTimeA.localeCompare(startTimeB);
      } catch (err) {
        console.error("Error sorting slots:", err);
        return 0; // Keep original order on error
      }
    });
  }, [filteredSlots]);

  return (
    <div className="h-full">
      <Box sx={{ height: "100%" }}>
        <Grid container sx={{ height: "100%" }}>
          {/* Calendar Section */}
          <Grid item xs={12} lg={12} sx={{ height: "100%" }}>
            <Card
              elevation={0}
              sx={{
                borderRadius: 2,
                border: "1px solid var(--ws-border, #e0e0e0)",
                height: "100%",
              }}
            >
              <CardContent sx={{ p: 2, height: "100%" }}>
                <Typography
                  variant="h6"
                  sx={{
                    mb: 1,
                    fontWeight: 600,
                    color: "var(--ws-info, #2c3e50)",
                    fontSize: "1.25rem",
                  }}
                >
                  Calendar
                </Typography>
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
                        maxHeight: "100%",
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
                          color: "var(--ws-info, #2c3e50)",
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
                          color: "var(--ws-muted, #64748b)",
                          fontWeight: 600,
                          width: "40px",
                          height: "40px",
                          margin: "2px",
                        },
                        "& .MuiPickersDay-root.Mui-selected": {
                          backgroundColor: "var(--ws-primary, #5ec2d2)",
                          color: "var(--ws-on-primary, #ffffff)",
                          "&:hover": { backgroundColor: "var(--ws-primary, #4ba1b0)" },
                        },
                      }}
                    />
                  </LocalizationProvider>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Slots List Section */}
          {/* <Grid item xs={12} lg={3}>
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
                      bgcolor: "#5ec2d2",
                      color: "white",
                      "&:hover": {
                        bgcolor: "#4ba1b0",
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
                  <CircularProgress size={32} sx={{ color: "#5ec2d2" }} />
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
                        borderColor: "#5ec2d2",
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
        </Grid> */}
        </Grid>

        {/* Add Slot Dialog */}
        {/* <Dialog
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
                <Box sx={{ display: "flex", gap: 2 }}>
                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 1 }}
                  >
                    <InputLabel sx={{ fontSize: "16px" }}>
                      Select Start Time
                    </InputLabel>
                    <TimePicker
                      label="Start Time"
                      value={startTime}
                      onChange={setStartTime}
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
                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 1 }}
                  >
                    <InputLabel sx={{ fontSize: "16px" }}>
                      Select End Time
                    </InputLabel>
                    <TimePicker
                      label="End Time"
                      value={endTime}
                      onChange={setEndTime}
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
              bgcolor: "#5ec2d2",
              borderRadius: 2,
              py: 1.3,
              px: 4.6,
              textTransform: "none",
              boxShadow: "none",
              "&:hover": {
                bgcolor: "#4ba1b0",
                boxShadow: "0 2px 8px rgba(94, 194, 210, 0.25)",
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
      </Dialog> */}
      </Box>
    </div>
  );
};
