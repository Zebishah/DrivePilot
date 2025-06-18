// components/HourSlotModal.tsx
import React, { useState, useMemo } from "react";
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
} from "@mui/material";
import { IoClose } from "react-icons/io5";
import { CalendarCheck2 } from "lucide-react";
import dayjs from "dayjs";
import HourSlotCard from "./HourSlotCard";
import { generateHourSlots } from "../../utils/HourSlotsUtills";
import { HourSlotModalProps } from "../../types/HourSlots";

const HourSlotModal: React.FC<HourSlotModalProps> = ({
  open,
  onClose,
  onConfirm,
  originalSlot,
  loading = false,
}) => {
  const [selectedHourSlots, setSelectedHourSlots] = useState<string[]>([]);

  // Use hourlySlots directly from the originalSlot prop
  const hourSlots = useMemo(() => {
    return originalSlot.hourlySlots || [];
  }, [originalSlot]);
  console.log("originalSlot", originalSlot);
  const handleSlotClick = (slotId: string) => {
    setSelectedHourSlots((prev) =>
      prev.includes(slotId)
        ? prev.filter((id) => id !== slotId)
        : [...prev, slotId]
    );
  };

  const handleConfirm = () => {
    const selectedSlots = hourSlots.filter((slot) =>
      selectedHourSlots.includes(slot.id)
    );
    onConfirm(selectedSlots);
  };

  const handleClose = () => {
    setSelectedHourSlots([]);
    onClose();
  };

  const formattedDate = dayjs(originalSlot.date).format("MMMM D, YYYY");

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      BackdropProps={{
        sx: {
          backgroundColor: "rgba(0, 0, 0, 0.3)", // Change this value as needed
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
            Select Hour Slots
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
            Please note: the duration of one lesson may vary depending on the
            instructor (it can be 40, 45, 50, or 60 minutes in practice).
          </Typography>
        </Alert>

        {/* Date and Original Time Info */}
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
            {formattedDate}
          </Typography>
          <Typography
            variant="body1"
            sx={{
              fontFamily: "Poppins, sans-serif",
              color: "#64748b",
            }}
          >
            Original slot: {originalSlot.time} ({originalSlot.duration})
          </Typography>
        </Box>

        {/* Hour Slots Grid */}
        <Typography
          variant="h6"
          sx={{
            fontFamily: "Poppins, sans-serif",
            fontWeight: "600",
            color: "#1e293b",
            mb: 2,
          }}
        >
          Available Hour Slots
        </Typography>

        <Grid container spacing={2}>
          {hourSlots.map((slot) => {
            return (
              <Grid item xs={12} sm={6} md={4} key={slot.id}>
                <HourSlotCard
                  slot={slot}
                  isSelected={selectedHourSlots.includes(slot.id)}
                  onClick={handleSlotClick}
                />
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
              Selected: {selectedHourSlots.length} hour slot
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
