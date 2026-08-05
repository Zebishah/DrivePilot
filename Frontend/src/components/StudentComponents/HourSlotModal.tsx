// components/HourSlotModal.tsx
import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Grid,
  Box,
  IconButton,
  Alert,
  CircularProgress,
  Card,
  CardContent,
} from "@mui/material";
import { IoClose } from "react-icons/io5";
import { CalendarCheck2 } from "lucide-react";
import { FaRegCheckCircle } from "react-icons/fa";
import { IoMdTime } from "react-icons/io";
import dayjs from "dayjs";
import { HourSlot } from "../../types/HourSlots";

interface HourSlotModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (selectedSlots: HourSlot[]) => void;
  originalSlot: {
    id: string;
    date: string;
    formattedDate: string;
    availableSlots: Array<{
      id: string;
      date: string;
      startTime: string;
      endTime: string;
      booked: boolean;
      status: string;
    }>;
    timeRange: string;
    totalDuration: string;
  };
  loading?: boolean;
}

const HourSlotModal: React.FC<HourSlotModalProps> = ({
  open,
  onClose,
  onConfirm,
  originalSlot,
  loading = false,
}) => {
  const [selectedHourSlots, setSelectedHourSlots] = useState<string[]>([]);

  const calculateDuration = (startTime: string, endTime: string) => {
    const start = dayjs(`2000-01-01 ${startTime}`);
    const end = dayjs(`2000-01-01 ${endTime}`);
    const hours = end.diff(start, "hour", true);
    const roundedHours = Math.round(hours * 2) / 2;
    const hoursText = roundedHours === 1 ? "hr" : "hrs";
    return `${roundedHours.toFixed(1)} ${hoursText}`;
  };

  const handleSlotClick = (slotId: string) => {
    setSelectedHourSlots((prev) =>
      prev.includes(slotId)
        ? prev.filter((id) => id !== slotId)
        : [...prev, slotId]
    );
  };

  const handleConfirm = () => {
    const selectedSlots: HourSlot[] = originalSlot.availableSlots
      .filter((slot) => selectedHourSlots.includes(slot.id))
      .map((slot) => ({
        id: slot.id,
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        booked: slot.booked,
        status: slot.status,
        originalSlotId: originalSlot.id,
        duration: calculateDuration(slot.startTime, slot.endTime),
      }));

    onConfirm(selectedSlots);
  };

  const handleClose = () => {
    setSelectedHourSlots([]);
    onClose();
  };
  console.log("originalSlot", originalSlot);
  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      slotProps={{
        backdrop: {
          sx: {
            backgroundColor: "rgba(0, 0, 0, 0.15)",
          },
        },
      }}
      PaperProps={{
        sx: {
          borderRadius: "20px",
          maxHeight: "80vh",
          boxShadow: "none",
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          pb: 2,
          borderBottom: "1px solid #e2e8f0",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <CalendarCheck2 size={24} style={{ color: "#5FC2D3" }} />
          <Typography
            variant="h5"
            sx={{
              fontWeight: "600",
              fontFamily: "Poppins, sans-serif",
              color: "#1e293b",
            }}
          >
            Select Time Slots
          </Typography>
        </Box>
        <IconButton
          onClick={handleClose}
          sx={{
            color: "#64748b",
            "&:hover": {
              backgroundColor: "#f1f5f9",
            },
          }}
        >
          <IoClose size={24} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        {/* Notice Alert */}
        <Alert
          severity="info"
          sx={{
            mb: 3,
            borderRadius: "12px",
            backgroundColor: "#f0f9ff",
            border: "1px solid #bae6fd",
            "& .MuiAlert-icon": {
              color: "#0284c7",
            },
          }}
        >
          <Typography
            sx={{
              fontFamily: "Poppins, sans-serif",
              fontSize: "14px",
              color: "#0c4a6e",
            }}
          >
            Select the time slots you want to book for your lessons.
          </Typography>
        </Alert>

        {/* Date Info */}
        <Box
          sx={{
            p: 2,
            backgroundColor: "#f8fafc",
            borderRadius: "12px",
            mb: 3,
          }}
        >
          <Typography
            variant="h6"
            sx={{
              fontFamily: "Poppins, sans-serif",
              fontWeight: "600",
              color: "#1e293b",
              mb: 1,
            }}
          >
            {originalSlot.formattedDate}
          </Typography>
          <Typography
            variant="body1"
            sx={{
              fontFamily: "Poppins, sans-serif",
              color: "#64748b",
            }}
          >
            Available slots: {originalSlot.timeRange}
          </Typography>
        </Box>

        {/* Available Slots Grid */}
        <Typography
          variant="h6"
          sx={{
            fontFamily: "Poppins, sans-serif",
            fontWeight: "600",
            color: "#1e293b",
            mb: 2,
          }}
        >
          Available Time Slots
        </Typography>

        <Grid container spacing={2}>
          {originalSlot.availableSlots.map((slot) => {
            const slotDateTime = dayjs(`${slot.date} ${slot.startTime}`);
            const isPast = slotDateTime.isBefore(dayjs());
            const isCompleted = slot.status === "completed";
            const isPassed = isPast && !slot.booked && !isCompleted;
            const isDisabled = isPast || slot.booked || isCompleted;
            const isSelected = selectedHourSlots.includes(slot.id);
            const duration = calculateDuration(slot.startTime, slot.endTime);

            return (
              <Grid item xs={12} sm={6} md={4} key={slot.id}>
                <Card
                  onClick={() => !isDisabled && handleSlotClick(slot.id)}
                  sx={{
                    position: "relative", // ✅ for absolute tag positioning
                    borderRadius: "10px",
                    backgroundColor:
                      slot.booked || isCompleted || isPassed
                        ? "#f5f5f5"
                        : isSelected
                        ? "#5FC2D3"
                        : "#5FC2D333",
                    border: isSelected
                      ? "2px solid #5FC2D3"
                      : slot.booked || isCompleted || isPassed
                      ? "1px solid #e0e0e0"
                      : "1px solid #cce4f7",
                    boxShadow: isSelected
                      ? "0px 4px 12px rgba(95, 194, 211, 0.3)"
                      : 1,
                    cursor: isDisabled ? "not-allowed" : "pointer",
                    opacity: isDisabled ? 0.6 : 1,
                    transition: "all 0.2s",
                    "&:hover": !isDisabled
                      ? {
                          transform: "translateY(-2px)",
                          boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.15)",
                        }
                      : {},
                  }}
                >
                  {/* 🔹 Tag: Booked | Completed | Passed (top-right corner) */}
                  {slot.booked && (
                    <Box
                      sx={{
                        position: "absolute",
                        top: 8,
                        right: 8,
                        backgroundColor: "#ef4444",
                        color: "white",
                        px: 1,
                        py: "2px",
                        borderRadius: "6px",
                        fontSize: "11px",
                        fontWeight: 600,
                        fontFamily: "Poppins, sans-serif",
                      }}
                    >
                      Booked
                    </Box>
                  )}
                  {isCompleted && (
                    <Box
                      sx={{
                        position: "absolute",
                        top: 8,
                        right: 8,
                        backgroundColor: "#16a34a",
                        color: "white",
                        px: 1,
                        py: "2px",
                        borderRadius: "6px",
                        fontSize: "11px",
                        fontWeight: 600,
                        fontFamily: "Poppins, sans-serif",
                      }}
                    >
                      Completed
                    </Box>
                  )}
                  {isPassed && (
                    <Box
                      sx={{
                        position: "absolute",
                        top: 8,
                        right: 8,
                        backgroundColor: "#64748b",
                        color: "white",
                        px: 1,
                        py: "2px",
                        borderRadius: "6px",
                        fontSize: "11px",
                        fontWeight: 600,
                        fontFamily: "Poppins, sans-serif",
                      }}
                    >
                      Passed
                    </Box>
                  )}

                  <CardContent>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        marginBottom: "0.5rem",
                        gap: 1,
                      }}
                    >
                      <FaRegCheckCircle
                        style={{
                          color: isDisabled
                            ? "#9ca3af"
                            : isSelected
                            ? "white"
                            : "#25D422",
                        }}
                      />
                      <Typography
                        variant="body1"
                        sx={{
                          fontWeight: "600",
                          fontFamily: "Poppins, sans-serif",
                          color: isSelected
                            ? "white"
                            : isDisabled
                            ? "#9ca3af"
                            : "inherit",
                        }}
                      >
                        {slot.startTime} - {slot.endTime}
                      </Typography>
                    </Box>

                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <IoMdTime
                        style={{
                          color: isSelected
                            ? "white"
                            : isDisabled
                            ? "#9ca3af"
                            : "inherit",
                        }}
                      />
                      <Typography
                        sx={{
                          fontWeight: "500",
                          fontFamily: "Poppins, sans-serif",
                          fontSize: "14px",
                          color: isSelected
                            ? "white"
                            : isDisabled
                            ? "#9ca3af"
                            : "inherit",
                        }}
                        variant="body2"
                      >
                        {duration} lesson
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>

        {selectedHourSlots.length > 0 && (
          <Box
            sx={{
              mt: 3,
              p: 2,
              backgroundColor: "#f0f9ff",
              borderRadius: "12px",
              border: "1px solid #bae6fd",
            }}
          >
            <Typography
              sx={{
                fontFamily: "Poppins, sans-serif",
                fontWeight: "500",
                color: "#0c4a6e",
              }}
            >
              Selected: {selectedHourSlots.length} time slot
              {selectedHourSlots.length !== 1 ? "s" : ""}
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions
        sx={{
          p: 3,
          borderTop: "1px solid #e2e8f0",
          gap: 2,
        }}
      >
        <Button
          onClick={handleClose}
          variant="outlined"
          disabled={loading}
          sx={{
            px: 4,
            py: 1.5,
            borderRadius: "10px",
            textTransform: "none",
            fontFamily: "Poppins, sans-serif",
            fontWeight: "500",
            borderColor: "#d1d5db",
            color: "#6b7280",
            "&:hover": {
              borderColor: "#9ca3af",
              backgroundColor: "#f9fafb",
            },
          }}
        >
          Cancel
        </Button>

        <Button
          onClick={handleConfirm}
          variant="contained"
          disabled={selectedHourSlots.length === 0 || loading}
          sx={{
            px: 4,
            py: 1.5,
            borderRadius: "10px",
            textTransform: "none",
            fontFamily: "Poppins, sans-serif",
            fontWeight: "500",
            backgroundColor: "#5FC2D3",
            color: "black",
            minWidth: "120px",
            "&:hover": {
              backgroundColor: "#4db5c7",
            },
            "&:disabled": {
              backgroundColor: "#e2e8f0",
              color: "#9ca3af",
            },
          }}
        >
          {loading ? (
            <CircularProgress size={20} sx={{ color: "#9ca3af" }} />
          ) : (
            "Confirm Selection"
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default HourSlotModal;
