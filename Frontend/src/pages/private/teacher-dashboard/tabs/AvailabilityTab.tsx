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
} from "@mui/material";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DateCalendar } from "@mui/x-date-pickers/DateCalendar";
import { TimePicker } from "@mui/x-date-pickers/TimePicker";
import { PickersDay, PickersDayProps } from "@mui/x-date-pickers/PickersDay";
import { format, isAfter, startOfDay, isSameDay } from "date-fns";
import { useQuery, useMutation } from "@apollo/client";
import {
  GET_TEACHER_AVAILABILITY,
  ADD_AVAILABILITY_SLOT,
  DELETE_AVAILABILITY_SLOT,
} from "../../../../graphql/mutations/availability";
import { toast } from "react-hot-toast";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";

interface AvailabilitySlot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
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
          backgroundColor: "#5ec2d2",
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

export const AvailabilityTab: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [isAddSlotOpen, setIsAddSlotOpen] = useState(false);
  const today = startOfDay(new Date());

  const { data, loading, refetch } = useQuery(GET_TEACHER_AVAILABILITY, {
    variables: { month: format(selectedDate || new Date(), "yyyy-MM-dd") },
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

  const [addSlot] = useMutation(ADD_AVAILABILITY_SLOT);
  const [deleteSlot] = useMutation(DELETE_AVAILABILITY_SLOT);

  const handleDateChange = (date: Date | null) => {
    if (date && !isAfter(startOfDay(date), today)) {
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

    try {
      await addSlot({
        variables: {
          input: {
            date: selectedDate.toISOString(),
            startTime: format(startTime, "HH:mm"),
            endTime: format(endTime, "HH:mm"),
          },
        },
      });

      await refetch();
      handleReset();
      setIsAddSlotOpen(false);
      toast.success("Availability slot added successfully");
    } catch (error) {
      toast.error("Failed to add availability slot");
    }
  };

  const handleReset = () => {
    // setSelectedDate(null);
    setStartTime(null);
    setEndTime(null);
  };

  const handleDeleteSlot = async (id: string) => {
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

  return (
    <Box sx={{ p: 2 }}>
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
                        backgroundColor: "#5ec2d2",
                        color: "white",
                        "&:hover": { backgroundColor: "#4ba1b0" },
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
                  Available Slots
                </Typography>
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
              <Divider sx={{ mb: 2 }} />
              {loading ? (
                <Typography>Loading slots...</Typography>
              ) : (
                data?.teacherAvailability.map((slot: AvailabilitySlot) => (
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
                    }}
                  >
                    <Box>
                      <Typography
                        variant="subtitle2"
                        sx={{ fontWeight: 600, color: "#2c3e50", mb: 0.5 }}
                      >
                        {format(new Date(slot.date), "MMM dd, yyyy")}
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
                  </Box>
                ))
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Add Slot Dialog */}
      <Dialog
        open={isAddSlotOpen}
        onClose={() => setIsAddSlotOpen(false)}
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
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        sx: {
                          "& .MuiOutlinedInput-root": {
                            padding: 1.1, // Adjust this value as needed (1 = 8px)
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
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          sx: {
                            "& .MuiOutlinedInput-root": {
                              padding: 1.1, // Adjust this value as needed (1 = 8px)
                              borderRadius: 1.6,
                            },
                          },
                        },
                      }}
                    />{" "}
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
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          sx: {
                            "& .MuiOutlinedInput-root": {
                              padding: 1.1, // Adjust this value as needed (1 = 8px)
                              borderRadius: 1.6,
                            },
                          },
                        },
                      }}
                    />{" "}
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
            disabled={!selectedDate}
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
            Add Slot
          </Button>
          <Button
            onClick={handleReset}
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
