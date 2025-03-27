import type React from "react";
import { useState, useEffect } from "react";
import { useQuery } from '@apollo/client';
import { Button, Box, Typography, CircularProgress, Chip } from "@mui/material";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { IoStarSharp } from "react-icons/io5";
import { FaBook, FaCar, FaCogs, FaMoneyBillWave, FaSlidersH } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { GET_NEARBY_INSTRUCTORS, getUserLocation } from "../../graphql/mutations/instructorPublic";
import { getMapCenterAndMarkers } from "../../utils/mapUtils";
import FilterPopover from "../FilterPopover";
import { X } from "lucide-react";
import InstructorsListSkeleton from "../loaders/InstructorsListSkeleton";
const InstructorsInfo: React.FC = () => {
  const [filters, setFilters] = useState({
    coordinates: null,
    areaRadius: 50,
    rating: 0,
    transmission: null,
    gender: null,
    price: [1000, 10000],
    activeFilters: {},
    availability: [],
  });

  const navigate = useNavigate();

  const [anchorEl, setAnchorEl] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
    setIsOpen(true)
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

  const [filtersApplied, setFiltersApplied] = useState(false);

  const { loading, error, data, fetchMore } = useQuery(GET_NEARBY_INSTRUCTORS, {
    variables: {
      filter: filters.activeFilters,
      limit: 5,
      offset: 0
    },
    fetchPolicy: 'network-only',
    skip: !filtersApplied && !filters.coordinates
  });

  const handleApplyFilters = (filters) => {
    const activeFilters = {
      ...(filters.transmission && { transmission: filters.transmission }),
      ...(filters.gender?.length && { gender: filters.gender }),
      ...(filters.rating > 0 && { minRating: filters.rating }),
      ...((filters.price[0] > 1000 || filters.price[1] < 10000) && {
        priceMin: filters.price[0],
        priceMax: filters.price[1]
      }),
      ...(filters.coordinates && filters.coordinates[0] !== 0 && {
        coordinates: filters.coordinates,
        areaRadius: filters.areaRadius
      }),
      ...(filters.availability.length > 0 && {
        availableDates: filters.availability
      })
    };

    setFilters(prev => ({
      ...prev,
      activeFilters
    }));


    setIsOpen(false)
    setFiltersApplied(true);
  };
  const handleResetFilters = () => {
    setFilters({
      coordinates: filters.coordinates,
      areaRadius: 50,
      rating: 0,
      transmission: null,
      gender: null,
      price: [1000, 10000],
      activeFilters: {},
      availability: [],
    });
    setIsOpen(false)
  };

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


  const instructors = data?.getNearbyInstructors?.instructors || [];
  const hasMore = data?.getNearbyInstructors?.hasMore || false;

  const { mapCenter, markers } = getMapCenterAndMarkers(filters?.coordinates, instructors);

  const generateFilterChips = () => {
    const chips: { label: string, key: string }[] = [];

    // Price Range
    if (filters.price[0] !== 1000 || filters.price[1] !== 10000) {
      chips.push({
        label: `Price: $${filters.price[0]} - $${filters.price[1]}`,
        key: 'price'
      });
    }

    // Rating
    if (filters.rating > 0) {
      chips.push({
        label: `Rating: ${filters.rating}+ Stars`,
        key: 'rating'
      });
    }

    // Transmission
    if (filters.transmission) {
      chips.push({
        label: `Transmission: ${filters.transmission}`,
        key: 'transmission'
      });
    }

    // Gender
    if (filters.gender) {
      chips.push({
        label: `Gender: ${filters.gender}`,
        key: 'gender'
      });
    }

    // Availability
    if (filters.availability.length > 0) {
      chips.push({
        label: `Availability: ${filters.availability.join(', ')}`,
        key: 'availability'
      });
    }

    // Area Radius
    if (filters.coordinates && filters.areaRadius !== 50) {
      chips.push({
        label: `Radius: ${filters.areaRadius} km`,
        key: 'areaRadius'
      });
    }

    return chips;
  };

  // Function to remove a specific filter
  const handleDeleteFilter = (key: string) => {
    const resetFilterMap: Record<string, any> = {
      'price': [1000, 10000],
      'rating': 0,
      'transmission': null,
      'gender': null,
      'availability': [],
      'areaRadius': 50,
      'coordinates': null
    };

    setFilters((prev: any) => ({
      ...prev,
      [key]: resetFilterMap[key]
    }));
  };
  const filterChips = generateFilterChips();

  return (
    <div className="max-w-screen-xl mx-auto overflow-x-hidden">
      <h1 className="text-3xl font-harabara font-bold mb-4 text-center">
        Nearby Instructors
      </h1>
      <div className="flex gap-4 items-center">
        <Button
          variant="contained"
          onClick={handleClick}
          startIcon={<FaSlidersH />}
          sx={{
            fontFamily: 'Poppins, sans-serif',
            backgroundColor: '#5FC2D3',
            color: 'black',
            textTransform: 'none',
            paddingLeft: '2rem',
            paddingRight: '2rem',
            '&:hover': {
              backgroundColor: '#4AB0C0'
            },
            '& .MuiButton-startIcon': {
              marginRight: '0.5rem',
              display: 'flex',
              alignItems: 'center'
            }
          }}
        >
          Filters
        </Button>

        <Button
          variant="contained"
          onClick={handleResetFilters}
          startIcon={<X size={20} />}
          sx={{
            fontFamily: 'Poppins, sans-serif',
            backgroundColor: '#5FC2D3',
            color: 'black',
            textTransform: 'none',
            paddingLeft: '2rem',
            paddingRight: '2rem',
            '&:hover': {
              backgroundColor: '#4AB0C0'
            },
            '& .MuiButton-startIcon': {
              marginRight: '0.5rem',
              display: 'flex',
              alignItems: 'center'
            }
          }}
        >
          Reset Filters
        </Button>
      </div>
      <FilterPopover
        key={JSON.stringify(filters)}
        id="filter-popover"
        open={isOpen}
        anchorEl={anchorEl}
        onClose={() => setIsOpen(false)}
        initialFilters={filters}
        onApplyFilters={handleApplyFilters}
        resetFilters={handleResetFilters}
      />


      {loading && (<div className="m-12">
        <InstructorsListSkeleton /> </div>)}


      {
        !loading && data?.getNearbyInstructors?.instructors.length === 0 && (
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
        )
      }


      {!loading && data?.getNearbyInstructors?.instructors.length !== 0 && (
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


        </div>
      )}


    </div>

  );
};

export default InstructorsInfo;