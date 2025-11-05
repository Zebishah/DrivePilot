import type React from "react";
import { useState, useEffect } from "react";
import { useQuery } from "@apollo/client";
import { Button, Box, Typography, Tooltip } from "@mui/material";
import L from "leaflet";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import "leaflet/dist/leaflet.css";

// Fix the icon issue
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";
import "leaflet/dist/leaflet.css";
import { IoStarOutline, IoStarSharp } from "react-icons/io5";
import {
  FaBook,
  FaCar,
  FaCogs,
  FaMoneyBillWave,
  FaSlidersH,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import {
  GET_NEARBY_INSTRUCTORS,
  getUserLocation,
} from "../../graphql/mutations/instructorPublic";
import { getMapCenterAndMarkers } from "../../utils/mapUtils";
import FilterPopover from "../FilterPopover";
import {
  BadgePercent,
  Disc,
  Percent,
  Star,
  TicketPercent,
  X,
} from "lucide-react";

import InstructorsListSkeleton from "../loaders/InstructorsListSkeleton";
import { GET_STUDENT_PROFILE } from "../../graphql/mutations/studentProfile";
import axios from "axios";
import { Discount } from "@mui/icons-material";
import { isAfter, isBefore, parseISO } from "date-fns";

type FiltersState = {
  coordinates: null | number[];
  areaRadius: number;
  rating: number;
  transmission: string | null;
  gender: string | null;
  price: number[];
  activeFilters: Record<string, any>;
  availability: string[];
  city: string;
  addressFilterApplied: false; // Add this flag
};
// Add this function to fetch coordinates for student's location

// Updated getInitialCoordinates function
const getInitialCoordinates = () => {
  // This function should be synchronous for useState's initial value
  // If you need async, use useEffect to update after mount
  return null;
};

const InstructorsInfo: React.FC = () => {
  const [filters, setFilters] = useState<FiltersState>({
    coordinates: getInitialCoordinates(), // Start with null, will be set by useEffect
    areaRadius: 50, // ✅ set area radius explicitly here
    rating: 0,
    transmission: null,
    gender: null,
    price: [1000, 10000],
    activeFilters: {},
    availability: [],
    city: "Berlin",
    addressFilterApplied: false,
  });

  // Geocode student location on component mount

  const [isInitialLoad, setIsInitialLoad] = useState(true); // Add this state
  const navigate = useNavigate();
  const { data: studentData, loading: studentLoading } =
    useQuery(GET_STUDENT_PROFILE);
  const [anchorEl, setAnchorEl] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
    setIsOpen(true);
  };

  const open = Boolean(anchorEl);
  const id = open ? "simple-popover" : undefined;

  // Fix default icon paths
  const DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
  });

  L.Marker.prototype.options.icon = DefaultIcon;
  // useEffect(() => {
  //   const fetchUserLocation = async () => {
  //     try {
  //       const coords = await getUserLocation();
  //       setFilters((prev) => ({
  //         ...prev,
  //         coordinates: coords,
  //       }));
  //       setIsInitialLoad(false); // Set to false when location is loaded
  //     } catch (error) {
  //       console.error("Error fetching user location:", error);
  //       setIsInitialLoad(false); // Also set to false if there's an error
  //     }
  //   };

  //   fetchUserLocation();
  // }, []);
  const fetchCoordinatesForLocation = async (locationName: string) => {
    try {
      const response = await axios.get(
        "https://nominatim.openstreetmap.org/search",
        {
          params: {
            q: locationName,
            format: "json",
            addressdetails: 1,
            limit: 1, // Only need the first result
            countrycodes: "ch", // Restrict to Switzerland
          },
        }
      );

      if (response.data && response.data.length > 0) {
        const place = response.data[0];

        // Filter to ensure it's from Switzerland
        if (place.address && place.address.country_code === "ch") {
          // Return coordinates in the same format as AddressSearch
          return [Number.parseFloat(place.lon), Number.parseFloat(place.lat)];
        }
      }

      return null;
    } catch (error) {
      console.error("Error fetching coordinates for location:", error);
      return null;
    }
  };
  useEffect(() => {
    const initializeCoordinates = async () => {
      try {
        // Try to use user's current coordinates immediately
        const userCoords = await getUserLocation();
        setFilters((prev) => ({
          ...prev,
          coordinates: userCoords,
        }));
        setIsInitialLoad(false); // Allow instructor query to start now

        // Then run geocoding in the background (non-blocking)
        if (studentData?.studentProfile?.location) {
          fetchCoordinatesForLocation(studentData.studentProfile.location)
            .then((coords) => {
              if (coords) {
                setFilters((prev) => ({
                  ...prev,
                  coordinates: coords,
                }));
              }
            })
            .catch((err) => {
              console.warn("Geocoding failed (ignored):", err);
            });
        }
      } catch (error) {
        console.error("Error initializing coordinates:", error);
        setIsInitialLoad(false);
      }
    };

    if (isInitialLoad) {
      initializeCoordinates();
    }
  }, [studentData?.studentProfile?.location, isInitialLoad]);

  const [filtersApplied, setFiltersApplied] = useState(false);

  const { loading, error, data } = useQuery(GET_NEARBY_INSTRUCTORS, {
    variables: {
      filter: filters.activeFilters,
      offset: 0,
    },
    fetchPolicy: "network-only",
    skip: !filtersApplied && !filters.coordinates,
  });

  const handleApplyFilters = (filters) => {
    const activeFilters = {
      ...(filters.transmission && { transmission: filters.transmission }),
      ...(filters.gender?.length && { gender: filters.gender }),
      ...(filters.rating > 0 && { minRating: filters.rating }),
      ...((filters.price[0] > 1000 || filters.price[1] < 10000) && {
        priceMin: filters.price[0],
        priceMax: filters.price[1],
      }),
      // Only include coordinates if explicitly set through address filter
      // Check if coordinates were set through the address filter, not just from initial load
      // In handleApplyFilters
      ...(filters.addressFilterApplied && // Check this flag first
        filters.coordinates &&
        filters.coordinates[0] !== 0 &&
        filters.areaRadius > 0 && {
          coordinates: filters.coordinates,
          areaRadius: filters.areaRadius,
        }),
      ...(filters.availability.length > 0 && {
        availableDates: filters.availability,
      }),
    };

    setFilters((prev) => ({
      ...prev,
      activeFilters,
    }));

    setIsOpen(false);
    setFiltersApplied(true);
  };
  const handleResetFilters = () => {
    setFilters({
      ...filters, // Keep current coordinates
      areaRadius: 50,
      rating: 0,
      transmission: null,
      gender: null,
      price: [1000, 10000],
      activeFilters: {},
      availability: [],
      addressFilterApplied: false, // Reset the flag
    });
  };

  // Load more instructors
  // const loadMoreInstructors = () => {
  //   const currentLength = data?.getNearbyInstructors?.instructors?.length || 0;

  //   fetchMore({
  //     variables: {
  //       offset: currentLength,
  //       // limit: 10,
  //       filter: filters.activeFilters, // Include ALL active filters
  //     },
  //     updateQuery: (prev, { fetchMoreResult }) => {
  //       if (!fetchMoreResult) return prev;
  //       return {
  //         getNearbyInstructors: {
  //           ...fetchMoreResult.getNearbyInstructors,
  //           instructors: [
  //             ...prev.getNearbyInstructors.instructors,
  //             ...fetchMoreResult.getNearbyInstructors.instructors,
  //           ],
  //           // Maintain the totalCount from the initial query
  //           totalCount: prev.getNearbyInstructors.totalCount,
  //           // Update hasMore based on the new data length
  //           hasMore:
  //             prev.getNearbyInstructors.instructors.length +
  //               fetchMoreResult.getNearbyInstructors.instructors.length <
  //             prev.getNearbyInstructors.totalCount,
  //         },
  //       };
  //     },
  //   });
  // };

  const instructors = data?.getNearbyInstructors?.instructors || [];

  // const hasMore = data?.getNearbyInstructors?.hasMore || false;

  const { mapCenter, markers } = getMapCenterAndMarkers(
    filters?.coordinates,
    instructors
  );

  const generateFilterChips = () => {
    const chips: { label: string; key: string }[] = [];

    // Price Range
    if (filters.price[0] !== 1000 || filters.price[1] !== 10000) {
      chips.push({
        label: `Price: $${filters.price[0]} - $${filters.price[1]}`,
        key: "price",
      });
    }

    // Rating
    if (filters.rating > 0) {
      chips.push({
        label: `Rating: ${filters.rating}+ Stars`,
        key: "rating",
      });
    }

    // Transmission
    if (filters.transmission) {
      chips.push({
        label: `Transmission: ${filters.transmission}`,
        key: "transmission",
      });
    }

    // Gender
    if (filters.gender) {
      chips.push({
        label: `Gender: ${filters.gender}`,
        key: "gender",
      });
    }

    // Availability
    if (filters.availability.length > 0) {
      chips.push({
        label: `Availability: ${filters.availability.join(", ")}`,
        key: "availability",
      });
    }

    // Area Radius
    if (filters.coordinates && filters.areaRadius !== 50) {
      chips.push({
        label: `Radius: ${filters.areaRadius} km`,
        key: "areaRadius",
      });
    }

    return chips;
  };

  // Function to remove a specific filter
  const handleDeleteFilter = (key: string) => {
    const resetFilterMap: Record<string, any> = {
      price: [1000, 10000],
      rating: 0,
      transmission: null,
      gender: null,
      availability: [],
      areaRadius: 50,
      coordinates: null,
    };

    setFilters((prev: any) => ({
      ...prev,
      [key]: resetFilterMap[key],
    }));
  };
  const filterChips = generateFilterChips();

  const handleViewDetails = (instructorId: string) => {
    if (location.pathname.includes("/student-dashboard/search")) {
      navigate(`/student-dashboard/search/instructors/${instructorId}`);
    } else {
      navigate(`/instructors/${instructorId}`);
    }
  };

  const [allInstructorsForDates, setAllInstructorsForDates] = useState([]);

  // In your useEffect or where you first load instructors
  useEffect(() => {
    // When you first load instructors (before any filters), store them
    if (data?.getNearbyInstructors?.instructors && !filtersApplied) {
      setAllInstructorsForDates(data.getNearbyInstructors.instructors);
    }
  }, [data?.getNearbyInstructors?.instructors, filtersApplied]);

  return (
    <div className="w-[90%] mx-auto overflow-x-hidden">
      <h1 className="text-3xl font-harabara font-bold mb-4 text-center">
        Nearby Instructors
      </h1>
      <div className="flex gap-4 items-center">
        <Button
          variant="contained"
          onClick={handleClick}
          startIcon={<FaSlidersH />}
          sx={{
            fontFamily: "Poppins, sans-serif",
            backgroundColor: "#5FC2D3",
            color: "black",
            textTransform: "none",
            paddingLeft: "2rem",
            paddingRight: "2rem",
            "&:hover": {
              backgroundColor: "#4AB0C0",
            },
            "& .MuiButton-startIcon": {
              marginRight: "0.5rem",
              display: "flex",
              alignItems: "center",
            },
          }}
        >
          Filter
        </Button>

        <Button
          variant="contained"
          onClick={handleResetFilters}
          startIcon={<X size={20} />}
          sx={{
            fontFamily: "Poppins, sans-serif",
            backgroundColor: "#5FC2D3",
            color: "black",
            textTransform: "none",
            paddingLeft: "2rem",
            paddingRight: "2rem",
            "&:hover": {
              backgroundColor: "#4AB0C0",
            },
            "& .MuiButton-startIcon": {
              marginRight: "0.5rem",
              display: "flex",
              alignItems: "center",
            },
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
        instructors={instructors} // Current filtered results
        allInstructors={allInstructorsForDates} // All instructors for dates
      />
      {(isInitialLoad || loading) && (
        <div className="m-12">
          <InstructorsListSkeleton />{" "}
        </div>
      )}

      {!isInitialLoad &&
        !loading &&
        data?.getNearbyInstructors?.instructors.length === 0 && (
          <Box
            display="flex"
            flexDirection="column"
            justifyContent="center"
            alignItems="center"
            minHeight="60vh"
            textAlign="center"
            p={3}
          >
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
        )}

      {!isInitialLoad &&
        !loading &&
        data?.getNearbyInstructors?.instructors.length !== 0 && (
          <div className="flex flex-col md:flex-row p-4 font-poppins">
            {/* Instructor List */}
            <div className="w-full md:w-1/2 space-y-4 relative max-h-[900px] overflow-y-auto pr-2">
              {instructors
                .filter(
                  (instructor) =>
                    instructor.verificationStatus !== "rejected" &&
                    instructor.verificationStatus !== "pending"
                )
                .map((instructor) => (
                  <div
                    key={instructor._id}
                    className="pl-4 drop-shadow-md mt-4 bg-white pt-2 rounded-lg flex flex-col md:flex-row items-center md:items-start text-left relative "
                  >
                    {/* Instructor card content */}
                    <div className="flex flex-col items-center md:items-start md:w-1/3 mb-2">
                      <img
                        src={
                          instructor.profileImage ||
                          "/images/Portrait_Placeholder.png"
                        }
                        alt="Instructor"
                        className="w-24 h-24 rounded-full mb-4 object-cover"
                      />
                      <h2 className="text-lg font-bold mb-1">
                        {instructor.firstName} {instructor.lastName}
                      </h2>
                      <Tooltip
                        title={instructor.address || ""}
                        arrow
                        placement="top"
                      >
                        <p className="text-gray-500 mb-2 cursor-pointer">
                          {instructor.address && instructor.address.length > 30
                            ? instructor.address.slice(0, 30) + "..."
                            : instructor.address}
                        </p>
                      </Tooltip>
                      <Box
                        sx={{
                          display: "flex",
                          gap: 0.5,
                          mt: 1,
                          flexDirection: "column",
                        }}
                      >
                        <Box>
                          {[...Array(5)].map((_, index) => {
                            const starNumber = index + 1;
                            const rating = instructor.totalReviews;

                            // Determine fill percentage for this star
                            let fillPercentage = 0;
                            if (rating >= starNumber) {
                              fillPercentage = 100; // Full star
                            } else if (rating > starNumber - 1) {
                              fillPercentage =
                                (rating - (starNumber - 1)) * 100; // Partial star
                            }

                            return (
                              <Box
                                key={index}
                                sx={{
                                  position: "relative",
                                  display: "inline-block",
                                }}
                              >
                                {/* Background star (unfilled) */}
                                <Star size={20} fill="none" stroke="#ccc" />
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
                                  <Star
                                    size={20}
                                    fill="#FFD700"
                                    stroke="#FFD700"
                                  />
                                </Box>
                              </Box>
                            );
                          })}
                        </Box>
                        <Box sx={{ ml: 0.5 }}>
                          ({instructor.reviewsCount || 0} review
                          {instructor.reviewsCount &&
                          instructor.reviewsCount > 1
                            ? "s"
                            : ""}
                          )
                        </Box>
                      </Box>
                    </div>

                    {/* Right side details */}
                    <div className="w-full p-6">
                      <div className="text-left">
                        <p className="flex items-center gap-2 mb-2">
                          <FaBook />{" "}
                          {`${instructor.details?.degree} Years` || "N/A"}
                        </p>
                        <p className="flex items-center gap-2 mb-2">
                          <FaCar /> {instructor.details?.car || "N/A"}
                        </p>
                        <p className="flex items-center gap-2 mb-2">
                          <FaCogs /> {instructor.details?.type || "N/A"}
                        </p>
                        <p className="flex items-center gap-2">
                          <FaMoneyBillWave />
                          {instructor.details?.rate
                            ? (() => {
                                return (
                                  <>
                                    <span
                                      className={`${instructor.details.lessonDiscount > 0 ? "line-through" : ""} text-gray-800`}
                                    >
                                      CHF {instructor.details.rate}/hr
                                    </span>
                                    {instructor.details.lessonDiscount > 0 ? (
                                      <span className="ml-2 text-green-600 font-semibold">
                                        CHF{" "}
                                        {(
                                          instructor.details.rate *
                                          (1 -
                                            instructor.details.lessonDiscount /
                                              100)
                                        ).toFixed(2)}
                                      </span>
                                    ) : null}
                                  </>
                                );
                              })()
                            : "N/A"}
                        </p>
                        {instructor.details.lessonDiscount > 0 && (
                          <p className="flex items-center gap-2 mt-2">
                            <BadgePercent size={18} />
                            {instructor.details?.lessonDiscount || "N/A"}%
                          </p>
                        )}
                      </div>
                      <Button
                        variant="contained"
                        className="w-full"
                        style={{
                          backgroundColor: "#5FC2D3",
                          borderRadius: "10px",
                          marginTop: "2rem",
                          textTransform: "none",
                          color: "black",
                        }}
                        onClick={() => handleViewDetails(instructor._id)}
                      >
                        Book Now
                      </Button>
                    </div>
                  </div>
                ))}

              {/* {hasMore && (
              <div className="text-center mt-4">
                <Button
                  variant="outlined"
                  onClick={loadMoreInstructors}
                  className="bg-[#5FC2D3] text-black"
                >
                  Load More Instructors
                </Button>
              </div>
            )} */}
            </div>

            <div className="w-full md:w-1/2 mt-4 h-96 md:h-auto pl-4">
              <MapContainer
                center={mapCenter}
                zoom={10}
                className="h-full w-full rounded-lg"
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {markers.map((marker) => (
                  <Marker key={marker.id} position={marker.position} />
                ))}
              </MapContainer>
            </div>
          </div>
        )}
    </div>
  );
};

export default InstructorsInfo;
