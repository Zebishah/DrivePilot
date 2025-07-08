import React, { useState } from "react";
import PropTypes from "prop-types";
import {
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Box,
  IconButton,
} from "@mui/material";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import ClearIcon from "@mui/icons-material/Clear";

/**
 * Single bulk package card with two-column rows
 */
const BulkPackageCard = ({
  lessons,
  cost,
  startDate,
  endDate,
  lessonFee,
  save,
  discount,
  finalPrice,
  packageDiscount,
  title,
  variant,
  onSelect,
  isSelected,
}) => {
  const durationDays = new Date(parseInt(endDate));

  // Define card styles based on variant
  const cardStyles = {
    highlighted: {
      backgroundColor: "#5FC2D333",
      color: "black",
      border: "1px solid #A19A99",
    },
    default: {
      backgroundColor: "white",
      color: "black",
      border: "1px solid #A19A99",
    },
  }[variant];

  return (
    <Card
      variant="outlined"
      sx={{
        width: "100%",
        minWidth: 310,
        maxWidth: 420,
        mx: "auto",
        mb: 1,
        borderRadius: 2,
        ...cardStyles,
        border: isSelected ? "2px solid #5FC2D3" : cardStyles.border,
        transform: isSelected ? "scale(1.005)" : "scale(1)",
        transition: "all 0.2s ease",
        "& .MuiTypography-root": {
          color: cardStyles.color,
        },
      }}
    >
      <CardContent>
        <Box display="flex" justifyContent="space-between" mb={1}>
          <Typography variant="subtitle1">Title</Typography>
          <Typography variant="subtitle1">{title}</Typography>
        </Box>
        <Box display="flex" justifyContent="space-between" mb={1}>
          <Typography variant="subtitle1">Courses</Typography>
          <Typography variant="subtitle1">{lessons} lessons</Typography>
        </Box>
        <Box display="flex" justifyContent="space-between" mb={1}>
          <Typography variant="subtitle1">Price</Typography>
          {packageDiscount > 0 ? (
            <Box display="flex" gap={1}>
              <Typography
                variant="subtitle1"
                sx={{ textDecoration: "line-through", color: "gray" }}
              >
                CHF {cost}
              </Typography>
              <Typography
                variant="subtitle1"
                sx={{ color: "#31D62F !important", fontWeight: 600 }}
              >
                CHF {finalPrice}
              </Typography>
            </Box>
          ) : (
            <Typography variant="subtitle1">CHF{cost}</Typography>
          )}
        </Box>
        <Box display="flex" justifyContent="space-between" mb={2}>
          <Typography variant="subtitle1">You Save</Typography>
          <Typography variant="subtitle1" sx={{ color: "#31D62F !important" }}>
            CHF {save}
          </Typography>
        </Box>
        <Box display="flex" justifyContent="space-between" mb={1}>
          <Typography variant="subtitle1">Expiration Date</Typography>
          <Typography variant="subtitle1">
            {durationDays.toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </Typography>
        </Box>

        <Button
          fullWidth
          variant="contained"
          onClick={() => onSelect({ lessons, cost, startDate, endDate })}
          sx={{
            backgroundColor: isSelected ? "#4bb1c2" : "#5FC2D3",
            color: "white",
            "&:hover": {
              backgroundColor: "#4bb1c2",
            },
          }}
        >
          {isSelected ? "Selected" : "Get This Offer Now"}
        </Button>
      </CardContent>
    </Card>
  );
};

// Update PropTypes
BulkPackageCard.propTypes = {
  lessons: PropTypes.number.isRequired,
  cost: PropTypes.number.isRequired,
  startDate: PropTypes.string.isRequired,
  endDate: PropTypes.string.isRequired,
  lessonFee: PropTypes.number.isRequired,
  packageDiscount: PropTypes.number,
  variant: PropTypes.oneOf(["highlighted", "default"]).isRequired,
};

/**
 * Renders a grid of bulk lesson packages
 */
const BulkLessonPackages = ({ tariff, onPackageSelect }) => {
  const [selectedPackage, setSelectedPackage] = useState(null);

  const handlePackageSelect = (packageData) => {
    setSelectedPackage(packageData);
    onPackageSelect(packageData);
  };

  const handleClearSelection = () => {
    setSelectedPackage(null);
    onPackageSelect(null);
  };

  if (
    !tariff ||
    !Array.isArray(tariff.bulkPackages) ||
    tariff.bulkPackages.length === 0
  ) {
    return null;
  }

  const {
    lessonFee,
    packageDiscount,
    bulkPackages,
    PackageDiscountStartDate,
    PackageDiscountEndDate,
  } = tariff;
  console.log("bulkPackages", bulkPackages);
  // Carousel settings
  const settings = {
    dots: true,
    infinite: false,
    speed: 500,
    slidesToShow: Math.min(3, bulkPackages.length),
    slidesToScroll: 1,
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: 2,
          slidesToScroll: 1,
        },
      },
      {
        breakpoint: 600,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1,
        },
      },
    ],
  };

  const renderPackages = () => {
    const today = new Date();

    return bulkPackages
      .filter((pkg) => {
        if (!pkg.PackageEndDate) return true;

        const pkgEndDate =
          typeof pkg.PackageEndDate === "string" ||
          typeof pkg.PackageEndDate === "number"
            ? new Date(Number(pkg.PackageEndDate))
            : new Date(pkg.PackageEndDate);

        return pkgEndDate >= today;
      })
      .map((pkg, idx) => (
        <Grid item key={idx} sx={{ px: 1 }}>
          <BulkPackageCard
            lessons={pkg.lessons}
            cost={pkg.cost}
            startDate={PackageDiscountStartDate}
            endDate={pkg.PackageEndDate}
            lessonFee={lessonFee}
            finalPrice={pkg.finalPackagePrice}
            discount={pkg.packageDiscount}
            save={pkg.studentSave}
            packageDiscount={pkg.packageDiscount}
            title={pkg.title}
            variant={idx % 2 === 0 ? "highlighted" : "default"}
            onSelect={handlePackageSelect}
            isSelected={
              selectedPackage && selectedPackage.lessons === pkg.lessons
            }
          />
        </Grid>
      ));
  };

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: 1400,
        margin: "0 auto",
        px: { xs: 2, md: 4 },
      }}
    >
      {selectedPackage && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
          }}
        >
          <Button
            startIcon={<ClearIcon />}
            onClick={handleClearSelection}
            sx={{
              color: "#666",
              "&:hover": {
                backgroundColor: "rgba(0,0,0,0.04)",
              },
            }}
          >
            Clear Selection
          </Button>
        </Box>
      )}
      {bulkPackages.length <= 3 ? (
        <Grid container spacing={4} justifyContent="center">
          {renderPackages()}
        </Grid>
      ) : (
        <Box
          sx={{
            ".slick-dots": {
              bottom: -40,
            },
            ".slick-dots li button:before": {
              fontSize: 12,
              color: "#5FC2D3",
            },
            ".slick-dots li.slick-active button:before": {
              color: "#5FC2D3",
            },
            ".slick-prev, .slick-next": {
              "&:before": {
                color: "#5FC2D3",
              },
            },
            py: 2,
          }}
        >
          <Slider {...settings}>{renderPackages()}</Slider>
        </Box>
      )}
    </Box>
  );
};

BulkLessonPackages.propTypes = {
  tariff: PropTypes.shape({
    lessonFee: PropTypes.number.isRequired,
    packageDiscount: PropTypes.number,
    bulkPackages: PropTypes.arrayOf(
      PropTypes.shape({
        lessons: PropTypes.number.isRequired,
        cost: PropTypes.number.isRequired,
        startDate: PropTypes.string.isRequired,
        endDate: PropTypes.string.isRequired,
      })
    ),
  }),
};

export default BulkLessonPackages;
