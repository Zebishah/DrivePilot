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
import { ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import BulkLessonPackages from "./BulkPackageCard";
import { useAuth } from "../../context/AuthContext";
import { Reviews } from "@mui/icons-material";
import { fallbackInstructor, fallbackTariff } from "../../types/HourSlots";
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

  const { loading, error, data } = useQuery(GET_INSTRUCTOR_PROFILE, {
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

  // Fallback data for when no data is available

  const fallbackAvailability = [];

  // Determine the actual data to use
  const instructor =
    data?.getInstructorPublicProfile?.instructor || fallbackInstructor;
  const tariff = data?.getInstructorPublicProfile?.tariff || fallbackTariff;
  const availability =
    data?.getInstructorPublicProfile?.availability || fallbackAvailability;
  console.log("instructor", instructor);
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
            id: instructor._id,
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
  const handleGoBack = () => {
    if (user) {
      navigate("/student-dashboard/search");
    } else {
      navigate("/professional");
    }
  };
  return (
    <Box sx={{ width: "100%" }}>
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
                {`${instructor?.address} , ${instructor.location} ` ||
                  "Location Not Available"}
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
                    <>
                      {[1].map((_, i) => (
                        <IoStarSharp
                          key={i}
                          style={{ color: "#FFDB20", marginRight: "0.5rem" }}
                        />
                      ))}
                      <p className="mr-0.5">
                        {data?.getInstructorPublicProfile?.averageRating}
                      </p>
                    </>
                  ) : (
                    // Show empty star with "No reviews yet" when no rating
                    <>
                      <IoStarOutline
                        style={{ color: "#D1D5DB", marginRight: "0.5rem" }}
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
          {/* <Button
            variant="contained"
            disabled={loading}
            onClick={handleBookNow}
            sx={{
              margin: 2,
              marginTop: { xs: 2, md: 8 },
              alignSelf: "center",
              backgroundColor: "#55AFBD",
              width: { xs: "12rem", sm: "14rem" },
              height: "3rem",
              textTransform: "none",
              fontFamily: "Poppins, sans-serif",
              color: "black",
              opacity: loading ? 0.5 : 1,
            }}
          >
            {loading ? "Loading..." : "Book Now"}
          </Button> */}
        </Card>
        {tariff?.bulkPackages.length > 0 && (
          <Card sx={{ marginTop: "0.5rem", padding: "0.5rem" }}>
            <BulkLessonPackages
              tariff={tariff}
              onPackageSelect={handlePackageSelect}
            />
          </Card>
        )}

        <Tabs
          sx={{
            marginTop: "1rem",
            "& .MuiTabs-indicator": {
              backgroundColor: "black",
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
              color: activeTab === 0 ? "black !important" : "inherit",
              fontFamily: "Poppins, sans-serif",
            }}
            label="Availability"
          />
          <Tab
            sx={{
              textTransform: "none",
              fontWeight: activeTab === 1 ? "600" : "400",
              color: activeTab === 1 ? "black !important" : "inherit",
              fontFamily: "Poppins, sans-serif",
            }}
            label="Profile Summary"
          />
          <Tab
            sx={{
              textTransform: "none",
              fontWeight: activeTab === 2 ? "600" : "400",
              color: activeTab === 2 ? "black !important" : "inherit",
              fontFamily: "Poppins, sans-serif",
            }}
            label="Reviews"
          />
        </Tabs>

        {activeTab === 0 && (
          <Availability
            availabilityData={availability}
            loading={loading}
            instructorData={instructor._id}
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
              instructorId={instructor._id}
              activeTab={activeTab}
            />{" "}
          </>
        )}
      </Box>
    </Box>
  );
};

export default ProfileSummary;
