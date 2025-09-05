import React from "react";
import { Card, Typography, Avatar, Box, Grid, Divider } from "@mui/material";

// Reviews Component
const Reviews: React.FC = () => {
  // Sample Reviews Data
  const reviews = [
    {
      id: 1,
      name: "Renee Watson",
      image: "/images/Instructor1.png",
      rating: 4.5,
      comment:
        "Lorem ipsum dolor sit amet consectetur. Aenean ligula accumsan ut nec et tempor. Ut amet curabitur elit aliquam.",
      date: "April 12, 2024",
    },
    {
      id: 2,
      name: "Tom Watson",
      image: "/images/Instructor1.png",
      rating: 4.5,
      comment:
        "Lorem ipsum dolor sit amet consectetur. Aenean ligula accumsan ut nec et tempor. Ut amet curabitur elit aliquam.",
      date: "April 10, 2024",
      responderimage: "/images/Instructor1.png",
      response: "Thank you for the feedback! We appreciate it.",
      responder: "Saba",
      responderName: "Driver Response",
    },
    {
      id: 3,
      name: "Renee Watson",
      image: "/images/Instructor1.png",
      rating: 4.5,
      comment:
        "Lorem ipsum dolor sit amet consectetur. Aenean ligula accumsan ut nec et tempor. Ut amet curabitur elit aliquam.",
      date: "April 12, 2024",
    },
  ];

  return (
    <Box sx={{}}>
      <Typography
        sx={{
          fontWeight: "600",
          marginBottom: 2,
          fontFamily: "Poppins, sans-serif",
        }}
        variant="h6"
      >
        Reviews
      </Typography>
      <Divider
        sx={{
          borderColor: "#7F7F7F", // Correct color format with #
        }}
      />
      {reviews.map((review) => (
        <Card
          key={review.id}
          sx={{
            marginBottom: 3,
            marginTop: 3,
            borderRadius: "10px",
            border: 1,
            borderColor: "#DADADA",
            padding: 2,
            textTransform: "none",
            boxShadow: "none",
          }}
        >
          {/* Reviewer Section */}
          <Grid container spacing={2} alignItems="flex-start">
            <Grid item>
              <Avatar
                src={review.image}
                alt={review.name}
                sx={{ width: 62, height: 80 }}
              />
            </Grid>
            <Grid item xs>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  position: "relative",
                  alignItems: "center",
                }}
              >
                <Typography
                  sx={{
                    fontWeight: "500",
                    fontFamily: "Poppins, sans-serif",
                  }}
                  variant="subtitle1"
                >
                  {review.name}
                </Typography>
                <Typography
                  sx={{
                    fontWeight: "500",
                    fontFamily: "Poppins, sans-serif",
                    marginTop: 1,
                    display: "block",
                  }}
                  variant="caption"
                >
                  {review.date}
                </Typography>
              </Box>

              <Typography
                sx={{
                  fontFamily: "Poppins, sans-serif",
                }}
                variant="body2"
                color="text.secondary"
              >
                <strong>{review.rating} </strong> Excellence
              </Typography>
              <Typography
                sx={{
                  fontWeight: "400",
                  fontFamily: "Poppins, sans-serif",
                  marginTop: 1,
                }}
                variant="body2"
              >
                {review.comment}
              </Typography>
            </Grid>
          </Grid>

          {/* Responder Section */}
          {review.response && (
            <Box sx={{ marginTop: 3 }}>
              <Grid container spacing={2} alignItems="flex-start">
                <Grid item>
                  <Avatar
                    src={review.responderimage}
                    alt={review.responder}
                    sx={{ width: 62, height: 80 }}
                  />
                </Grid>
                <Grid item xs>
                  <Typography
                    sx={{
                      fontWeight: "500",
                      fontFamily: "Poppins, sans-serif",
                    }}
                    variant="subtitle1"
                  >
                    {review.responder}
                  </Typography>
                  <Typography
                    sx={{
                      fontWeight: "400",
                      fontFamily: "Poppins, sans-serif",
                    }}
                    variant="subtitle2"
                    color="text.secondary"
                  >
                    {review.responderName}
                  </Typography>
                  <Typography
                    sx={{
                      fontWeight: "400",
                      fontFamily: "Poppins, sans-serif",
                    }}
                    variant="body2"
                  >
                    {review.response}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          )}
        </Card>
      ))}
    </Box>
  );
};

export default Reviews;
