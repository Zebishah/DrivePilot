import React from "react";
import { Card, CardContent, Typography, Box, Chip } from "@mui/material";
import { FaRegCheckCircle } from "react-icons/fa";
import { IoMdTime } from "react-icons/io";
import { SlotCardProps } from "../../types/HourSlots";
import dayjs from "dayjs";

const HourSlotCard: React.FC<SlotCardProps> = ({
  slot,
  isSelected,
  onClick,
}) => {
  const isBooked = slot.booked;

  // Combine date + startTime to check if the slot is in the past
  const isPast = dayjs(`${slot.date} ${slot.startTime}`).isBefore(dayjs());

  // Slot should be disabled if it's either booked or in the past
  const isDisabled = isBooked || isPast;

  return (
    <Card
      onClick={() => !isDisabled && onClick(slot.id)}
      sx={{
        position: "relative",
        borderRadius: "12px",
        backgroundColor: isDisabled
          ? "#f1f5f9"
          : isSelected
          ? "#5FC2D333"
          : "#f8fafc",
        border: isDisabled
          ? "1px solid #cbd5e1"
          : isSelected
          ? "2px solid #5FC2D3"
          : "1px solid #e2e8f0",
        boxShadow: isDisabled
          ? "none"
          : isSelected
          ? "0px 4px 20px rgba(95, 194, 211, 0.3)"
          : "0px 2px 8px rgba(0, 0, 0, 0.1)",
        cursor: isDisabled ? "not-allowed" : "pointer",
        transform: isDisabled
          ? "scale(1)"
          : isSelected
          ? "scale(1.02)"
          : "scale(1)",
        transition: "all 0.2s ease-in-out",
        opacity: isDisabled ? 0.6 : 1,
        "&:hover": {
          transform: isDisabled ? "scale(1)" : "scale(1.02)",
          boxShadow: isDisabled ? "none" : "0px 4px 16px rgba(0, 0, 0, 0.15)",
        },
      }}
    >
      {/* Tag — Booked or Past */}
      {(isBooked || isPast) && (
        <Box
          sx={{
            position: "absolute",
            top: 8,
            right: 8,
            zIndex: 1,
          }}
        >
          <Chip
            label={isBooked ? "Booked" : "Not Available"}
            size="small"
            sx={{
              backgroundColor: isBooked ? "#ef4444" : "#94a3b8",
              color: "white",
              fontWeight: "600",
              fontSize: "10px",
              height: "20px",
              fontFamily: "Poppins, sans-serif",
              "& .MuiChip-label": {
                px: 1,
              },
            }}
          />
        </Box>
      )}

      <CardContent sx={{ p: 2 }}>
        {/* Time Range */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            mb: 1,
          }}
        >
          <FaRegCheckCircle
            style={{
              color: isDisabled
                ? "#94a3b8"
                : isSelected
                ? "#5FC2D3"
                : "#64748b",
              fontSize: "16px",
            }}
          />
          <Typography
            variant="body1"
            sx={{
              fontWeight: "600",
              fontFamily: "Poppins, sans-serif",
              color: isDisabled
                ? "#94a3b8"
                : isSelected
                ? "#5FC2D3"
                : "#334155",
            }}
          >
            {slot.startTime} - {slot.endTime}
          </Typography>
        </Box>

        {/* Duration */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          <IoMdTime
            style={{
              color: isDisabled
                ? "#94a3b8"
                : isSelected
                ? "#5FC2D3"
                : "#64748b",
              fontSize: "16px",
            }}
          />
          <Typography
            variant="body2"
            sx={{
              fontWeight: "500",
              fontFamily: "Poppins, sans-serif",
              color: isDisabled
                ? "#94a3b8"
                : isSelected
                ? "#5FC2D3"
                : "#64748b",
            }}
          >
            1 hr lesson
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default HourSlotCard;
