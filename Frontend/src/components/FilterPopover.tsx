import React, { useEffect, useState } from "react";
import {
  Popover,
  Box,
  Typography,
  TextField,
  MenuItem,
  Slider,
  Checkbox,
  FormControlLabel,
  Button,
  Chip,
} from "@mui/material";
import { LocalizationProvider, DatePicker } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { MdDone } from "react-icons/md";
import { FaStar } from "react-icons/fa";
import { CalendarToday } from "@mui/icons-material";
import AddressSearch from "./AddressSearch";
import dayjs from "dayjs";
import { Badge } from "@mui/material";
import { PickersDay } from "@mui/x-date-pickers/PickersDay";
import ClearIcon from "@mui/icons-material/Clear";
import { useAuth } from "../context/AuthContext";

// Define interface for filters
interface FilterPopoverProps {
  id: string;
  open: boolean;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  initialFilters: any;
  onApplyFilters: (filters: any) => void;
  resetFilters: () => void;
  instructors: any;
}

const FilterPopover: React.FC<FilterPopoverProps> = ({
  id,
  open,
  anchorEl,
  onClose,
  initialFilters,
  onApplyFilters,
  resetFilters,
  instructors,
}) => {
  const [filters, setFilters] = useState(initialFilters);
  const [selectedRow, setSelectedRow] = useState<number | null>(null);

  const { user } = useAuth();
  // Predefined rows for rating
  const rows = [
    { stars: 5 },
    { stars: 4 },
    { stars: 3 },
    { stars: 2 },
    { stars: 1 },
  ];
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const handleCheckboxChange = (rowIndex: number) => {
    setSelectedRow(selectedRow === rowIndex ? null : rowIndex);
  };

  const handleApplyFilters = () => {
    onApplyFilters(filters);
    onClose();
  };

  const handleResetFilters = () => {
    resetFilters();
    setSelectedRow(null);
  };
  // Extract all available dates from instructors
  useEffect(() => {
    if (instructors && instructors.length > 0) {
      const dates: string[] = [];
      instructors.forEach((instructor) => {
        if (instructor.availability && instructor.availability.length > 0) {
          instructor.availability.forEach((slot) => {
            const dateObj = new Date(parseInt(slot.date));
            const dateStr = dayjs(dateObj).format("YYYY-MM-DD");

            dates.push(dateStr);
          });
        }
      });
      setAvailableDates(dates);
    }
  }, [instructors]);
  const isDateAvailable = (date: dayjs.Dayjs) => {
    const dateStr = date.format("YYYY-MM-DD");
    return availableDates.includes(dateStr);
  };

  // This function converts timestamp from instructor data to YYYY-MM-DD
  const formatInstructorDate = (timestamp: string) => {
    // For timestamps in milliseconds format
    const date = new Date(parseInt(timestamp));
    return dayjs(date).format("YYYY-MM-DD");
  };

  return (
    <Popover
      id={id}
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{
        vertical: "bottom",
        horizontal: "left",
      }}
      transformOrigin={{
        vertical: "top",
        horizontal: "left",
      }}
    >
      <div className="  w-[500px] max-h-[600px]  overflow-y-auto custom-scrollbar">
        <div className=" mb-4 py-4">
          <Typography
            variant="h6"
            sx={{
              fontFamily: "Poppins, sans-serif",
              fontWeight: 600,
              color: "#333",
              marginLeft: 2,
            }}
          >
            Filter
          </Typography>
          <div
            className="border-b w-full mt-2"
            style={{ borderColor: "#CCCCCC" }}
          ></div>
        </div>

        <div className="space-y-8 px-6 py-2">
          {/* City Selector */}
          {/* <Box>
                        <Typography sx={{ fontFamily: 'Poppins, sans-serif', mb: 1 }}>Select City</Typography>
                        <TextField
                            select
                            fullWidth
                            value={filters.city}
                            onChange={(e) => setFilters({ ...filters, city: e.target.value })}
                            variant="outlined"
                            className="rounded-lg"
                        >
                            <MenuItem value="Bern">Bern</MenuItem>
                            <MenuItem value="Houston">Houston</MenuItem>
                        </TextField>
                    </Box> */}

          {/* Address */}
          {user?.role !== "Student" && (
            <AddressSearch
              onCoordinatesChange={(coordinates) =>
                setFilters((prev) => ({ ...prev, coordinates }))
              }
            />
          )}

          {/* Area Radius */}
          <Box>
            <Typography sx={{ fontFamily: "Poppins, sans-serif", mb: 1 }}>
              Area Radius (km)
            </Typography>
            <Slider
              //   key={`areaRadius-${filters.areaRadius}`} // Force re-render when areaRadius changes
              value={filters.areaRadius}
              onChange={(e, newValue) =>
                setFilters((prev) => ({ ...prev, areaRadius: newValue }))
              }
              valueLabelDisplay="auto"
              min={0}
              max={100}
              step={1}
              //   marks={[
              //     { value: 5, label: "5 km" },
              //     { value: 25, label: "25 km" },
              //     { value: 50, label: "50 km" },
              //     { value: 75, label: "75 km" },
              //     { value: 100, label: "100 km" },
              //   ]}
              sx={{
                "& .MuiSlider-thumb": {
                  color: "#5FC2D3",
                  "&:hover": {
                    boxShadow: "0 0 0 8px rgba(95, 194, 211, 0.16)",
                  },
                },
                "& .MuiSlider-track": { color: "#5FC2D3" },
                "& .MuiSlider-rail": { color: "#d8d8d8" },
                "& .MuiSlider-markLabel": {
                  fontFamily: "Poppins, sans-serif",
                  fontSize: "0.75rem",
                  color: "#666",
                },
              }}
            />
            <div className="flex justify-between text-xs text-gray-600 mt-2">
              <span>0 km</span>
              <span>25 km</span>
              <span>50 km</span>
              <span>70 km</span>
              <span>100 km</span>
            </div>
          </Box>
          <Box sx={{ mb: 2 }}>
            <Typography sx={{ fontFamily: "Poppins, sans-serif", mb: 1 }}>
              Available On These Dates
            </Typography>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker
                sx={{
                  width: "100%",
                  borderRadius: "25px !important",
                  "& .MuiOutlinedInput-input": {
                    // Add your custom styles here
                    padding: "14px 14px !important",
                    fontSize: "16px",
                    fontFamily: "Poppins, sans-serif",
                    // Add any other styles you need
                  },
                }}
                value={null}
                onChange={(newValue) => {
                  if (newValue) {
                    const dateStr = newValue.format("YYYY-MM-DD");
                    // Only allow selection of available dates
                    if (!filters.availability.includes(dateStr)) {
                      setFilters((prev) => ({
                        ...prev,
                        availability: [...prev.availability, dateStr],
                      }));
                    }
                  }
                }}
                shouldDisableDate={(date) => {
                  const today = dayjs().startOf("day");
                  return date.isBefore(today, "day");
                }}
                slotProps={{
                  // Apply styling directly to the day components
                  day: ({ day, selected, ...other }) => {
                    const dateStr = dayjs(day).format("YYYY-MM-DD");
                    const isAvailable = isDateAvailable(day);
                    const isSelected = filters.availability.includes(dateStr);
                    const today = dayjs().startOf("day");
                    const isFutureOrToday = !day.isBefore(today, "day");
                    return {
                      ...other,
                      selected: isSelected,
                      sx: {
                        ...(isAvailable &&
                          isFutureOrToday &&
                          !isSelected && {
                          backgroundColor: "#2196F3 !important", // Blue for available dates
                          color: "white",
                          borderRadius: "50%",
                          "&:hover": {
                            backgroundColor: "#1976D2",
                          },
                        }),
                        ...(isSelected && {
                          backgroundColor: "#5FC2D3",
                          color: "white",
                          "&:hover": {
                            backgroundColor: "#4AA8B8",
                          },
                        }),
                      },
                    };
                  },
                  // Style the calendar container
                }}
                renderDay={(day, _value, DayComponentProps) => {
                  const dateStr = day.format("YYYY-MM-DD");
                  const isSelected = filters.availability.includes(dateStr);

                  return (
                    <Badge
                      key={dateStr}
                      overlap="circular"
                      badgeContent={isSelected ? "✓" : undefined}
                      color="primary"
                      sx={{
                        backgroundColor: "#000000 !important",
                      }}
                    >
                      <PickersDay {...DayComponentProps} />
                    </Badge>
                  );
                }}
              />
            </LocalizationProvider>

            {filters.availability.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Selected Dates:
                </Typography>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                  {filters.availability.map((date, index) => (
                    <Chip
                      key={index}
                      label={dayjs(date).format("MMM D, YYYY")}
                      onDelete={() => {
                        setFilters((prev) => ({
                          ...prev,
                          availability: prev.availability.filter(
                            (_, i) => i !== index
                          ),
                        }));
                      }}
                      sx={{
                        backgroundColor: "primary.light",
                        color: "primary.contrastText",
                      }}
                    />
                  ))}
                </Box>
                <Button
                  variant="text"
                  size="small"
                  onClick={() =>
                    setFilters((prev) => ({ ...prev, availability: [] }))
                  }
                  sx={{ mt: 1, color: "error.main" }}
                  startIcon={<ClearIcon />}
                >
                  Clear All Dates
                </Button>
              </Box>
            )}
          </Box>
          {/* Rating Selector */}
          <Box>
            <Typography sx={{ fontFamily: "Poppins, sans-serif", mb: 1 }}>
              Rating
            </Typography>
            <div className="bg-white shadow-md rounded-lg ">
              {rows.map((row, rowIndex) => (
                <div
                  key={rowIndex}
                  className="flex items-center justify-between py-2 border-b border-[#A19A99] last:border-b-0"
                >
                  <div className="flex items-center">
                    <div className="relative mr-4">
                      <input
                        type="checkbox"
                        className="opacity-0 absolute h-6 w-6"
                        checked={selectedRow === rowIndex}
                        onChange={() => handleCheckboxChange(rowIndex)}
                      />
                      <div
                        className={`border-2 border-[#A19A99] rounded-md h-6 w-6 flex items-center justify-center ${selectedRow === rowIndex
                            ? "bg-transparent"
                            : "bg-transparent"
                          }`}
                      >
                        {selectedRow === rowIndex && (
                          <MdDone className="text-[#A19A99]" />
                        )}
                      </div>
                    </div>
                    <div className="flex items-center">
                      {[...Array(5)].map((_, starIndex) => (
                        <FaStar
                          key={starIndex}
                          style={{
                            width: "22px",
                            height: "22px",
                            color:
                              starIndex < row.stars ? "#FFDB20" : "#D9D9D9",
                          }}
                          className="mx-1"
                        />
                      ))}
                      {rowIndex > 0 && (
                        <span className="ml-2 text-[#545454] font-poppins text-xs">
                          And Up
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Box>

          {/* Transmission Type */}
          <Box>
            <Typography sx={{ fontFamily: "Poppins, sans-serif", mb: 1 }}>
              Transmission Type
            </Typography>
            <TextField
              select
              fullWidth
              value={filters.transmission || ""}
              onChange={(e) =>
                setFilters({ ...filters, transmission: e.target.value })
              }
              variant="outlined"
              className="rounded-lg"
              sx={{
                "& .MuiOutlinedInput-input": {
                  // Add your custom styles here
                  padding: "14px 14px !important",
                  fontSize: "16px",
                  fontFamily: "Poppins, sans-serif",
                  // Add any other styles you need
                },
              }}
            >
              <MenuItem value="">All Types</MenuItem>
              <MenuItem value="Manual">Manual</MenuItem>
              <MenuItem value="Automatic">Automatic</MenuItem>
            </TextField>
          </Box>

          {/* Price Slider */}
          <Box>
            <Typography sx={{ fontFamily: "Poppins, sans-serif" }}>
              Price Per Lesson
            </Typography>
            <Slider
              //   key={`price-${filters.price[0]}-${filters.price[1]}`} // Force re-render when price changes
              value={filters.price}
              onChange={(e, newValue) =>
                setFilters((prev) => ({ ...prev, price: newValue }))
              }
              valueLabelDisplay="auto"
              min={60}
              max={120}
              sx={{
                "& .MuiSlider-thumb": { color: "#5FC2D3" },
                "& .MuiSlider-track": { color: "#d8d8d8" },
                "& .MuiSlider-rail": { color: "#d8d8d8" },
              }}
            />
            <div className="flex justify-between text-xs text-gray-600">
              <span>60 CHF</span>
              <span>90 CHF</span>
              <span>120 CHF</span>
            </div>
          </Box>

          {/* Enhanced Date Availability Filter */}

          {/* Gender Selection */}
          <Box>
            {/* <Typography sx={{ fontFamily: "Poppins, sans-serif", mb: 1 }}>
              Gender
            </Typography> */}
            <div className="flex items-center">
              <FormControlLabel
                control={
                  <Checkbox
                    checked={filters.gender?.includes("Male") || false}
                    onChange={(e) => {
                      const genders = filters.gender || [];
                      const newGenders = e.target.checked
                        ? [...genders, "Male"]
                        : genders.filter((g) => g !== "Male");
                      setFilters({
                        ...filters,
                        gender: newGenders.length ? newGenders : null,
                      });
                    }}
                  />
                }
                label="Male"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={filters.gender?.includes("Female") || false}
                    onChange={(e) => {
                      const genders = filters.gender || [];
                      const newGenders = e.target.checked
                        ? [...genders, "Female"]
                        : genders.filter((g) => g !== "Female");
                      setFilters({
                        ...filters,
                        gender: newGenders.length ? newGenders : null,
                      });
                    }}
                  />
                }
                label="Female"
              />
            </div>
          </Box>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4 mt-6">
            <Button
              variant="outlined"
              onClick={onClose}
              sx={{
                fontFamily: "Poppins, sans-serif",
                borderColor: "#5FC2D3",
                color: "#5FC2D3",
              }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleApplyFilters}
              sx={{
                fontFamily: "Poppins, sans-serif",
                backgroundColor: "#5FC2D3",
                color: "black",
                "&:hover": { backgroundColor: "#4AB0C0" },
              }}
            >
              Apply Filters
            </Button>
            <Button
              variant="contained"
              onClick={handleResetFilters}
              sx={{
                fontFamily: "Poppins, sans-serif",
                backgroundColor: "#5FC2D3",
                color: "black",
                "&:hover": { backgroundColor: "#4AB0C0" },
              }}
            >
              Reset
            </Button>
          </div>
        </div>
      </div>
    </Popover>
  );
};

export default FilterPopover;
