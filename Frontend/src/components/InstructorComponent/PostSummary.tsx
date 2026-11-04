import React, { useState } from "react";
import { useQuery } from "@apollo/client";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  Box,
  Card,
  Avatar,
  Button,
  Typography,
  Tabs,
  Tab,
  Skeleton,
} from "@mui/material";
import Availability from "./Availability";
import Summary from "./Summary";

import { GET_INSTRUCTOR_PROFILE } from "../../graphql/mutations/instructorPublic";
import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  MapPin,
  ShieldCheck,
  Star,
} from "lucide-react";
import toast from "react-hot-toast";
import BulkLessonPackages from "./BulkPackageCard";
import { useAuth } from "../../context/AuthContext";
import { Reviews } from "@mui/icons-material";
import { BackButton } from "./common/BackButton";
import { IoStarOutline, IoStarSharp } from "react-icons/io5";
import InstructorReviews from "../StudentComponents/InstructorReviews";

// GraphQL Query remains the same as previous implementation

const ProfileSummary: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth(); // Assuming useAuth is defined in your context
  const [activeTab, setActiveTab] = React.useState(0);
  const [selectedPackage, setSelectedPackage] = useState(null);

  // Define or import the AvailabilitySlot type
  type AvailabilitySlot = {
    startTime: string;
    endTime: string;
    date: string;
    booked: boolean;
  };

  const [selectedAvailability, setSelectedAvailability] = React.useState<
    AvailabilitySlot[]
  >([]);

  const { loading, error, data, refetch } = useQuery(GET_INSTRUCTOR_PROFILE, {
    variables: { id: id || "" },
    errorPolicy: "all",
    fetchPolicy: "cache-and-network", // Ensures fresh data
  });
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handlePackageSelect = (packageData) => {
    setSelectedPackage(packageData);
    // Auto switch to availability tab when package is selected
    setActiveTab(0);
  };

  // Determine the actual data to use
  const instructor = data?.getInstructorPublicProfile?.instructor || {};
  const tariff = data?.getInstructorPublicProfile?.tariff || {};
  const availability = data?.getInstructorPublicProfile?.availability || [];
  const locationLabel =
    [instructor?.address, instructor?.location]
      .filter(
        (value) =>
          typeof value === "string" &&
          value.trim().length > 0 &&
          value.trim().toLowerCase() !== "undefined",
      )
      .join(", ") || "Location Not Available";
  const firstAvailableSlot = availability
    .flatMap((day: any) => day.availableSlots || [])
    .find((slot: any) => !slot.booked && slot.status !== "booked");
  const originalLessonFee = Number(tariff?.lessonFee || 0);
  const lessonDiscount = Number(tariff?.lessonDiscount || 0);
  const finalLessonFee =
    lessonDiscount > 0
      ? originalLessonFee * (1 - lessonDiscount / 100)
      : originalLessonFee;
  const handleBookNow = () => {
    if (selectedAvailability.length === 0) {
      toast.error("Please select an availability slot before booking.");
      return;
    }

    if (location.pathname.includes("/student-dashboard/search")) {
      navigate("/student-dashboard/book", {
        state: {
          instructorId: id,
          selectedAvailability: selectedAvailability,
          instructorData: {
            id: instructor.id || instructor._id || id,
            name: `${instructor.firstName} ${instructor.lastName}`,
            email: instructor.email,
            description: instructor.description,
            lessonFee: tariff.lessonFee,
          },
        },
      });
    } else {
      navigate("/auth/signin", {
        state: { from: location.pathname },
        replace: true,
      });
    }
  };

  // Render loading state with skeleton loaders
  if (loading) {
    return (
      <Box
        sx={{
          maxWidth: 1400,
          margin: "auto",
          marginTop: "3rem",
          padding: {
            xs: "0 1rem",
            sm: "0 2rem",
            md: "0 3rem",
            lg: "0 4rem",
            xl: "0 5rem",
          },
        }}
      >
        <Card
          sx={{ display: "flex", flexDirection: { xs: "column", md: "row" } }}
        >
          <Skeleton variant="rectangular" width={250} height={250} />
          <Box sx={{ flex: 1, padding: 2 }}>
            <Skeleton variant="text" width="60%" height={40} />
            <Skeleton variant="text" width="40%" height={30} />
            <Box sx={{ display: "flex", marginTop: 2 }}>
              {[1, 2, 3].map((item) => (
                <Box key={item} sx={{ flex: 1, marginRight: 2 }}>
                  <Skeleton variant="text" width="50%" />
                  <Skeleton variant="text" width="30%" />
                </Box>
              ))}
            </Box>
          </Box>
          <Skeleton
            variant="rectangular"
            width={150}
            height={50}
            sx={{ margin: 2 }}
          />
        </Card>
      </Box>
    );
  }
  if (!data?.getInstructorPublicProfile?.instructor || error) {
    return (
      <div className="ai-container dsp-market-error" role="alert">
        <h3>
          {error
            ? "We couldn’t load this instructor."
            : "Instructor not found."}
        </h3>
        <p>
          {error
            ? "Please try again, or explore other instructors."
            : "This profile may no longer be available."}
        </p>
        {error && <Button onClick={() => void refetch()}>Try again</Button>}
        <Button
          onClick={() =>
            navigate(
              location.pathname.startsWith("/student-dashboard")
                ? "/student-dashboard/search"
                : "/professional",
            )
          }
        >
          Browse instructors
        </Button>
      </div>
    );
  }
  const handleGoBack = () => {
    if (user) {
      navigate("/student-dashboard/search");
    } else {
      navigate("/professional");
    }
  };
  return (
    <Box className="dsp-instructor-profile-summary" sx={{ width: "100%" }}>
      <BackButton variant="outline" label="Back" />
      <Box
        sx={{
          maxWidth: 1600,
          margin: "auto",
          mt: "1rem",
          padding: {
            xs: "0 1rem",
            sm: "0 2rem",
            md: "0 3rem",
            lg: "0 4rem",
            xl: "0 5rem",
          },
        }}
      >
        <Card
          className="dsp-instructor-profile-summary__hero"
          sx={{ display: "flex", flexDirection: { xs: "column", md: "row" } }}
        >
          <Avatar
            src={instructor.profileImage || "/images/instructorprofile.png"}
            alt={`${instructor.firstName} ${instructor.lastName}`}
            sx={{
              width: { xs: 200, sm: 250 },
              maxWidth: { xs: 200, sm: 250 },
              height: { xs: 200, sm: 250, md: 190 },
              borderRadius: 2,
              ml: 2,
              mb: 2,
            }}
          />
          <Box
            className="dsp-instructor-profile-summary__details"
            sx={{
              flex: 1,
              mt: -3,
              padding: 2,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <Box
              sx={{
                marginTop: { xs: "1rem", sm: "1.5rem", md: "2rem" },
              }}
            >
              <Typography
                sx={{ fontFamily: "Poppins, sans-serif" }}
                variant="h5"
              >
                {`${instructor.firstName} ${instructor.lastName}`}
              </Typography>
              <Typography
                sx={{ fontFamily: "Poppins, sans-serif" }}
                variant="subtitle1"
                color="textSecondary"
              >
                {locationLabel}
              </Typography>
            </Box>
            <Box
              sx={{
                display: "flex",
                flexDirection: { xs: "column", md: "row" },
              }}
            >
              <Box
                sx={{
                  paddingRight: { md: "2rem" },
                  borderRight: { md: "1px solid #ccc" },
                  marginBottom: { xs: "1rem", md: "0" },
                }}
              >
                <Typography variant="body2">
                  <strong>{instructor.experience || 0} years</strong>
                </Typography>
                <Typography sx={{ fontFamily: "Poppins, sans-serif" }}>
                  of Experience
                </Typography>
              </Box>
              <Box
                sx={{
                  paddingLeft: "2rem",
                  paddingRight: "2rem",
                  borderRight: { md: "1px solid #ccc" },
                  marginBottom: { xs: "1rem", md: "0" },
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  {data?.getInstructorPublicProfile?.averageRating > 0 ? (
                    // Show filled stars when averageRating exists

                    <Box sx={{ display: "flex", gap: 0.5, mt: 1 }}>
                      {[...Array(5)].map((_, index) => {
                        const starNumber = index + 1;
                        const rating =
                          data?.getInstructorPublicProfile?.averageRating;

                        // Determine fill percentage for this star
                        let fillPercentage = 0;
                        if (rating >= starNumber) {
                          fillPercentage = 100; // Full star
                        } else if (rating > starNumber - 1) {
                          fillPercentage = (rating - (starNumber - 1)) * 100; // Partial star
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
                            <Star
                              size={20}
                              fill="none"
                              stroke="var(--ws-subtle, #ccc)"
                            />
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
                                fill="var(--ws-warning, #FFD700)"
                                stroke="var(--ws-warning, #FFD700)"
                              />
                            </Box>
                          </Box>
                        );
                      })}
                      <Box sx={{ ml: 0.5 }}>
                        ({data?.getInstructorPublicProfile?.reviewsCount} review
                        {data?.getInstructorPublicProfile?.reviewsCount &&
                        data?.getInstructorPublicProfile?.reviewsCount > 1
                          ? "s"
                          : ""}
                        )
                      </Box>
                    </Box>
                  ) : (
                    // Show empty star with "No reviews yet" when no rating
                    <>
                      <IoStarOutline
                        style={{
                          color: "var(--ws-subtle, #D1D5DB)",
                          marginRight: "0.5rem",
                        }}
                      />
                      <p className="mr-0.5 text-gray-500">No reviews yet</p>
                    </>
                  )}
                </Box>
                <Typography sx={{ fontFamily: "Poppins, sans-serif" }}>
                  Ratings
                </Typography>
              </Box>
              <Box sx={{ paddingLeft: "2rem" }}>
                <Typography variant="body2">
                  {tariff.lessonFee
                    ? (() => {
                        return (
                          <>
                            <span
                              className={`${tariff.lessonDiscount > 0 ? "line-through" : ""} text-gray-800`}
                            >
                              CHF {tariff.lessonFee}/hr
                            </span>
                            {tariff.lessonDiscount > 0 ? (
                              <span className="ml-2 text-green-600 font-semibold">
                                CHF{" "}
                                {(
                                  tariff.lessonFee *
                                  (1 - tariff.lessonDiscount / 100)
                                ).toFixed(2)}
                              </span>
                            ) : null}
                          </>
                        );
                      })()
                    : "N/A"}
                  {/* <strong>CHF {tariff.lessonFee || 0}/lesson</strong> */}
                </Typography>
                <Typography sx={{ fontFamily: "Poppins, sans-serif" }}>
                  Fair
                </Typography>
              </Box>
            </Box>
          </Box>
          <Box className="dsp-instructor-profile-summary__booking-card">
            <span className="dsp-instructor-profile-summary__booking-kicker">
              <ShieldCheck size={14} /> Ready to learn?
            </span>
            <Typography variant="h6">Book a lesson</Typography>
            <div className="dsp-instructor-profile-summary__booking-price">
              {lessonDiscount > 0 && (
                <del>CHF {originalLessonFee.toFixed(2)}</del>
              )}
              <strong>
                {finalLessonFee
                  ? `CHF ${finalLessonFee.toFixed(2)}`
                  : "Price not listed"}
              </strong>
              {finalLessonFee > 0 && <span>/ hour</span>}
            </div>
            {firstAvailableSlot ? (
              <div className="dsp-instructor-profile-summary__next-slot">
                <CalendarDays size={16} />
                <span>
                  <small>Next available</small>
                  {new Date(firstAvailableSlot.date).toLocaleDateString(
                    undefined,
                    { weekday: "short", month: "short", day: "numeric" },
                  )}{" "}
                  · {firstAvailableSlot.startTime}
                </span>
              </div>
            ) : (
              <div className="dsp-instructor-profile-summary__next-slot is-muted">
                <CalendarDays size={16} />
                <span>No upcoming availability</span>
              </div>
            )}
            <Button
              variant="contained"
              fullWidth
              disabled={loading}
              onClick={() => {
                if (selectedAvailability.length > 0) {
                  handleBookNow();
                  return;
                }
                document
                  .getElementById("dsp-availability-section")
                  ?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            >
              {selectedAvailability.length > 0
                ? "Book selected lesson"
                : "Choose a time"}
            </Button>
            <small className="dsp-instructor-profile-summary__booking-hint">
              <MapPin size={13} /> {locationLabel}
            </small>
          </Box>
        </Card>
        {tariff?.bulkPackages?.length > 0 && (
          <Card sx={{ marginTop: "0.5rem", padding: "0.5rem" }}>
            <BulkLessonPackages
              tariff={tariff}
              onPackageSelect={handlePackageSelect}
            />
          </Card>
        )}

        <Tabs
          className="dsp-instructor-profile-summary__tabs"
          aria-label="Instructor profile"
          sx={{
            marginTop: "1rem",
            "& .MuiTabs-indicator": {
              backgroundColor: "var(--ws-elevated, #000000)",
              fontWeight: "500",
              height: "2px",
            },
          }}
          value={activeTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab
            sx={{
              textTransform: "none",
              fontWeight: activeTab === 0 ? "600" : "400",
              color: activeTab === 0 ? "var(--ws-primary, #5FC2D3)" : "inherit",
              fontFamily: "Poppins, sans-serif",
            }}
            id="instructor-profile-tab-0"
            aria-controls="instructor-profile-panel"
            label="Availability"
          />
          <Tab
            sx={{
              textTransform: "none",
              fontWeight: activeTab === 1 ? "600" : "400",
              color: activeTab === 1 ? "var(--ws-primary, #5FC2D3)" : "inherit",
              fontFamily: "Poppins, sans-serif",
            }}
            id="instructor-profile-tab-1"
            aria-controls="instructor-profile-panel"
            label="Profile Summary"
          />
          <Tab
            sx={{
              textTransform: "none",
              fontWeight: activeTab === 2 ? "600" : "400",
              color: activeTab === 2 ? "var(--ws-primary, #5FC2D3)" : "inherit",
              fontFamily: "Poppins, sans-serif",
            }}
            id="instructor-profile-tab-2"
            aria-controls="instructor-profile-panel"
            label="Reviews"
          />
        </Tabs>

        <Box
          role="tabpanel"
          id="instructor-profile-panel"
          aria-labelledby={`instructor-profile-tab-${activeTab}`}
        >
          {activeTab === 0 && (
            <Availability
              availabilityData={availability}
              loading={loading}
              instructorData={instructor.id || instructor._id || id}
              onSelectAvailability={setSelectedAvailability}
              selectedPackage={selectedPackage}
            />
          )}
          {activeTab === 1 && (
            <Summary
              instructorData={instructor}
              tariffData={tariff}
              loading={loading}
            />
          )}
          {activeTab === 2 && (
            <>
              {" "}
              <InstructorReviews
                instructorId={instructor.id || instructor._id || id}
                activeTab={activeTab}
              />{" "}
            </>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default ProfileSummary;
