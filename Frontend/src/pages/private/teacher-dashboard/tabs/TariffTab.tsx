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
  InputAdornment,
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
import { DollarSign } from "lucide-react";

// Update your BulkLessonPackage interface
interface BulkLessonPackage {
  title: string;
  lessons: number;
  packageDiscount: number;
  PackageEndDate: Date | null;
  cost: number;
  finalPackagePrice: number;
  studentSave: number;
}

interface TariffData {
  lessonFee: number;
  lessonDiscount: number;
  FinalPricePerLesson: number;
  bulkPackages: BulkLessonPackage[];
  isDefault: boolean;
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
    lessonDiscount: 0,
    FinalPricePerLesson: 0,
    isDefault: false,
    bulkPackages: [],
  });
  // Get today's date at the start of the day for minimum date validation
  const today = startOfDay(new Date());

  // Update your useEffect for data loading
  useEffect(() => {
    if (data?.teacherTariff) {
      const {
        lessonFee,
        lessonDiscount,
        FinalPricePerLesson,
        bulkPackages,
        isDefault,
      } = data.teacherTariff;
      console.log("data", data.teacherTariff);
      setTariffData({
        lessonFee: lessonFee || 0,
        lessonDiscount: lessonDiscount || 0,
        FinalPricePerLesson: FinalPricePerLesson || 0,
        isDefault: isDefault || false,
        bulkPackages:
          bulkPackages?.map((pkg: any) => {
            const finalPrice = pkg.finalPackagePrice;
            const studentSave = pkg.studentSave;
            return {
              title: pkg.title,
              lessons: pkg.lessons,
              packageDiscount: pkg.packageDiscount,

              PackageEndDate: pkg.PackageEndDate
                ? new Date(parseInt(pkg.PackageEndDate)) // ✅ Ensure it's a number first
                : null,
              cost: pkg.cost,
              finalPackagePrice: parseFloat(finalPrice.toFixed(5)),
              studentSave: parseFloat(studentSave.toFixed(5)),
            };
          }) || [],
      });
    }
  }, [data]);

  if (loading) return <Typography>Loading...</Typography>;
  if (error) return <Typography>Error: {error.message}</Typography>;

  // Handle changes to lesson fee with validation
  const handleLessonFeeChange = (field: keyof TariffData, value: number) => {
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

    setTariffData((prev) => ({
      ...prev,
      [field]: value,
      FinalPricePerLesson:
        field === "lessonFee" || field === "lessonDiscount"
          ? recalculateFinalLessonPrice(
              field === "lessonFee" ? value : prev.lessonFee,
              field === "lessonDiscount" ? value : prev.lessonDiscount
            )
          : prev.FinalPricePerLesson,
    }));
  };
  interface PackageDiscountDateChangeEvent {
    field: "PackageEndDate";
    newValue: Date | null;
  }

  const handlePackageDiscountDateChange = (
    field: PackageDiscountDateChangeEvent["field"],
    newValue: Date | null
  ) => {
    setTariffData((prev) => ({
      ...prev,
      [field]: newValue,
    }));
  };
  // Handle changes to bulk lesson packages
  const handleBulkPackageChange = (
    index: number,
    field: keyof BulkLessonPackage,
    value: any
  ) => {
    const updatedPackages = [...tariffData.bulkPackages];
    updatedPackages[index] = {
      ...updatedPackages[index],
      [field]: value,
    };

    // Recalculate if lessons, cost, or packageDiscount is updated
    const affectedFields = ["cost", "packageDiscount", "lessons"];
    if (affectedFields.includes(field)) {
      const cost = updatedPackages[index].cost || 0;
      const discount = updatedPackages[index].packageDiscount || 0;
      const lessons = updatedPackages[index].lessons || 0;

      const total = cost * lessons;
      const discountedAmount = (total * discount) / 100;
      const finalPrice = total - discountedAmount;

      updatedPackages[index].finalPackagePrice = parseFloat(
        finalPrice.toFixed(2)
      );
      updatedPackages[index].studentSave = parseFloat(
        discountedAmount.toFixed(2)
      );
    }

    setTariffData((prev) => ({ ...prev, bulkPackages: updatedPackages }));
  };
  const recalculateBulkPackage = (
    pkg: BulkLessonPackage
  ): BulkLessonPackage => {
    const cost = parseFloat(String(pkg.cost)) || 0;
    const discount = parseFloat(String(pkg.packageDiscount)) || 0;
    const lessons = parseFloat(String(pkg.lessons)) || 0;

    const total = cost * lessons;
    const discountedAmount = (total * discount) / 100;
    const finalPrice = total - discountedAmount;

    return {
      ...pkg,
      finalPackagePrice: parseFloat(finalPrice.toFixed(2)),
      studentSave: parseFloat(discountedAmount.toFixed(2)),
    };
  };

  const addBulkPackage = () => {
    setTariffData((prev) => ({
      ...prev,
      bulkPackages: [
        ...prev.bulkPackages,
        {
          title: "",
          lessons: 0,
          packageDiscount: 0, // explicitly set to 0
          PackageEndDate: null,
          cost: 0,
          finalPackagePrice: 0,
          studentSave: 0,
        },
      ],
    }));
  };
  // Remove a bulk lesson package, but never remove the last one
  const removeBulkPackage = (index: number) => {
    const updatedPackages = tariffData.bulkPackages.filter(
      (_, i) => i !== index
    );
    setTariffData((prev) => ({ ...prev, bulkPackages: updatedPackages }));
  };

  // Handle changes to package discount
  const handleDiscountChange = (field: keyof TariffData, value: any) => {
    // Prevent negative values for package discount
    if (field === "lessonDiscount" && typeof value === "number") {
      // Ensure discount is between 1-100%
      if (value < MIN_DISCOUNT) value = MIN_DISCOUNT;
      if (value > MAX_DISCOUNT) value = MAX_DISCOUNT;
    }

    setTariffData((prev) => ({
      ...prev,
      [field]: value,
      FinalPricePerLesson: recalculateFinalLessonPrice(
        prev.lessonFee,
        field === "lessonDiscount" ? value : prev.lessonDiscount
      ),
    }));
  };

  // Helper function to create section headers with tooltips

  const handleSaveChanges = async () => {
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
    console.log("tarfiff data ", tariffData);
    try {
      const dataToSend = {
        lessonFee: tariffData.lessonFee,
        lessonDiscount: tariffData.lessonDiscount,
        FinalPricePerLesson: tariffData.FinalPricePerLesson,
        bulkPackages: tariffData.bulkPackages.map((pkg) => ({
          title: pkg.title,
          lessons: pkg.lessons,
          packageDiscount: pkg.packageDiscount,
          PackageEndDate: pkg.PackageEndDate?.toISOString() || null,
          cost: pkg.cost,
          finalPackagePrice: pkg.finalPackagePrice,
          studentSave: pkg.studentSave,
        })),
      };

      await updateTariff({ variables: { input: dataToSend } });
      toast.success("Tariff settings saved successfully");
    } catch (error) {
      console.error("Error saving tariff:", error);
      toast.error("Failed to save tariff settings");
    } finally {
      setIsLoading(false);
    }
  };

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
  const recalculateFinalLessonPrice = (
    fee: number,
    discount: number
  ): number => {
    const discounted = fee - (fee * discount) / 100;
    return parseFloat(discounted.toFixed(2));
  };
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
            value={tariffData.lessonDiscount}
            onChange={(_, newValue) =>
              handleDiscountChange("lessonDiscount", Number(newValue))
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
        <SectionHeader
          title="Final Price per lesson (CHF)"
          tooltip="Final price for one driving lesson After Discount."
        />
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 0, fontSize: "16px" }}
        >
          A flat Final Fee charged at the start of each Lesson
        </Typography>
        <TextField
          fullWidth
          margin="normal"
          type="number"
          id="FinalPricePerLesson"
          placeholder="0"
          value={
            tariffData.FinalPricePerLesson === 0
              ? ""
              : tariffData.FinalPricePerLesson
          } // Show empty string for 0
          onChange={(e) => {
            const value = e.target.value;
            // Convert empty string to 0, otherwise parse the number
            const numValue = value === "" ? 0 : Number(value);
            handleLessonFeeChange("FinalPricePerLesson", numValue);
          }}
          InputProps={{
            startAdornment: <Typography sx={{ mr: 1 }}>CHF</Typography>,
            inputProps: {
              min: 0,
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
                    <Grid item xs={12}>
                      <LabelWithTooltip
                        htmlFor={`title-${index}`}
                        label="Package Title"
                        tooltip="Enter the title of Your Package."
                      />
                      <FormControl fullWidth>
                        <TextField
                          value={pkg.title}
                          id={`title-${index}`}
                          onChange={(e) =>
                            handleBulkPackageChange(
                              index,
                              "title",
                              String(e.target.value)
                            )
                          }
                          sx={{
                            "& .MuiOutlinedInput-root": {
                              padding: 1.1,
                              borderRadius: 1.6,
                            },
                          }}
                          placeholder="Package Title"
                        ></TextField>
                      </FormControl>
                    </Grid>
                    {/* Number of lessons */}
                    <Grid item xs={12}>
                      <LabelWithTooltip
                        htmlFor={`lessons-${index}`}
                        label="Number of lessons in package"
                        tooltip="Choose how many lessons are included in this package."
                      />
                      <FormControl fullWidth>
                        <TextField
                          value={pkg.lessons == 0 ? "" : pkg.lessons}
                          id={`lessons-${index}`}
                          onChange={(e) =>
                            handleBulkPackageChange(
                              index,
                              "lessons",
                              Number(e.target.value)
                            )
                          }
                          sx={{
                            "& .MuiOutlinedInput-root": {
                              padding: 1.1,
                              borderRadius: 1.6,
                            },
                          }}
                          placeholder="Number of lessons"
                        ></TextField>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12}>
                      <LabelWithTooltip
                        htmlFor={`cost-${index}`}
                        label="Package Price"
                        tooltip="Price applied to this package"
                      />
                      <TextField
                        fullWidth
                        type="number"
                        placeholder="Package Price"
                        id={`cost-${index}`}
                        value={pkg.cost === 0 ? "" : pkg.cost}
                        onChange={(e) =>
                          handleBulkPackageChange(
                            index,
                            "cost",
                            e.target.value === ""
                              ? null
                              : Number(e.target.value)
                          )
                        }
                        sx={{
                          "& .MuiOutlinedInput-root": {
                            padding: 1.1,
                            borderRadius: 1.6,
                          },
                        }}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <Typography>CHF</Typography>
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <LabelWithTooltip
                        htmlFor={`finalPrice-${index}`}
                        label="Final Package Price"
                        tooltip="Final Price of Your Package."
                      />
                      <FormControl fullWidth>
                        <TextField
                          value={
                            pkg.finalPackagePrice === 0
                              ? ""
                              : pkg.finalPackagePrice
                          }
                          id={`title-${index}`}
                          onChange={(e) =>
                            handleBulkPackageChange(
                              index,
                              "finalPackagePrice",
                              Number(e.target.value)
                            )
                          }
                          sx={{
                            "& .MuiOutlinedInput-root": {
                              padding: 1.1,
                              borderRadius: 1.6,
                            },
                          }}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <Typography>CHF</Typography>
                              </InputAdornment>
                            ),
                          }}
                          placeholder="final Package Price"
                        ></TextField>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12}>
                      <LabelWithTooltip
                        htmlFor={`studentSave-${index}`}
                        label="student Save Display"
                        tooltip="Student Save Display."
                      />
                      <FormControl fullWidth>
                        <TextField
                          value={pkg.studentSave === 0 ? "" : pkg.studentSave}
                          id={`title-${index}`}
                          onChange={(e) =>
                            handleBulkPackageChange(
                              index,
                              "studentSave",
                              Number(e.target.value)
                            )
                          }
                          sx={{
                            "& .MuiOutlinedInput-root": {
                              padding: 1.1,
                              borderRadius: 1.6,
                            },
                          }}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <Typography>CHF</Typography>
                              </InputAdornment>
                            ),
                          }}
                          placeholder="student Save Display"
                        ></TextField>
                      </FormControl>
                    </Grid>

                    <Box sx={{ mb: 2, px: 3, py: 3, width: "100%" }}>
                      <SectionHeader
                        title="% discount on Packages price"
                        tooltip="Offer a temporary discount on your regular Packages price."
                      />
                      <Typography
                        color="text.secondary"
                        sx={{ mb: 1.5, fontSize: "16px" }}
                      >
                        Discount For All Packages.
                      </Typography>
                      <Box sx={{ mb: 1 }}>
                        <Slider
                          value={pkg.packageDiscount}
                          onChange={(_, newValue) => {
                            handleBulkPackageChange(
                              index,
                              "packageDiscount",
                              newValue
                            );
                          }}
                          aria-labelledby={`package-discount-slider-${index}`}
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
                      <Grid item xs={12} sx={{ mb: 1 }}>
                        <LabelWithTooltip
                          htmlFor={`availability`}
                          label="Package availability period"
                          tooltip="Set the duration when this package is available for purchase."
                        />
                        <LocalizationProvider dateAdapter={AdapterDateFns}>
                          <Grid container spacing={3} sx={{ pt: 0.5 }}>
                            <Grid item xs={6}>
                              <DatePicker
                                label="End Date"
                                value={
                                  tariffData.bulkPackages[index]
                                    ?.PackageEndDate || null
                                }
                                onChange={(newValue) =>
                                  handleBulkPackageChange(
                                    index,
                                    "PackageEndDate",
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
                                minDate={new Date()}
                              />
                            </Grid>
                          </Grid>
                        </LocalizationProvider>
                      </Grid>
                    </Box>
                    {/* Package availability period */}
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
