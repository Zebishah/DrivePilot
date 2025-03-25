import React, { useState, useEffect } from "react";
import { useQuery } from '@apollo/client';
import { Button, Box, Popover } from "@mui/material";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { IoStarSharp } from "react-icons/io5";
import { FaBook, FaCar, FaCogs, FaMoneyBillWave, FaSliders } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { GET_NEARBY_INSTRUCTORS, getUserLocation } from "../../graphql/mutations/instructorPublic";


const InstructorsInfo: React.FC = () => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [filters, setFilters] = useState({
    city: "",
    price: [100, 1000],
    transmission: "",
    rating: 0,
    areaRadius: "",
    coordinates: null,
    availability: null
  });
  const [offset, setOffset] = useState(0);
  const navigate = useNavigate();

  // Fetch user's location on component mount
  useEffect(() => {
    const fetchUserLocation = async () => {
      try {
        const coordinates = await getUserLocation();
        setFilters(prev => ({
          ...prev,
          coordinates,
          areaRadius: 50 // default 50 miles radius
        }));
      } catch (error) {
        console.error('Error fetching user location:', error);
      }
    };

    fetchUserLocation();
  }, []);

  // Apollo Query for instructors
  const { loading, error, data, fetchMore } = useQuery(GET_NEARBY_INSTRUCTORS, {
    variables: {
      // filter: {
      //   city: filters.city,
      //   priceMin: filters.price[0],
      //   priceMax: filters.price[1],
      //   transmission: filters.transmission,
      //   minRating: filters.rating,
      //   areaRadius: filters.areaRadius,
      //   coordinates: filters.coordinates
      // },
      limit: 5,
      offset: 0
    },
    skip: !filters.coordinates // Skip query until coordinates are available
  });

  // Load more instructors
  const loadMoreInstructors = () => {
    const currentLength = data?.getNearbyInstructors?.instructors?.length || 0;
    fetchMore({
      variables: {
        offset: currentLength
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

  // Render loading state
  if (loading) return <div>Loading instructors...</div>;

  // Render error state
  if (error) return <div>Error loading instructors: {error.message}</div>;

  // Get instructors from query result
  const instructors = data?.getNearbyInstructors?.instructors || [];
  const hasMore = data?.getNearbyInstructors?.hasMore || false;

  return (
    <div className="max-w-screen-xl mx-auto overflow-x-hidden">
      <h1 className="text-3xl font-harabara font-bold mb-4 text-center">
        Nearby Instructors
      </h1>

      {/* Existing filter button and layout */}
      <div className="flex flex-col md:flex-row p-4 font-poppins">
        {/* Instructor List */}
        <div className="w-full md:w-1/2 space-y-4 relative max-h-[900px] overflow-y-auto overflow-x-hidden pr-2 custom-scrollbar">
          {instructors.map((instructor, index) => (
            <div
              key={instructor._id}
              className="pl-4 drop-shadow-md mt-4 bg-white rounded-lg flex flex-col md:flex-row items-center md:items-start text-left relative"
            >
              {/* Instructor card content remains the same */}
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
                    <FaBook /> {instructor.details?.degree || 'N/A'}
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
                  onClick={() => {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                    navigate(`/instructors/${instructor._id}`);
                  }}
                >
                  View Details
                </Button>
              </div>
            </div>
          ))}

          {/* Load More Button */}
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

        {/* Map Section */}
        <div className="w-full md:w-1/2 mt-4 h-96 md:h-auto pl-4">
          <MapContainer
            center={filters.coordinates || [12.9716, 77.5946]}
            zoom={10}
            className="h-full w-full rounded-lg"
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {instructors.map((instructor) => (
              <Marker
                key={instructor._id}
                position={instructor.coordinates || [12.9716, 77.5946]}
              />
            ))}
          </MapContainer>
        </div>
        {/* 
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
                value={filters.transmission}
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
                      padding: '6px 8px', // Adjust the padding to reduce the inner size for select
                    },
                  },
                }}>
                <MenuItem sx={{ fontFamily: 'Poppins, sans-serif' }} value="Manual Car">Manual Car</MenuItem>
                <MenuItem sx={{ fontFamily: 'Poppins, sans-serif' }} value="Automatic Car">Automatic Car</MenuItem>
              </TextField>
            </Box>
            <Box sx={{ mt: 2 }}>
              <Typography sx={{ fontFamily: 'Poppins, sans-serif' }}>Price Per Lesson</Typography>
              <Slider
                value={filters.price}
                onChange={(e, newValue) => setFilters({ ...filters, price: newValue as number[] })}
                valueLabelDisplay="auto"
                min={100}
                max={1000}
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
                  $100
                </Typography>
                <Typography sx={{ fontFamily: 'Poppins, sans-serif', fontSize: '12px', color: '#000000' }}>
                  $500
                </Typography>
                <Typography sx={{ fontFamily: 'Poppins, sans-serif', fontSize: '12px', color: '#000000' }}>
                  $1000
                </Typography>
              </Box>
            </Box>

            <Box sx={{ mt: 2 }}>
              <div className="font-poppins">
                <FormControlLabel control={<Checkbox />} label="Male" />
                <FormControlLabel control={<Checkbox />} label="Female" />
              </div>
            </Box>

            <div className="flex gap-3 ml-8 mt-4 font-poppins">
              <Button
                sx={{ fontFamily: 'Poppins, sans-serif', borderRadius: "10px", textTransform: "none", borderColor: "#5FC2D3", color: "#5FC2D3" }}
                variant="outlined" onClick={handleClose}>Cancel</Button>
              <Button
                sx={{ fontFamily: 'Poppins, sans-serif', paddingLeft: "1.5rem", paddingRight: "1.5rem", borderRadius: "10px", textTransform: "none", backgroundColor: "#5FC2D3", color: "black" }}
                variant="contained" onClick={handleClose}>Apply</Button>
            </div>
          </div>
        </Popover> */}
      </div>
    </div>
  );
};

export default InstructorsInfo;