import React, { useState } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Grid,
  IconButton,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import DeleteIcon from "@mui/icons-material/Delete";
import { useQuery, useMutation } from "@apollo/client";
import {
  GET_TEACHER_TARIFF,
  UPDATE_TEACHER_TARIFF,
} from "../../../../graphql/mutations/tariff";
import { startOfDay } from "date-fns";

interface BulkLessonPackage {
  lessons: number;
  cost: number;
}

interface TariffData {
  lessonFee: number;
  bulkPackages: BulkLessonPackage[];
  packageDiscount: number;
  discountStartDate: string;
  discountEndDate: string;
}

export const TariffTab: React.FC = () => {
  const { loading, error, data } = useQuery(GET_TEACHER_TARIFF);
  const [updateTariff] = useMutation(UPDATE_TEACHER_TARIFF);
  const [lessonFeeError, setLessonFeeError] = useState<string>("");

  const MIN_LESSON_FEE = 1000;
  const MAX_LESSON_FEE = 3000;

  // Initialize with a default bulk package
  const DEFAULT_BULK_PACKAGE = { lessons: 5, cost: 1500 };

  const [tariffData, setTariffData] = useState<TariffData>({
    lessonFee: 1500,
    bulkPackages: [DEFAULT_BULK_PACKAGE],
    packageDiscount: 50,
    discountStartDate: "",
    discountEndDate: "",
  });

  // Get today's date at the start of the day for minimum date validation
  const today = startOfDay(new Date());

  React.useEffect(() => {
    if (data?.teacherTariff) {
      // Ensure at least one bulk package exists
      const bulkPackages =
        data.teacherTariff.bulkPackages?.length > 0
          ? data.teacherTariff.bulkPackages
          : [DEFAULT_BULK_PACKAGE];

      setTariffData({
        ...data.teacherTariff,
        bulkPackages,
      });
    }
  }, [data]);

  if (loading) return <Typography>Loading...</Typography>;
  if (error) return <Typography>Error: {error.message}</Typography>;

  // Handle changes to lesson fee with validation
  const handleLessonFeeChange = (field: keyof TariffData, value: number) => {
    // Prevent negative values
    if (value < 0) return;

    if (field === "lessonFee") {
      if (value < MIN_LESSON_FEE) {
        setLessonFeeError(`Minimum Limit is: $${MIN_LESSON_FEE}`);
      } else if (value > MAX_LESSON_FEE) {
        setLessonFeeError(`Maximum Limit is: $${MAX_LESSON_FEE}`);
      } else {
        setLessonFeeError("");
      }
    }
    setTariffData((prev) => ({ ...prev, [field]: value }));
  };

  // Handle changes to bulk lesson packages
  const handleBulkPackageChange = (
    index: number,
    field: keyof BulkLessonPackage,
    value: number
  ) => {
    // Prevent negative values
    if (value < 0) return;

    const updatedPackages = [...tariffData.bulkPackages];
    updatedPackages[index] = { ...updatedPackages[index], [field]: value };
    setTariffData((prev) => ({ ...prev, bulkPackages: updatedPackages }));
  };

  // Add a new bulk lesson package
  const addBulkPackage = () => {
    setTariffData((prev) => ({
      ...prev,
      bulkPackages: [...prev.bulkPackages, { ...DEFAULT_BULK_PACKAGE }],
    }));
  };

  // Remove a bulk lesson package, but never remove the last one
  const removeBulkPackage = (index: number) => {
    if (tariffData.bulkPackages.length > 1) {
      const updatedPackages = tariffData.bulkPackages.filter(
        (_, i) => i !== index
      );
      setTariffData((prev) => ({ ...prev, bulkPackages: updatedPackages }));
    }
  };

  // Handle changes to package discount and dates
  const handleDiscountChange = (
    field: keyof TariffData,
    value: number | string
  ) => {
    // Prevent negative values for package discount
    if (field === "packageDiscount" && typeof value === "number" && value < 0)
      return;

    setTariffData((prev) => ({ ...prev, [field]: value }));
  };

  // Handle start date change
  const handleStartDateChange = (newValue: Date | null) => {
    handleDiscountChange(
      "discountStartDate",
      newValue ? newValue.toISOString() : ""
    );
    // If end date is before new start date, clear it
    if (newValue && tariffData.discountEndDate) {
      const endDate = new Date(tariffData.discountEndDate);
      if (endDate < newValue) {
        handleDiscountChange("discountEndDate", "");
      }
    }
  };

  // Handle form submission with validation
  const handleSaveChanges = async () => {
    if (
      tariffData.lessonFee < MIN_LESSON_FEE ||
      tariffData.lessonFee > MAX_LESSON_FEE
    ) {
      setLessonFeeError(
        `Lesson fee must be between $${MIN_LESSON_FEE} and $${MAX_LESSON_FEE}`
      );
      return;
    }

    try {
      // Validate bulk packages
      if (!tariffData.bulkPackages || tariffData.bulkPackages.length === 0) {
        throw new Error("At least one bulk package is required");
      }

      // Validate each bulk package
      tariffData.bulkPackages.forEach((pkg, index) => {
        if (!pkg.lessons || !pkg.cost || pkg.lessons < 1 || pkg.cost < 0) {
          throw new Error(`Invalid bulk package at index ${index}`);
        }
      });

      // Create a copy of tariffData to modify
      const dataToSend = {
        lessonFee: Number(tariffData.lessonFee),
        bulkPackages: tariffData.bulkPackages.map((pkg) => ({
          lessons: Number(pkg.lessons),
          cost: Number(pkg.cost),
        })),
        packageDiscount: Number(tariffData.packageDiscount),
        // Only include dates if they have values
        ...(tariffData.discountStartDate
          ? { discountStartDate: tariffData.discountStartDate }
          : {}),
        ...(tariffData.discountEndDate
          ? { discountEndDate: tariffData.discountEndDate }
          : {}),
      };

      await updateTariff({
        variables: {
          input: dataToSend,
        },
      });
      // You might want to show a success message here
    } catch (error) {
      console.error("Error saving tariff:", error);
      // You might want to show an error message here
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      {/* Lesson Fare Section */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="h6" sx={{ mb: 1, fontWeight: 500 }}>
          Lesson Fare
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 0, fontSize: "16px" }}
        >
          A flat fee charged at the start of each Lesson
        </Typography>

        <TextField
          fullWidth
          margin="normal"
          type="number"
          id="lessonFare"
          value={tariffData.lessonFee}
          onChange={(e) =>
            handleLessonFeeChange("lessonFee", Number(e.target.value))
          }
          error={!!lessonFeeError}
          helperText={lessonFeeError}
          InputProps={{
            startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>,
            inputProps: {
              min: 0,
              max: MAX_LESSON_FEE,
            },
          }}
          sx={{
            "& .MuiOutlinedInput-root": {
              padding: 1.1, // Adjust this value as needed (1 = 8px)
              borderRadius: 1.6,
            },
          }}
        />
      </Box>
      {/* Bulk Lesson Package Section */}
      <Box sx={{ mb: 2 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 1,
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 500 }}>
            Bulk Lesson Pkg
          </Typography>
          <Button
            variant="contained"
            onClick={addBulkPackage}
            sx={{
              bgcolor: "#5ec2d2",
              "&:hover": { bgcolor: "#4ba1b0" },
              textTransform: "none",
              borderRadius: 2,
              px: 2,
            }}
          >
            Add more package +
          </Button>
        </Box>
        {tariffData.bulkPackages.map((pkg, index) => (
          <Box key={index} sx={{ mb: 0 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={index === 0 ? 12 : 11}>
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid item xs={12}>
                    <InputLabel
                      htmlFor={`lessons-${index}`}
                      sx={{ mb: 1, fontSize: "16px" }}
                    >
                      Choose Lesson
                    </InputLabel>
                    <FormControl fullWidth>
                      <Select
                        value={pkg.lessons}
                        id={`lessons-${index}`}
                        onChange={(e) =>
                          handleBulkPackageChange(
                            index,
                            "lessons",
                            Number(e.target.value)
                          )
                        }
                        sx={{
                          "& .MuiSelect-select": {
                            padding: "14px 14px",
                            borderRadius: 8,
                          },
                        }}
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                          <MenuItem key={num} value={num}>
                            {num}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12}>
                    <InputLabel
                      htmlFor="cost of lessons"
                      sx={{ mb: 1, fontSize: "16px" }}
                    >{`Cost of ${pkg.lessons} lessons package`}</InputLabel>
                    <TextField
                      fullWidth
                      type="number"
                      id="cost of lessons"
                      value={pkg.cost}
                      onChange={(e) =>
                        handleBulkPackageChange(
                          index,
                          "cost",
                          Number(e.target.value)
                        )
                      }
                      InputProps={{
                        startAdornment: (
                          <Typography sx={{ mr: 1 }}>$</Typography>
                        ),
                        inputProps: { min: 0 },
                      }}
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          padding: 1.1, // Adjust this value as needed (1 = 8px)
                          borderRadius: 1.6,
                        },
                      }}
                    />
                  </Grid>
                </Grid>
              </Grid>
              {index !== 0 && (
                <Grid
                  item
                  xs={1}
                  sx={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "flex-start",
                    mt: 1,
                  }}
                >
                  <IconButton
                    onClick={() => removeBulkPackage(index)}
                    color="error"
                    sx={{
                      "&:hover": {
                        backgroundColor: "rgba(211, 47, 47, 0.04)",
                      },
                    }}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Grid>
              )}
            </Grid>
          </Box>
        ))}
      </Box>
      {/* Package Discounts Section */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="h6" sx={{ mb: 1, fontWeight: 500 }}>
          Package Discounts
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 1.5, fontSize: "16px" }}>
          Discount can be add for individual lessons.
        </Typography>
        <TextField
          fullWidth
          type="number"
          value={tariffData.packageDiscount}
          onChange={(e) =>
            handleDiscountChange("packageDiscount", Number(e.target.value))
          }
          sx={{
            "& .MuiOutlinedInput-root": {
              padding: 1.1, // Adjust this value as needed (1 = 8px)
              borderRadius: 1.6,
            },
            mb: 2,
          }}
          InputProps={{
            endAdornment: <Typography>%</Typography>,
            inputProps: { min: 0 },
          }}
        />
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Start Date"
                value={
                  tariffData.discountStartDate
                    ? new Date(tariffData.discountStartDate)
                    : null
                }
                onChange={handleStartDateChange}
                minDate={today}
                slotProps={{
                  textField: {
                    fullWidth: true,
                  },
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    padding: 1.1,
                    borderRadius: 1.6,
                    fontFamily: '"Poppins", sans-serif', // Add Poppins font
                  },
                  "& .MuiInputLabel-root": {
                    // If you want labels in Poppins too
                    fontFamily: '"Poppins", sans-serif',
                  },
                }}
              />
            </LocalizationProvider>
          </Grid>
          <Grid item xs={6}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="End Date"
                value={
                  tariffData.discountEndDate
                    ? new Date(tariffData.discountEndDate)
                    : null
                }
                onChange={(newValue) =>
                  handleDiscountChange(
                    "discountEndDate",
                    newValue ? newValue.toISOString() : ""
                  )
                }
                minDate={
                  tariffData.discountStartDate
                    ? new Date(tariffData.discountStartDate)
                    : today
                }
                slotProps={{
                  textField: {
                    fullWidth: true,
                  },
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    padding: 1.1,
                    borderRadius: 1.6,
                    fontFamily: '"Poppins", sans-serif', // Add Poppins font
                  },
                  "& .MuiInputLabel-root": {
                    // If you want labels in Poppins too
                    fontFamily: '"Poppins", sans-serif',
                  },
                }}
              />
            </LocalizationProvider>
          </Grid>
        </Grid>
      </Box>
      {/* Note and Save Button */}
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          mb: 2,
        }}
      >
        <Typography variant="body2" color="text.secondary">
          Platform or administrative fees deducted from the driver's earnings
          20%
        </Typography>{" "}
      </Box>{" "}
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Button
          variant="contained"
          onClick={handleSaveChanges}
          sx={{
            bgcolor: "#5ec2d2",
            "&:hover": { bgcolor: "#4ba1b0" },
            textTransform: "none",
            px: 6,
            py: 1,
          }}
        >
          Save Changes
        </Button>{" "}
      </Box>
    </Box>
  );
};
