import type React from "react";
import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@apollo/client";
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
  Search,
  Star,
  TicketPercent,
  X,
  Heart,
  GitCompareArrows,
} from "lucide-react";

import InstructorsListSkeleton from "../loaders/InstructorsListSkeleton";
import { GET_STUDENT_PROFILE } from "../../graphql/mutations/studentProfile";
import axios from "axios";
import { Discount } from "@mui/icons-material";
import { isAfter, isBefore, parseISO } from "date-fns";
import { GET_FAVORITE_INSTRUCTORS } from "../../graphql/Queries/productCapabilities";
import { gql } from "@apollo/client";

const SAVE_INSTRUCTOR = gql`mutation SaveInstructor($instructorId: ID!) { saveInstructor(instructorId: $instructorId) { id } }`;
const UNSAVE_INSTRUCTOR = gql`mutation UnsaveInstructor($instructorId: ID!) { unsaveInstructor(instructorId: $instructorId) }`;

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

const formatSearchDate = (date: string) => {
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime())
    ? date
    : parsed.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
};

const getNextAvailableSlot = (instructor: any) =>
  (instructor.availability || [])
    .flatMap((day: any) => day.availableSlots || [])
    .find((slot: any) => !slot.booked && slot.status !== "booked");

const InstructorsInfo: React.FC<{ studentMode?: boolean }> = ({ studentMode = false }) => {
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
  const { data: favoritesData } = useQuery(GET_FAVORITE_INSTRUCTORS, { skip: !studentMode });
  const [saveInstructor, { loading: savingInstructor }] = useMutation(SAVE_INSTRUCTOR, { refetchQueries: [GET_FAVORITE_INSTRUCTORS] });
  const [unsaveInstructor, { loading: unsavingInstructor }] = useMutation(UNSAVE_INSTRUCTOR, { refetchQueries: [GET_FAVORITE_INSTRUCTORS] });
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const favoriteIds = new Set((favoritesData?.favoriteInstructors || []).map((favorite: { instructor: { id: string } }) => favorite.instructor.id));
  const toggleCompare = (id: string) => setCompareIds((current) => current.includes(id) ? current.filter((item) => item !== id) : current.length < 3 ? [...current, id] : current);

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
  const visibleInstructors = instructors.filter(
    (instructor) =>
      instructor.verificationStatus !== "rejected" &&
      instructor.verificationStatus !== "pending",
  );
  const comparedInstructors = visibleInstructors.filter((instructor) => compareIds.includes(instructor._id));
  const onlyPendingInstructors =
    instructors.length > 0 && visibleInstructors.length === 0;

  // const hasMore = data?.getNearbyInstructors?.hasMore || false;

  const { mapCenter, markers } = getMapCenterAndMarkers(
    filters?.coordinates,
    visibleInstructors,
  );

  const generateFilterChips = () => {
    const chips: { label: string; key: string }[] = [];

    // Price Range
    if (filters.price[0] !== 1000 || filters.price[1] !== 10000) {
      chips.push({
        label: `Price: CHF ${filters.price[0]} - CHF ${filters.price[1]}`,
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
    const nextFilters = {
      ...filters,
      [key]: resetFilterMap[key],
      ...(key === "coordinates" ? { addressFilterApplied: false } : {}),
    };
    handleApplyFilters(nextFilters);
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
    <div className={`dsp-instructor-results ${studentMode ? "dsp-instructor-results--student" : ""}`}>
      <div className="dsp-instructor-results__toolbar">
        <div className="dsp-instructor-results__toolbar-copy">
          <span className="dsp-instructor-results__eyebrow">Browse instructors</span>
          <strong>{isInitialLoad || loading ? "Loading instructors…" : `${visibleInstructors.length} ${visibleInstructors.length === 1 ? "instructor" : "instructors"} found`}</strong>
        </div>
        <div className="dsp-instructor-results__toolbar-actions">
        <Button
          variant="contained"
          onClick={handleClick}
          startIcon={<FaSlidersH />}
          className="dsp-instructor-results__filter-button"
          sx={{
            fontFamily: "Poppins, sans-serif",
            backgroundColor: "var(--ws-primary, #5FC2D3)",
            color: "var(--ws-ink, #000000)",
            textTransform: "none",
            paddingLeft: "2rem",
            paddingRight: "2rem",
            "&:hover": {
              backgroundColor: "var(--ws-primary, #4AB0C0)",
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
          className="dsp-instructor-results__reset-button"
          sx={{
            fontFamily: "Poppins, sans-serif",
            backgroundColor: "var(--ws-primary, #5FC2D3)",
            color: "var(--ws-ink, #000000)",
            textTransform: "none",
            paddingLeft: "2rem",
            paddingRight: "2rem",
            "&:hover": {
              backgroundColor: "var(--ws-primary, #4AB0C0)",
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
      {filterChips.length > 0 && (
        <div className="dsp-instructor-results__chips" aria-label="Active filters">
          {filterChips.map((chip) => (
            <button type="button" key={chip.key} onClick={() => handleDeleteFilter(chip.key)}>
              {chip.label}
              <X size={13} aria-hidden="true" />
            </button>
          ))}
        </div>
      )}
      {(isInitialLoad || loading) && (
        <div className="dsp-instructor-results__loading">
          <InstructorsListSkeleton />{" "}
        </div>
      )}

      {!isInitialLoad &&
        !loading &&
        visibleInstructors.length === 0 && (
          <Box className="dsp-instructor-results__empty">
            <Search size={28} aria-hidden="true" />
            <Typography variant="h5" gutterBottom>
              No instructors found
            </Typography>
            <Typography variant="body1" color="textSecondary" paragraph>
              {onlyPendingInstructors
                ? "The available instructor is still completing verification and payment setup. Please check back soon."
                : filtersApplied
                ? "No instructors match your current filters. Try resetting the filters to broaden your search."
                : "Instructors appear here after completing their profile, verification, and payment setup."}
            </Typography>
            <Button
              variant="contained"
              className="dsp-instructor-results__empty-action"
              onClick={handleResetFilters}
            >
              Reset filters
            </Button>
          </Box>
        )}

      {!isInitialLoad &&
        !loading &&
        visibleInstructors.length !== 0 && (
          <div className="dsp-instructor-results__workspace">
            {/* Instructor List */}
            <div className="dsp-instructor-results__list">
              {visibleInstructors.map((instructor) => {
                  const paymentReady = instructor.isPaymentReady;
                  const nextSlot = getNextAvailableSlot(instructor);
                  const reviewsCount = Number(instructor.reviewsCount || 0);
                  const rating = Number(instructor.rating || 0);
                  const originalRate = Number(instructor.details?.rate || 0);
                  const discount = Number(instructor.details?.lessonDiscount || 0);
                  const finalRate = discount > 0 ? originalRate * (1 - discount / 100) : originalRate;
                  return (
                  <article
                    key={instructor._id}
                    className="dsp-instructor-result-card"
                  >
                    <div className="dsp-instructor-result-card__top">
                      <img
                        src={
                          instructor.profileImage ||
                          "/images/Portrait_Placeholder.png"
                        }
                        alt={`${instructor.firstName} ${instructor.lastName}`}
                        className="dsp-instructor-result-card__photo"
                      />
                      <div className="dsp-instructor-result-card__identity">
                        <h2>{instructor.firstName} {instructor.lastName}</h2>
                        <Tooltip title={instructor.address || instructor.location || ""} arrow placement="top">
                          <span className="dsp-instructor-result-card__location">{instructor.address || instructor.location || "Location not available"}</span>
                        </Tooltip>
                        <div className="dsp-instructor-result-card__rating">
                          {reviewsCount > 0 ? (
                            <><span className="dsp-instructor-result-card__stars" aria-label={`${rating} out of 5 stars`}>★★★★★</span><strong>{rating ? rating.toFixed(1) : "—"}</strong><span>({reviewsCount} {reviewsCount === 1 ? "review" : "reviews"})</span></>
                          ) : <span>No reviews yet</span>}
                        </div>
                      </div>
                    </div>

                    <div className="dsp-instructor-result-card__body">
                      <div className="dsp-instructor-result-card__facts">
                        <span><FaBook /> {instructor.details?.degree ? `${instructor.details.degree} years` : "Experience not listed"}</span>
                        <span><FaCar /> {instructor.details?.car || "Vehicle not listed"}</span>
                        <span><FaCogs /> {instructor.details?.type || "Transmission not listed"}</span>
                      </div>
                      {nextSlot && <span className="dsp-instructor-result-card__next-slot">Next available: {formatSearchDate(nextSlot.date)} · {nextSlot.startTime}</span>}
                      <div className="dsp-instructor-result-card__price-row">
                        <div className="dsp-instructor-result-card__price">
                          {discount > 0 && <span className="dsp-instructor-result-card__original-price">CHF {originalRate.toFixed(2)}/hr</span>}
                          <strong>{finalRate ? `CHF ${finalRate.toFixed(2)}` : "Price not listed"}</strong>
                          {finalRate && <small>/ hr</small>}
                        </div>
                        {discount > 0 && <span className="dsp-instructor-result-card__discount">-{discount}%</span>}
                      </div>
                      <div className="dsp-instructor-result-card__actions">
                        <Button variant="outlined" onClick={() => handleViewDetails(instructor._id)} className="dsp-instructor-result-card__secondary-action">View profile</Button>
                        {studentMode && <Button variant="text" disabled={savingInstructor || unsavingInstructor} onClick={() => favoriteIds.has(instructor._id) ? unsaveInstructor({ variables: { instructorId: instructor._id } }) : saveInstructor({ variables: { instructorId: instructor._id } })} aria-label={`${favoriteIds.has(instructor._id) ? "Remove" : "Save"} ${instructor.firstName} ${instructor.lastName}`}><Heart size={16} fill={favoriteIds.has(instructor._id) ? "currentColor" : "none"} /> {favoriteIds.has(instructor._id) ? "Saved" : "Save"}</Button>}
                        {studentMode && <Button variant="text" onClick={() => toggleCompare(instructor._id)} aria-pressed={compareIds.includes(instructor._id)}><GitCompareArrows size={16} /> {compareIds.includes(instructor._id) ? "Compared" : "Compare"}</Button>}
                        <Tooltip title={paymentReady ? "" : "This instructor is not ready for paid bookings yet."} arrow>
                          <span>
                            <Button variant="contained" disabled={!paymentReady} onClick={() => handleViewDetails(instructor._id)} className="dsp-instructor-result-card__primary-action">
                              {paymentReady ? "Book lesson" : "Not available yet"}
                            </Button>
                          </span>
                        </Tooltip>
                      </div>
                    </div>
                  </article>
                );
              })}

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

            <aside className="dsp-instructor-results__map-panel">
              <div className="dsp-instructor-results__map-heading">
                <div><span>Nearby instructors</span><strong>Map view</strong></div>
                <span>{markers.length} {markers.length === 1 ? "location" : "locations"}</span>
              </div>
              <MapContainer
                center={mapCenter}
                zoom={10}
                className="dsp-instructor-results__map"
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {markers.map((marker) => (
                  <Marker key={marker.id} position={marker.position} />
                ))}
              </MapContainer>
            </aside>
          </div>
        )}
      {studentMode && compareIds.length > 1 && <Box className="dsp-instructor-compare-bar" role="region" aria-label="Instructor comparison"><span><strong>{compareIds.length}</strong> instructors selected</span><Box className="dsp-instructor-compare-bar__items">{comparedInstructors.map((instructor) => <span key={instructor._id}>{instructor.firstName} {instructor.lastName}</span>)}</Box><Button size="small" onClick={() => setCompareIds([])}>Clear</Button></Box>}
    </div>
  );
};

export default InstructorsInfo;
