import Box from "@mui/material/Box/Box";
import { Star } from "lucide-react";

interface StarRatingProps {
  rating: number;
  count?: number;
  size?: number;
  isHalf?: boolean;
  edit?: boolean;
  hideScore?: boolean;
}

export const StarRating: React.FC<StarRatingProps> = ({
  rating,
  count,
  size = 20,
  isHalf = true, // Enable half stars by default
  edit = false,
  hideScore = false,
}) => {
  return (
    <Box sx={{ display: "flex", gap: 0.5, mt: 1 }}>
      {[...Array(5)].map((_, index) => {
        const starNumber = index + 1;

        // Determine fill percentage for this star
        let fillPercentage = 0;
        if (rating >= starNumber) {
          fillPercentage = 100; // Full star
        } else if (rating > starNumber - 1) {
          fillPercentage = (rating - (starNumber - 1)) * 100; // Partial star
        }

        return (
          <Box
            key={starNumber}
            sx={{
              position: "relative",
              display: "inline-block",
            }}
          >
            {/* Background star (unfilled) */}
            <Star size={size} fill="none" stroke="#ccc" />
            {/* Foreground star (filled portion) */}
            <Box
              sx={{
                position: "absolute",
                top: 0,
                left: 0,
                width: `${fillPercentage}%`,
                overflow: "hidden",
              }}
            >
              <Star size={size} fill="#FFD700" stroke="#FFD700" />
            </Box>
          </Box>
        );
      })}
      {!hideScore && (
        <Box sx={{ ml: 0.5 }}>
          ({count ? count : rating || `0`} review
          {count && count > 1 ? "s" : ""})
        </Box>
      )}
    </Box>
  );
};
