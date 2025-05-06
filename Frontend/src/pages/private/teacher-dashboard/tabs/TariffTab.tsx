import React, { useState, useEffect } from "react";
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
  Tooltip,
  Slider,
  CircularProgress,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import DeleteIcon from "@mui/icons-material/Delete";
import InfoIcon from "@mui/icons-material/Info";
import { useQuery, useMutation } from "@apollo/client";
import {
  GET_TEACHER_TARIFF,
  UPDATE_TEACHER_TARIFF,
} from "../../../../graphql/mutations/tariff";
import { startOfDay } from "date-fns";
import toast from "react-hot-toast";

// Update your BulkLessonPackage interface
interface BulkLessonPackage {
  lessons: number;
  cost: number | null;
  startDate: Date | null; // Ensure this is Date type
  endDate: Date | null; // Ensure this is Date type
}
interface TariffData {
  lessonFee: number;
  bulkPackages?: BulkLessonPackage[];
  packageDiscount: number;
  discountStartDate: Date | null; // Changed to Date | null
  discountEndDate: Date | null; // Changed to Date | null
}

export const TariffTab: React.FC = () => {
  const { loading, error, data } = useQuery(GET_TEACHER_TARIFF);
  const [updateTariff] = useMutation(UPDATE_TEACHER_TARIFF, {
    refetchQueries: [{ query: GET_TEACHER_TARIFF }],
  });

  const [lessonFeeError, setLessonFeeError] = useState<string>("");

  const [isLoading, setIsLoading] = useState(false);
  const MIN_LESSON_FEE = 60;
  const MAX_LESSON_FEE = 120;
  const MIN_DISCOUNT = 0;
  const MAX_DISCOUNT = 100;

  // Initialize with default values
  const [tariffData, setTariffData] = useState<TariffData>({
    lessonFee: 0,
    bulkPackages: [], // Start with empty array
    packageDiscount: 0,
    discountStartDate: null, // Changed to null
    discountEndDate: null, // Changed to null
  });

  // Get today's date at the start of the day for minimum date validation
  const today = startOfDay(new Date());

  // Update your useEffect for data loading
  useEffect(() => {
    if (data?.teacherTariff) {
      const formattedData = {
        lessonFee: data.teacherTariff.lessonFee || 0,
        bulkPackages:
          data.teacherTariff.bulkPackages?.map((pkg) => ({
            lessons: pkg.lessons,
            cost: pkg.cost,
            startDate: pkg.startDate ? new Date(pkg.startDate) : null,
            endDate: pkg.endDate ? new Date(pkg.endDate) : null,
          })) || [],
        packageDiscount: data.teacherTariff.packageDiscount || 0,
        discountStartDate: data.teacherTariff.discountStartDate
          ? new Date(data.teacherTariff.discountStartDate)
          : null,
        discountEndDate: data.teacherTariff.discountEndDate
          ? new Date(data.teacherTariff.discountEndDate)
          : null,
      };
      setTariffData(formattedData);
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
        setLessonFeeError(`Minimum Limit is: CHF ${MIN_LESSON_FEE}`);
      } else if (value > MAX_LESSON_FEE) {
        setLessonFeeError(`Maximum Limit is: CHF ${MAX_LESSON_FEE}`);
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
    value: any
  ) => {
    // Only validate discount percentage if the field is 'cost'
    if (field === "cost") {
      const numValue = Number(value);

      // Allow empty string to permit clearing the input
      if (value === "") {
        const updatedPackages = [...(tariffData.bulkPackages || [])];
        updatedPackages[index] = { ...updatedPackages[index], [field]: null };
        setTariffData((prev) => ({ ...prev, bulkPackages: updatedPackages }));
        return;
      }

      // Reject non-number or out-of-range input and show toast
      if (isNaN(numValue) || numValue < 0 || numValue > 100) {
        toast.error("Discount must be between 1% and 100%");
        return;
      }
    }

    const updatedPackages = [...(tariffData.bulkPackages || [])];
    updatedPackages[index] = { ...updatedPackages[index], [field]: value };
    setTariffData((prev) => ({ ...prev, bulkPackages: updatedPackages }));
  };

  // Add a new bulk lesson package
  const addBulkPackage = () => {
    setTariffData((prev) => ({
      ...prev,
      bulkPackages: [
        ...(prev.bulkPackages || []),
        {
          lessons: 2,
          cost: null,
          startDate: null,
          endDate: null,
        },
      ],
    }));
  };

  // Remove a bulk lesson package, but never remove the last one
  const removeBulkPackage = (index: number) => {
    if ((tariffData.bulkPackages ?? []).length > 0) {
      const updatedPackages = (tariffData.bulkPackages ?? []).filter(
        (_, i) => i !== index
      );
      setTariffData((prev) => ({ ...prev, bulkPackages: updatedPackages }));
    }
  };

  // Handle changes to package discount
  const handleDiscountChange = (field: keyof TariffData, value: any) => {
    // Prevent negative values for package discount
    if (field === "packageDiscount" && typeof value === "number") {
      // Ensure discount is between 1-100%
      if (value < MIN_DISCOUNT) value = MIN_DISCOUNT;
      if (value > MAX_DISCOUNT) value = MAX_DISCOUNT;
    }

    setTariffData((prev) => ({ ...prev, [field]: value }));
  };

  // Handle form submission with validation
  const handleSaveChanges = async () => {
    // Validate lesson fee
    setIsLoading(true);
    if (
      tariffData.lessonFee < MIN_LESSON_FEE ||
      tariffData.lessonFee > MAX_LESSON_FEE
    ) {
      setLessonFeeError(
        `Lesson fee must be between CHF ${MIN_LESSON_FEE} and CHF ${MAX_LESSON_FEE}`
      );
      toast.error(
        `Lesson fee must be between CHF ${MIN_LESSON_FEE} and CHF ${MAX_LESSON_FEE}`
      );
      return;
    }

    try {
      // Validate bulk packages if any exist
      if (tariffData.bulkPackages && tariffData.bulkPackages.length > 0) {
        // Check each package for required fields
        const invalidPackages = tariffData.bulkPackages.some((pkg) => {
          const hasValidLessons = pkg.lessons && pkg.lessons >= 2;
          const hasValidCost =
            typeof pkg.cost === "number" && pkg.cost >= 0 && pkg.cost <= 100;

          // Date validation remains the same
          let hasValidDates = true;
          if (pkg.startDate || pkg.endDate) {
            if (pkg.startDate && pkg.endDate) {
              const start = pkg.startDate;
              const end = pkg.endDate;
              hasValidDates =
                !isNaN(start.getTime()) &&
                !isNaN(end.getTime()) &&
                end >= start;
            } else {
              hasValidDates = false;
            }
          }

          return !hasValidLessons || !hasValidCost || !hasValidDates;
        });

        if (invalidPackages) {
          toast.error(
            "Please fill in all package details correctly. Ensure all packages have valid lesson counts, discount percentages, and date ranges if specified."
          );
          throw new Error(
            "Please fill in all package details correctly. Ensure all packages have valid lesson counts, discount percentages, and date ranges if specified."
          );
        }
      }

      // Validate discount period if discount is set
      if (tariffData.packageDiscount > 0) {
        const hasStartDate = !!tariffData.discountStartDate;
        const hasEndDate = !!tariffData.discountEndDate;

        // If discount is set and one date is provided, both should be provided
        if ((hasStartDate && !hasEndDate) || (!hasStartDate && hasEndDate)) {
          toast.error(
            "Please provide both start and end dates for the discount period"
          );
          throw new Error(
            "Please provide both start and end dates for the discount period"
          );
        }

        // If both dates are provided, end date should be after start date
        if (hasStartDate && hasEndDate) {
          const startDate = tariffData.discountStartDate as Date;
          const endDate = tariffData.discountEndDate as Date;
          if (endDate < startDate) {
            toast.error("Discount end date must be after start date");
            throw new Error("Discount end date must be after start date");
          }
        }
      }

      // Create the data structure to send to the API
      const dataToSend = {
        lessonFee: Number(tariffData.lessonFee),

        // Map bulk packages with properly formatted data
        bulkPackages: tariffData.bulkPackages?.map((pkg) => ({
          lessons: Number(pkg.lessons),
          cost: Number(pkg.cost),
          ...(pkg.startDate ? { startDate: pkg.startDate.toISOString() } : {}),
          ...(pkg.endDate ? { endDate: pkg.endDate.toISOString() } : {}),
        })),

        packageDiscount: Number(tariffData.packageDiscount),

        // Only include discount dates if they have values
        ...(tariffData.discountStartDate
          ? {
              discountStartDate: tariffData.discountStartDate.toISOString(),
            }
          : {}),

        ...(tariffData.discountEndDate
          ? {
              discountEndDate: tariffData.discountEndDate.toISOString(),
            }
          : {}),
      };

      // Send the updated data to the server
      const result = await updateTariff({
        variables: {
          input: dataToSend,
        },
      });

      // Show success message

      toast.success("Tariff settings saved successfully");
    } catch (error) {
      console.error("Error saving tariff:", error);
      toast.error("Failed to save tariff settings");
    } finally {
      // Reset loading state regardless of success or failure
      setIsLoading(false);
    }
  };

  // Helper function to create section headers with tooltips
  const SectionHeader = ({
    title,
    tooltip,
  }: {
    title: string;
    tooltip: string;
  }) => (
    <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
      <Typography variant="h6" sx={{ fontWeight: 500 }}>
        {title}
      </Typography>
      <Tooltip title={tooltip} arrow placement="right">
        <IconButton size="small" sx={{ ml: 1 }}>
          <InfoIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Box>
  );

  const LabelWithTooltip = ({ htmlFor, label, tooltip }) => (
    <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
      <InputLabel htmlFor={htmlFor} sx={{ fontSize: "16px", mb: 0 }}>
        {label}
      </InputLabel>
      <Tooltip title={tooltip} placement="right">
        <IconButton size="small" sx={{ ml: 1 }}>
          <InfoIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Box>
  );

  return (
    <Box sx={{ p: 2 }}>
      {/* Lesson Fee Section */}
      <Box sx={{ mb: 2 }}>
        <SectionHeader
          title="Price per lesson (CHF)"
          tooltip="Set your standard price for one driving lesson."
        />
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
          placeholder="0"
          value={tariffData.lessonFee === 0 ? "" : tariffData.lessonFee} // Show empty string for 0
          onChange={(e) => {
            const value = e.target.value;
            // Convert empty string to 0, otherwise parse the number
            const numValue = value === "" ? 0 : Number(value);
            handleLessonFeeChange("lessonFee", numValue);
          }}
          error={!!lessonFeeError}
          helperText={
            lessonFeeError ||
            `Enter a value between ${MIN_LESSON_FEE} and ${MAX_LESSON_FEE} CHF`
          }
          InputProps={{
            startAdornment: <Typography sx={{ mr: 1 }}>CHF</Typography>,
            inputProps: {
              min: MIN_LESSON_FEE,
              max: MAX_LESSON_FEE,
            },
          }}
          sx={{
            "& .MuiOutlinedInput-root": {
              padding: 1.1,
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
            Create a lesson package
          </Typography>
          <Tooltip title="You can create multiple lesson packages.">
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
          </Tooltip>
        </Box>

        {/* Package rendering */}
        {!tariffData.bulkPackages || tariffData.bulkPackages.length === 0 ? (
          <Typography sx={{ mb: 2 }}>No packages added yet</Typography>
        ) : (
          tariffData.bulkPackages.map((pkg, index) => (
            <Box
              key={index}
              sx={{ mb: 3, p: 2, border: "1px solid #e0e0e0", borderRadius: 2 }}
            >
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={11}>
                  <Grid container spacing={2}>
                    {/* Number of lessons */}
                    <Grid item xs={12}>
                      <LabelWithTooltip
                        htmlFor={`lessons-${index}`}
                        label="Number of lessons in package"
                        tooltip="Choose how many lessons are included in this package."
                      />
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
                          {Array.from({ length: 39 }, (_, i) => i + 2).map(
                            (num) => (
                              <MenuItem key={num} value={num}>
                                {num}
                              </MenuItem>
                            )
                          )}
                        </Select>
                      </FormControl>
                    </Grid>

                    {/* Discount percentage */}
                    <Grid item xs={12}>
                      <LabelWithTooltip
                        htmlFor={`cost-${index}`}
                        label="Discount percentage (%)"
                        tooltip="Discount percentage applied to this package"
                      />
                      <TextField
                        fullWidth
                        type="number"
                        placeholder="0"
                        id={`cost-${index}`}
                        value={pkg.cost ?? ""}
                        onChange={(e) =>
                          handleBulkPackageChange(
                            index,
                            "cost",
                            e.target.value === ""
                              ? null
                              : Number(e.target.value)
                          )
                        }
                        InputProps={{
                          endAdornment: (
                            <Typography sx={{ ml: 1 }}>%</Typography>
                          ),
                          inputProps: { min: 0, max: 100 },
                        }}
                        sx={{
                          "& .MuiOutlinedInput-root": {
                            padding: 1.1,
                            borderRadius: 1.6,
                          },
                        }}
                      />
                    </Grid>

                    {/* Package availability period */}
                    <Grid item xs={12} sx={{ mb: 3 }}>
                      <LabelWithTooltip
                        htmlFor={`availability-${index}`}
                        label="Package availability period"
                        tooltip="Set the duration when this package is available for purchase."
                      />
                      <LocalizationProvider dateAdapter={AdapterDateFns}>
                        <Grid container spacing={3} sx={{ mt: 1 }}>
                          <Grid item xs={6}>
                            <DatePicker
                              label="Start Date"
                              value={pkg.startDate}
                              onChange={(newValue) =>
                                handleBulkPackageChange(
                                  index,
                                  "startDate",
                                  newValue
                                )
                              }
                              sx={{
                                width: "100%",
                                "& .MuiInputBase-root": {
                                  padding: "12px 14px",
                                  borderRadius: "8px",
                                },
                                "& .MuiOutlinedInput-notchedOutline": {
                                  borderColor: "#e0e0e0",
                                },
                                "&:hover .MuiOutlinedInput-notchedOutline": {
                                  borderColor: "#bdbdbd",
                                },
                                padding: "2px",
                              }}
                              slotProps={{
                                textField: {
                                  fullWidth: true,
                                  margin: "normal",
                                  sx: {
                                    mt: 0,
                                    "& .MuiInputBase-root": {
                                      padding: "10px 10px",
                                    },
                                  },
                                },
                              }}
                              minDate={today}
                            />
                          </Grid>
                          <Grid item xs={6}>
                            <DatePicker
                              label="End Date"
                              value={pkg.endDate}
                              onChange={(newValue) =>
                                handleBulkPackageChange(
                                  index,
                                  "endDate",
                                  newValue
                                )
                              }
                              sx={{
                                width: "100%",
                                "& .MuiInputBase-root": {
                                  padding: "12px 14px",
                                  borderRadius: "8px",
                                },
                                "& .MuiOutlinedInput-notchedOutline": {
                                  borderColor: "#e0e0e0",
                                },
                                "&:hover .MuiOutlinedInput-notchedOutline": {
                                  borderColor: "#bdbdbd",
                                },
                                padding: "2px",
                              }}
                              slotProps={{
                                textField: {
                                  fullWidth: true,
                                  margin: "normal",
                                  sx: {
                                    mt: 0,
                                    "& .MuiInputBase-root": {
                                      padding: "10px 10px",
                                    },
                                  },
                                },
                              }}
                              minDate={pkg.startDate}
                            />
                          </Grid>
                        </Grid>
                      </LocalizationProvider>
                    </Grid>
                  </Grid>
                </Grid>

                {/* Delete button */}
                <Grid
                  item
                  xs={1}
                  sx={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "flex-start",
                  }}
                >
                  <Tooltip
                    title={"Press this Button to Delete this Packaae"}
                    arrow
                    placement="right"
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
                  </Tooltip>
                </Grid>
              </Grid>
            </Box>
          ))
        )}
      </Box>

      {/* Package Discounts Section */}
      <Box sx={{ mb: 2 }}>
        <SectionHeader
          title="% discount on lesson price"
          tooltip="Offer a temporary discount on your regular price."
        />
        <Typography color="text.secondary" sx={{ mb: 1.5, fontSize: "16px" }}>
          Discount can be added for individual lessons.
        </Typography>

        {/* Slider for discount */}
        <Box sx={{ mb: 2 }}>
          <Slider
            value={tariffData.packageDiscount}
            onChange={(_, newValue) =>
              handleDiscountChange("packageDiscount", Number(newValue))
            }
            aria-labelledby="discount-slider"
            valueLabelDisplay="auto"
            step={1}
            marks
            min={MIN_DISCOUNT}
            max={MAX_DISCOUNT}
            sx={{
              color: "#5ec2d2",
              "& .MuiSlider-thumb": {
                height: 24,
                width: 24,
                backgroundColor: "#fff",
                border: "2px solid #5ec2d2",
                "&:focus, &:hover, &.Mui-active": {
                  boxShadow: "0 0 0 8px rgba(94, 194, 210, 0.16)",
                },
              },
              "& .MuiSlider-markLabel": {
                fontSize: "0.75rem",
              },
            }}
          />
        </Box>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <SectionHeader
            title="Discount validity period"
            tooltip="Select the time range during which this discount applies."
          />
          <Box sx={{ display: "flex", gap: 4 }}>
            <Grid item xs={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Start Date"
                  value={tariffData.discountStartDate}
                  onChange={(newValue) =>
                    handleDiscountChange("discountStartDate", newValue)
                  }
                  minDate={today}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      helperText: "When discount begins",
                    },
                  }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      padding: 1.1,
                      borderRadius: 1.6,
                      fontFamily: '"Poppins", sans-serif',
                    },
                    "& .MuiInputLabel-root": {
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
                  value={tariffData.discountEndDate}
                  onChange={(newValue) =>
                    handleDiscountChange("discountEndDate", newValue)
                  }
                  minDate={tariffData.discountStartDate || today}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      helperText: "When discount ends",
                    },
                  }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      padding: 1.1,
                      borderRadius: 1.6,
                      fontFamily: '"Poppins", sans-serif',
                    },
                    "& .MuiInputLabel-root": {
                      fontFamily: '"Poppins", sans-serif',
                    },
                  }}
                />
              </LocalizationProvider>
            </Grid>
          </Box>
        </Box>
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
        </Typography>
      </Box>

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
          disabled={isLoading}
          sx={{
            bgcolor: "#5ec2d2",
            "&:hover": { bgcolor: "#4ba1b0" },
            textTransform: "none",
            px: 6,
            py: 1,
            position: "relative",
          }}
        >
          {isLoading ? (
            <>
              <CircularProgress
                size={24}
                sx={{
                  color: "white",
                  position: "absolute",
                  left: "50%",
                  marginLeft: "-12px",
                }}
              />
              <span style={{ visibility: "hidden" }}>Save Changes</span>
            </>
          ) : (
            "Save Changes"
          )}
        </Button>
      </Box>
    </Box>
  );
};
