import React, { useState } from "react";
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
// Define interface for filters
interface FilterPopoverProps {
  id: string;
  open: boolean;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  initialFilters: any;
  onApplyFilters: (filters: any) => void;
  resetFilters: () => void;
}

const FilterPopover: React.FC<FilterPopoverProps> = ({
  id,
  open,
  anchorEl,
  onClose,
  initialFilters,
  onApplyFilters,
  resetFilters,
}) => {
  const [filters, setFilters] = useState(initialFilters);
  const [selectedRow, setSelectedRow] = useState<number | null>(null);

  // Predefined rows for rating
  const rows = [
    { stars: 5 },
    { stars: 4 },
    { stars: 3 },
    { stars: 2 },
    { stars: 1 },
  ];

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
  console.log("filters bro", filters);
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
        <div className=" mb-4 py-2">
          <Typography
            variant="h6"
            sx={{
              fontFamily: "Poppins, sans-serif",
              fontWeight: 600,
              color: "#333",
              marginLeft: 2,
            }}
          >
            Filters
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
          <Box>
            <Typography sx={{ fontFamily: "Poppins, sans-serif", mb: 0.9 }}>
              City
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
            >
              <MenuItem value="">Select City</MenuItem>
              <MenuItem value="Manual">Berlin</MenuItem>
              <MenuItem value="Automatic">Oslo</MenuItem>
            </TextField>
          </Box>
          <AddressSearch
            onCoordinatesChange={(coordinates) =>
              setFilters((prev) => ({ ...prev, coordinates }))
            }
          />

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
              min={5}
              max={100}
              step={5}
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
              <span>5 km</span>
              <span>30 km</span>
              <span>50 km</span>
              <span>75 km</span>
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
                }}
                value={null}
                onChange={(newValue) => {
                  if (newValue) {
                    const dateStr = newValue.format("YYYY-MM-DD");
                    // Prevent duplicate dates
                    if (!filters.availability.includes(dateStr)) {
                      setFilters((prev) => ({
                        ...prev,
                        availability: [...prev.availability, dateStr],
                      }));
                    }
                  }
                }}
                renderInput={(params) => <TextField {...params} fullWidth />}
                renderDay={(day, _value, DayComponentProps) => {
                  const dateStr = day.format("YYYY-MM-DD");
                  const isSelected = filters.availability.includes(dateStr);

                  return (
                    <Badge
                      key={dateStr}
                      overlap="circular"
                      badgeContent={isSelected ? "✓" : undefined}
                      color="primary"
                    >
                      <PickersDay
                        {...DayComponentProps}
                        selected={isSelected}
                        sx={{
                          ...(isSelected && {
                            backgroundColor: "primary.main",
                            color: "primary.contrastText",
                            "&:hover": {
                              backgroundColor: "primary.dark",
                            },
                          }),
                        }}
                      />
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
                        className={`border-2 border-[#A19A99] rounded-md h-6 w-6 flex items-center justify-center ${
                          selectedRow === rowIndex
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
              min={1000}
              max={10000}
              sx={{
                "& .MuiSlider-thumb": { color: "#5FC2D3" },
                "& .MuiSlider-track": { color: "#d8d8d8" },
                "& .MuiSlider-rail": { color: "#d8d8d8" },
              }}
            />
            <div className="flex justify-between text-xs text-gray-600">
              <span>$1000</span>
              <span>$5000</span>
              <span>$10000</span>
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
