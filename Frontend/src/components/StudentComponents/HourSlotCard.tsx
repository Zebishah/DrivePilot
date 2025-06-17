// components/HourSlotCard.tsx
import React from "react";
import { Card, CardContent, Typography, Box } from "@mui/material";
import { FaRegCheckCircle } from "react-icons/fa";
import { IoMdTime } from "react-icons/io";
import { SlotCardProps } from "../../types/HourSlots";

const HourSlotCard: React.FC<SlotCardProps> = ({
  slot,
  isSelected,
  onClick,
}) => {
  return (
    <Card
      onClick={() => onClick(slot.id)}
      sx={{
        borderRadius: "12px",
        backgroundColor: isSelected ? "#5FC2D333" : "#f8fafc",
        border: isSelected ? "2px solid #5FC2D3" : "1px solid #e2e8f0",
        boxShadow: isSelected
          ? "0px 4px 20px rgba(95, 194, 211, 0.3)"
          : "0px 2px 8px rgba(0, 0, 0, 0.1)",
        cursor: "pointer",
        transform: isSelected ? "scale(1.02)" : "scale(1)",
        transition: "all 0.2s ease-in-out",
        "&:hover": {
          transform: "scale(1.02)",
          boxShadow: "0px 4px 16px rgba(0, 0, 0, 0.15)",
        },
      }}
    >
      <CardContent sx={{ p: 2 }}>
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
              color: isSelected ? "#5FC2D3" : "#64748b",
              fontSize: "16px",
            }}
          />
          <Typography
            variant="body1"
            sx={{
              fontWeight: "600",
              fontFamily: "Poppins, sans-serif",
              color: isSelected ? "#5FC2D3" : "#334155",
            }}
          >
            {slot.startTime} - {slot.endTime}
          </Typography>
        </Box>

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          <IoMdTime
            style={{
              color: isSelected ? "#5FC2D3" : "#64748b",
              fontSize: "16px",
            }}
          />
          <Typography
            variant="body2"
            sx={{
              fontWeight: "500",
              fontFamily: "Poppins, sans-serif",
              color: isSelected ? "#5FC2D3" : "#64748b",
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
