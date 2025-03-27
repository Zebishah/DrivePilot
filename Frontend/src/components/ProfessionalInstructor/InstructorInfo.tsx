import React, { useState, useEffect } from "react";
import { useQuery } from '@apollo/client';
import { Button, Box, Typography, TextField, MenuItem, Slider, FormControlLabel, Checkbox, InputAdornment, IconButton, Popover, Grid, CircularProgress } from "@mui/material";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { IoStarSharp } from "react-icons/io5";
import { FaBook, FaCar, FaCogs, FaMoneyBillWave, FaSlidersH, FaStar } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { GET_NEARBY_INSTRUCTORS, getUserLocation } from "../../graphql/mutations/instructorPublic";
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { MdDone } from "react-icons/md";
import { CalendarToday } from "@mui/icons-material";
import { getMapCenterAndMarkers } from "../../utils/mapUtils";
const InstructorsInfo: React.FC = () => {
  const [filters, setFilters] = useState({
    coordinates: null,
    areaRadius: 50, // default radius
    rating: 0,
    transmission: null,
    gender: null,
    price: [1000, 10000], // default price range
    activeFilters: {} // track which filters are active
  });
  const [offset, setOffset] = useState(0);
  const [selectedRow, setSelectedRow] = useState(null);
  const navigate = useNavigate();
  const handleCheckboxChange = (rowIndex) => {
    setSelectedRow(rowIndex);
  };
  const [anchorEl, setAnchorEl] = useState(null);
  const rows = [
    { stars: 5 },
    { stars: 4 },
    { stars: 3 },
    { stars: 2 },
    { stars: 1 },
  ];

  const [showFilters, setShowFilters] = useState(false);

  const handleApplyFilters = () => {
    // Prepare only the active filters
    const activeFilters = {};
    if (filters?.transmission) activeFilters.transmission = filters.transmission;
    if (filters?.gender?.length) activeFilters.gender = filters.gender;
    if (filters?.rating > 0) activeFilters.minRating = filters.rating;
    if (filters?.price[0] > 0 || filters?.price[1] < 1000) {
      activeFilters.priceMin = filters.price[0];
      activeFilters.priceMax = filters.price[1];
    }
    if (filters?.coordinates) {
      activeFilters.coordinates = filters.coordinates;
      activeFilters.areaRadius = filters.areaRadius;
    }

    setFilters(prev => ({
      ...prev,
      activeFilters // Save active filters
    }));
    setShowFilters(false); // Close filter panel
  };
  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };
  const handleResetFilters = () => {
    setFilters({
      coordinates: filters.coordinates, // keep location
      areaRadius: 50,
      rating: 0,
      transmission: null,
      gender: null,
      price: [1000, 10000],
      activeFilters: {}
    });
    setShowFilters(false);
  };
  const open = Boolean(anchorEl);
  const id = open ? 'simple-popover' : undefined;


  useEffect(() => {
    const fetchUserLocation = async () => {
      try {
        const coords = await getUserLocation();
        setFilters(prev => ({
          ...prev,
          coordinates: coords
        }));
      } catch (error) {
        console.error('Error fetching user location:', error);
      }
    };

    fetchUserLocation();
  }, []);

  // Apollo Query for instructors
  const { loading, error, data, fetchMore, refetch } = useQuery(GET_NEARBY_INSTRUCTORS, {
    variables: {
      filter: {
        ...filters.activeFilters,
        // Only include coordinates if filters.coordinates exists and the first element is not 0
        ...(filters.coordinates && filters.coordinates[0] !== 0 && { coordinates: filters.coordinates })
      },
      limit: 5,
      offset: 0
    },
  });

  if (data?.getNearbyInstructors?.instructors.length === 0) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        minHeight="60vh"
        textAlign="center"
        p={3}
      >
        <img
          src="/images/no-instructors.svg"
          alt="No instructors found"
          style={{ width: 200, marginBottom: 20 }}
        />
        <Typography variant="h5" gutterBottom>
          No Instructors Found
        </Typography>
        <Typography variant="body1" color="textSecondary" paragraph>
          {filters.coordinates
            ? "We couldn't find any instructors near your location."
            : "Try adjusting your filters or search in a different area."}
        </Typography>
        <Button
          variant="contained"
          style={{ backgroundColor: "#5FC2D3", color: "black" }}
          onClick={handleResetFilters}
        >
          Show All Instructors
        </Button>
      </Box>
    );
  }

  // Load more instructors
  const loadMoreInstructors = () => {
    const currentLength = data?.getNearbyInstructors?.instructors?.length || 0;
    fetchMore({
      variables: {
        offset: currentLength,
        filter: filters.coordinates ? {
          coordinates: filters.coordinates,
          areaRadius: filters.areaRadius
        } : null
      },
      updateQuery: (prev, { fetchMoreResult }) => {
        if (!fetchMoreResult) return prev;
        return {
          getNearbyInstructors: {
            ...fetchMoreResult.getNearbyInstructors,
            instructors: [
              ...prev.getNearbyInstructors.instructors,
              ...fetchMoreResult.getNearbyInstructors.instructors
            ]
          }
        };
      }
    });
  };
  if (loading) return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="60vh"
    >
      <CircularProgress size={60} style={{ color: "#5FC2D3" }} />
    </Box>
  );

  const instructors = data?.getNearbyInstructors?.instructors || [];
  const hasMore = data?.getNearbyInstructors?.hasMore || false;

  const { mapCenter, markers } = getMapCenterAndMarkers(filters?.coordinates, instructors);

  return (
    <div className="max-w-screen-xl mx-auto overflow-x-hidden">
      <h1 className="text-3xl font-harabara font-bold mb-4 text-center">
        Nearby Instructors
      </h1>
      <button type="button" className="bg-[#5FC2D3] text-black ml-4 p-2 pl-20 pr-20 rounded-md flex font-poppins items-center gap-3"
        onClick={handleClick}>
        <FaSlidersH /> Filters
      </button>

      <div className="flex flex-col md:flex-row p-4 font-poppins">
        {/* Instructor List */}
        <div className="w-full md:w-1/2 space-y-4 relative max-h-[900px] overflow-y-auto pr-2">
          {instructors.map((instructor) => (
            <div
              key={instructor._id}
              className="pl-4 drop-shadow-md mt-4 bg-white rounded-lg flex flex-col md:flex-row items-center md:items-start text-left relative"
            >
              {/* Instructor card content */}
              <div className="flex flex-col items-center md:items-start md:w-1/3">
                <img
                  src={instructor.imageUrl || "/images/Instructor1.png"}
                  alt="Instructor"
                  className="w-24 h-24 rounded-full mb-4 object-cover"
                />
                <h2 className="text-lg font-bold mb-1">
                  {instructor.firstName} {instructor.lastName}
                </h2>
                <p className="text-gray-500 mb-2">{instructor.location}</p>
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  {[...Array(Math.floor(instructor.rating || 0))].map((_, i) => (
                    <IoStarSharp
                      key={i}
                      style={{ color: '#FFDB20', marginRight: "0.5rem" }}
                    />
                  ))}
                  <p className="mr-0.5">{instructor.rating || 'N/A'}</p>
                </Box>
              </div>

              {/* Right side details */}
              <div className="w-full p-6">
                <div className="text-left">
                  <p className="flex items-center gap-2 mb-2">
                    <FaBook /> {`${instructor.details?.degree} Years` || 'N/A'}
                  </p>
                  <p className="flex items-center gap-2 mb-2">
                    <FaCar /> {instructor.details?.car || 'N/A'}
                  </p>
                  <p className="flex items-center gap-2 mb-2">
                    <FaCogs /> {instructor.details?.type || 'N/A'}
                  </p>
                  <p className="flex items-center gap-2">
                    <FaMoneyBillWave /> {instructor.details?.rate || 'N/A'}
                  </p>
                </div>
                <Button
                  variant="contained"
                  className="w-full"
                  style={{
                    backgroundColor: "#5FC2D3",
                    borderRadius: "10px",
                    marginTop: "2rem",
                    textTransform: "none",
                    color: "black"
                  }}
                  onClick={() => navigate(`/instructors/${instructor._id}`)}
                >
                  View Details
                </Button>
              </div>
            </div>
          ))}

          {hasMore && (
            <div className="text-center mt-4">
              <Button
                variant="outlined"
                onClick={loadMoreInstructors}
                className="bg-[#5FC2D3] text-black"
              >
                Load More Instructors
              </Button>
            </div>
          )}
        </div>


        <div className="w-full md:w-1/2 mt-4 h-96 md:h-auto pl-4">
          <MapContainer
            center={mapCenter}
            zoom={10}
            className="h-full w-full rounded-lg"
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {markers.map((marker) => (
              <Marker
                key={marker.id}
                position={marker.position}
              />
            ))}
          </MapContainer>
        </div>
        <Popover
          id={id}
          open={open}
          anchorEl={anchorEl}
          onClose={handleClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'left',
          }}
        >
          <div className="p-3  max-h-[600px] overflow-y-auto overflow-x-hidden custom-scrollbar">
            <Typography
              sx={{
                fontFamily: 'Poppins, sans-serif',
                marginBottom: "0.5rem",
                fontWeight: "500px"
              }}
              variant="h6">Filter</Typography>
            <h1 className="border-b w-[calc(100%+3rem)] -mx-6" style={{ borderColor: "#CCCCCC" }}></h1>


            <Box sx={{ mt: 2 }}>
              <Typography sx={{ fontFamily: 'Poppins, sans-serif' }}>Select City</Typography>
              <TextField
                select
                fullWidth
                margin="dense"
                value={filters.city}
                onChange={(e) => setFilters({ ...filters, city: e.target.value })}
                sx={{
                  borderRadius: '10px',
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '10px',
                    '& fieldset': {
                      border: '1px solid',
                    },
                    '&:hover fieldset': {
                      borderColor: 'black',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#484848',
                      border: '1px solid',
                    },
                    '& .MuiSelect-select': {
                      padding: '6px 8px', // Adjust the padding to reduce the inner size for select
                    },
                  },
                }}>
                <MenuItem sx={{ fontFamily: 'Poppins, sans-serif' }} value="Bern">Bern</MenuItem>
                <MenuItem sx={{ fontFamily: 'Poppins, sans-serif' }} value="Houston">Houston</MenuItem>
              </TextField>
            </Box>

            <Box sx={{ mt: 2 }}>
              <Typography sx={{ fontFamily: 'Poppins, sans-serif' }}>Address</Typography>
              <TextField
                fullWidth
                margin="dense"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '10px',
                    '& fieldset': {
                      border: '1px solid',
                    },
                    '&:hover fieldset': {
                      borderColor: 'black',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#484848',
                      border: '1px solid',
                    },
                    '& input': {
                      padding: '6px 8px',
                    },
                  },
                }}
              />
            </Box>
            <Box sx={{ mt: 2 }}>
              <Typography sx={{ fontFamily: 'Poppins, sans-serif' }}>Area Radius</Typography>
              <TextField
                select
                fullWidth
                margin="dense"
                value={filters.areaRadius}
                onChange={(e) => setFilters({ ...filters, areaRadius: e.target.value })}
                sx={{
                  borderRadius: '10px',
                  fontFamily: 'Poppins, sans-serif',
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '10px',
                    '& fieldset': {
                      border: '1px solid',
                    },
                    '&:hover fieldset': {
                      borderColor: 'black',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#484848',
                      border: '1px solid',
                    },
                    '& .MuiSelect-select': {
                      padding: '6px 8px', // Adjust the padding to reduce the inner size for select
                    },
                  },
                }}
              >
                <MenuItem sx={{ fontFamily: 'Poppins, sans-serif' }} value="5km">5km</MenuItem>
                <MenuItem sx={{ fontFamily: 'Poppins, sans-serif' }} value="10km">10km</MenuItem>
                <MenuItem sx={{ fontFamily: 'Poppins, sans-serif' }} value="20km">20km</MenuItem>
              </TextField>
            </Box>



            <Box sx={{ mt: 2 }}>
              <Typography sx={{ fontFamily: 'Poppins, sans-serif' }}>Rating</Typography>
              <div className="font-poppins shadow-md p-4 rounded-lg">
                {rows.map((row, rowIndex) => (
                  <div key={rowIndex} className="flex items-center py-2 border-b border-[#A19A99]">
                    <div className="relative">
                      <input
                        type="checkbox"
                        className="opacity-0 absolute h-6 w-6"
                        checked={selectedRow === rowIndex}
                        onChange={() => handleCheckboxChange(rowIndex)}
                      />
                      <div className={`border-2 border-[#A19A99] rounded-md h-6 w-6 flex items-center justify-center ${selectedRow === rowIndex ? 'bg-transparent' : 'bg-transparent'}`}>
                        {selectedRow === rowIndex && <MdDone className="text-[#A19A99]" />}
                      </div>
                    </div>
                    <div className="flex items-center">
                      {[...Array(5)].map((_, starIndex) => (
                        <FaStar
                          key={starIndex}
                          style={{ width: '22px', height: '22px', color: starIndex < row.stars ? '#FFDB20' : '#D9D9D9' }}
                          className="mx-1"
                        />
                      ))}
                      {rowIndex > 0 && (
                        <span className="ml-2 text-[#545454] font-poppins font-normal text-[12px] whitespace-nowrap">
                          And Up
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

            </Box>

            <Box sx={{ mt: 2 }}>
              <Typography sx={{
                fontFamily: 'Poppins, sans-serif',
                marginBottom: "0.5rem"

              }}>Availability</Typography>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker
                  value={filters.availability}
                  onChange={(newValue) => setFilters({ ...filters, availability: newValue })}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      fullWidth
                      className="datepicker"
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton>
                              <CalendarToday />
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />
                  )}
                />
              </LocalizationProvider>
            </Box>

            <Box sx={{ mt: 2 }}>
              <Typography sx={{ fontFamily: 'Poppins, sans-serif' }}>Transmission Type</Typography>
              <TextField
                select
                fullWidth
                margin="dense"
                value={filters.transmission || ''}
                onChange={(e) => setFilters({ ...filters, transmission: e.target.value })}
                sx={{
                  fontFamily: 'Poppins, sans-serif',
                  '& .MuiOutlinedInput-root': {
                    borderRadius: "10px",
                    paddingLeft: "1.5rem",
                    '& fieldset': {
                      border: '1px solid',
                    },
                    '&:hover fieldset': {
                      borderColor: 'black',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#484848',
                      border: '1px solid',
                    },
                    '& .MuiSelect-select': {
                      padding: '6px 8px',
                    },
                  },
                }}
              >
                <MenuItem value="">All Types</MenuItem>
                <MenuItem sx={{ fontFamily: 'Poppins, sans-serif' }} value="Manual">Manual</MenuItem>
                <MenuItem sx={{ fontFamily: 'Poppins, sans-serif' }} value="Automatic">Automatic</MenuItem>
              </TextField>
            </Box>

            <Box sx={{ mt: 2 }}>
              <Typography sx={{ fontFamily: 'Poppins, sans-serif' }}>Price Per Lesson</Typography>
              <Slider
                value={filters.price}
                onChange={(e, newValue) => setFilters({ ...filters, price: newValue as number[] })}
                valueLabelDisplay="auto"
                min={1000}
                max={10000}
                sx={{
                  position: 'relative', // Ensures the Typography elements are positioned relative to the Slider
                  '& .MuiSlider-thumb': {
                    color: '#5FC2D3',
                  },
                  '& .MuiSlider-track': {
                    color: '#d8d8d8',
                  },
                  '& .MuiSlider-rail': {
                    color: '#d8d8d8',
                  },
                  '& .MuiSlider-markLabel': {
                    fontFamily: 'Poppins, sans-serif',
                  },
                }}
              />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography sx={{ fontFamily: 'Poppins, sans-serif', fontSize: '12px', color: '#000000' }}>
                  $1000
                </Typography>
                <Typography sx={{ fontFamily: 'Poppins, sans-serif', fontSize: '12px', color: '#000000' }}>
                  $5000
                </Typography>
                <Typography sx={{ fontFamily: 'Poppins, sans-serif', fontSize: '12px', color: '#000000' }}>
                  $10000
                </Typography>
              </Box>
            </Box>

            <Box sx={{ mt: 2 }}>
              <Typography sx={{ fontFamily: 'Poppins, sans-serif', mb: 1 }}>Gender</Typography>
              <div className="font-poppins">
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={filters.gender?.includes('Male') || false}
                      onChange={(e) => {
                        const genders = filters.gender || [];
                        const newGenders = e.target.checked
                          ? [...genders, 'Male']
                          : genders.filter(g => g !== 'Male');
                        setFilters({ ...filters, gender: newGenders.length ? newGenders : null });
                      }}
                    />
                  }
                  label="Male"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={filters.gender?.includes('Female') || false}
                      onChange={(e) => {
                        const genders = filters.gender || [];
                        const newGenders = e.target.checked
                          ? [...genders, 'Female']
                          : genders.filter(g => g !== 'Female');
                        setFilters({ ...filters, gender: newGenders.length ? newGenders : null });
                      }}
                    />
                  }
                  label="Female"
                />
              </div>
            </Box>

            <div className="flex gap-3 ml-8 mt-4 font-poppins">
              <Button
                sx={{ fontFamily: 'Poppins, sans-serif', borderRadius: "10px", textTransform: "none", borderColor: "#5FC2D3", color: "#5FC2D3" }}
                variant="outlined" onClick={handleClose}>Cancel</Button>
              <Button
                sx={{ fontFamily: 'Poppins, sans-serif', paddingLeft: "1.5rem", paddingRight: "1.5rem", borderRadius: "10px", textTransform: "none", backgroundColor: "#5FC2D3", color: "black" }}
                variant="contained" onClick={handleApplyFilters}>Apply</Button>
              <Button

                onClick={handleResetFilters}
                sx={{ fontFamily: 'Poppins, sans-serif', paddingLeft: "1.5rem", paddingRight: "1.5rem", borderRadius: "10px", textTransform: "none", backgroundColor: "#5FC2D3", color: "black" }}

              >
                Reset Filters
              </Button>
            </div>
          </div>
        </Popover>


      </div>
    </div>
  );
};

export default InstructorsInfo;