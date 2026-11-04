import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
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
import toast from "react-hot-toast";
import { BadgePercent, CreditCard, Loader2, Package, Sparkles } from "lucide-react";

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

type RawBulkLessonPackage = Omit<BulkLessonPackage, "PackageEndDate"> & {
  PackageEndDate?: unknown;
};

function normalizePackageEndDate(value: unknown): Date | null {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "number" || (typeof value === "string" && /^\d+$/.test(value))) {
    const numericValue = Number(value);
    const timestamp = numericValue < 1_000_000_000_000
      ? numericValue * 1000
      : numericValue;
    const date = new Date(timestamp);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (typeof value === "string") {
    const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    const date = dateOnlyMatch
      ? new Date(
          Number(dateOnlyMatch[1]),
          Number(dateOnlyMatch[2]) - 1,
          Number(dateOnlyMatch[3]),
        )
      : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  return null;
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

      setTariffData({
        lessonFee: lessonFee || 0,
        lessonDiscount: lessonDiscount || 0,
        FinalPricePerLesson: FinalPricePerLesson || 0,
        isDefault: isDefault || false,
        bulkPackages:
          bulkPackages?.map((pkg: RawBulkLessonPackage) => {
            const finalPrice = pkg.finalPackagePrice;
            const studentSave = pkg.studentSave;
            return {
              title: pkg.title,
              lessons: pkg.lessons,
              packageDiscount: pkg.packageDiscount,

              PackageEndDate: normalizePackageEndDate(pkg.PackageEndDate),
              cost: pkg.cost,
              finalPackagePrice: parseFloat(finalPrice.toFixed(5)),
              studentSave: parseFloat(studentSave.toFixed(5)),
            };
          }) || [],
      });
    }
  }, [data]);

  // Recalculate package prices whenever FinalPricePerLesson changes
  useEffect(() => {
    if (tariffData.FinalPricePerLesson > 0) {
      const updatedPackages = tariffData.bulkPackages.map((pkg) => {
        const totalPrice = tariffData.lessonFee * pkg.lessons;
        const discountAmount = (totalPrice * pkg.packageDiscount) / 100;
        const finalPrice = totalPrice - discountAmount;

        return {
          ...pkg,
          cost: parseFloat(totalPrice.toFixed(2)),
          finalPackagePrice: parseFloat(finalPrice.toFixed(2)),
          studentSave: parseFloat(discountAmount.toFixed(2)),
        };
      });

      setTariffData((prev) => ({
        ...prev,
        bulkPackages: updatedPackages,
      }));
    }
  // Package values are recalculated only when the lesson price changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tariffData.FinalPricePerLesson]);

  if (loading)
    return (
      <div className="flex items-center justify-center h-[20vh]">
        <Loader2 />
      </div>
    );
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

  // Handle changes to bulk lesson packages - Now completely dynamic
  const handleBulkPackageChange = (
    index: number,
    field: keyof BulkLessonPackage,
    value: string | number | Date | null
  ) => {
    const updatedPackages = [...tariffData.bulkPackages];
    updatedPackages[index] = {
      ...updatedPackages[index],
      [field]: value,
    };

    // Recalculate prices based on lessons and discount changes
    if (field === "lessons" || field === "packageDiscount") {
      const lessons =
        field === "lessons" ? Number(value) : updatedPackages[index].lessons;
      const discount =
        field === "packageDiscount"
          ? Number(value)
          : updatedPackages[index].packageDiscount;

      const totalPrice = tariffData.lessonFee * lessons;
      const discountAmount = (totalPrice * discount) / 100;
      const finalPrice = totalPrice - discountAmount;

      updatedPackages[index] = {
        ...updatedPackages[index],
        cost: parseFloat(totalPrice.toFixed(2)),
        finalPackagePrice: parseFloat(finalPrice.toFixed(2)),
        studentSave: parseFloat(discountAmount.toFixed(2)),
      };
    }

    setTariffData((prev) => ({ ...prev, bulkPackages: updatedPackages }));
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
  const handleDiscountChange = (field: keyof TariffData, value: number) => {
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
      setIsLoading(false);
      return;
    }

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
    <Box className="dsp-tariff-editor" sx={{ p: 2 }}>
      <Box className="dsp-tariff-hero">
        <Box>
          <span>Pricing workspace</span>
          <Typography variant="h6">Build a clear offer for every learner</Typography>
          <Typography variant="body2">Your final prices update automatically as you adjust discounts and lesson packages.</Typography>
        </Box>
        <Box className="dsp-tariff-hero__stats">
          <div><small>Final lesson price</small><strong>CHF {tariffData.FinalPricePerLesson || "—"}</strong></div>
          <div><small>Package offers</small><strong>{tariffData.bulkPackages.length}</strong></div>
        </Box>
      </Box>
      <Box className="dsp-tariff-summary-grid" aria-label="Pricing overview">
        <div className="dsp-tariff-summary-card is-violet"><span className="dsp-tariff-summary-card__icon"><CreditCard size={18} /></span><small>Base lesson price</small><strong>CHF {tariffData.lessonFee || "—"}</strong><em>Standard lesson rate</em></div>
        <div className="dsp-tariff-summary-card is-pink"><span className="dsp-tariff-summary-card__icon"><BadgePercent size={18} /></span><small>Discount</small><strong>{tariffData.lessonDiscount}%</strong><em>Applied to lesson price</em></div>
        <div className="dsp-tariff-summary-card is-blue"><span className="dsp-tariff-summary-card__icon"><Sparkles size={18} /></span><small>Student price</small><strong>CHF {tariffData.FinalPricePerLesson || "—"}</strong><em>Final price per lesson</em></div>
        <div className="dsp-tariff-summary-card is-green"><span className="dsp-tariff-summary-card__icon"><Package size={18} /></span><small>Package offers</small><strong>{tariffData.bulkPackages.length}</strong><em>Available bundles</em></div>
      </Box>
      {/* Lesson Fee Section */}
      <Box className="dsp-tariff-section dsp-tariff-section--base" sx={{ mb: 2 }}>
        <SectionHeader
          title="Price per lesson (CHF)"
          tooltip="Base price per individual lesson (e.g., CHF 90)"
        />
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 0, fontSize: "16px" }}
        >
          Base price per individual lesson (e.g., CHF 90)
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
          title="Discount (%)"
          tooltip="Optional discount applied to the base price (e.g., 10%)"
        />
        <Typography color="text.secondary" sx={{ mb: 1.5, fontSize: "16px" }}>
          Optional discount applied to the base price (e.g., 10%)
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
              color: "var(--ws-primary-ink, #8B5CF6)",
              "& .MuiSlider-thumb": {
                height: 24,
                width: 24,
                backgroundColor: "var(--ws-surface, #fff)",
                border: "2px solid var(--ws-primary, #A855F7)",
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
          title="Final price per lesson (CHF)"
          tooltip="Automatically calculated: base price - discount (e.g., CHF 90 → CHF 81)."
        />
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 0, fontSize: "16px" }}
        >
          Automatically calculated: base price - discount (e.g., CHF 90 → CHF
          81)
        </Typography>
        <TextField
          fullWidth
          margin="normal"
          type="number"
          id="FinalPricePerLesson"
          placeholder="0"
          disabled={true} // ✅ DISABLED - Auto-calculated
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
              backgroundColor: "var(--ws-surface, #f5f5f5)", // Visual indication it's disabled
            },
          }}
        />
      </Box>

      {/* Bulk Lesson Package Section */}
      <Box className="dsp-tariff-section dsp-tariff-section--packages" sx={{ mb: 2 }}>
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
                background: "linear-gradient(135deg, var(--ws-primary, #7C3AED), var(--ws-primary, #EC4899))",
                "&:hover": { background: "linear-gradient(135deg, var(--ws-primary, #6D28D9), var(--ws-primary, #DB2777))" },
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
              className="dsp-tariff-package"
              sx={{ mb: 3, p: 2, border: "1px solid var(--ws-border, #e0e0e0)", borderRadius: 2 }}
            >
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={11}>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <LabelWithTooltip
                        htmlFor={`title-${index}`}
                        label="Package title"
                        tooltip="Title of the package (e.g., “10 Lesson Pack”)"
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
                        />
                      </FormControl>
                    </Grid>

                    {/* Number of lessons */}
                    <Grid item xs={12}>
                      <LabelWithTooltip
                        htmlFor={`lessons-${index}`}
                        label="Number of lessons"
                        tooltip="How many lessons the package includes (e.g., 10 lessons)"
                      />
                      <FormControl fullWidth>
                        <TextField
                          type="number"
                          value={pkg.lessons == 0 ? "" : pkg.lessons}
                          id={`lessons-${index}`}
                          onChange={(e) =>
                            handleBulkPackageChange(
                              index,
                              "lessons",
                              Number(e.target.value) || 0
                            )
                          }
                          sx={{
                            "& .MuiOutlinedInput-root": {
                              padding: 1.1,
                              borderRadius: 1.6,
                            },
                          }}
                          placeholder="Number of lessons"
                        />
                      </FormControl>
                    </Grid>

                    {/* Total price of package - DISABLED */}
                    <Grid item xs={12}>
                      <LabelWithTooltip
                        htmlFor={`cost-${index}`}
                        label="Total price of package"
                        tooltip="Auto-calculated: price per lesson × number of lessons  (e.g., CHF 750)"
                      />
                      <TextField
                        fullWidth
                        type="number"
                        placeholder="Package Price"
                        id={`cost-${index}`}
                        value={pkg.cost === 0 ? "" : pkg.cost}
                        disabled={true} // ✅ DISABLED - Auto-calculated
                        sx={{
                          "& .MuiOutlinedInput-root": {
                            padding: 1.1,
                            borderRadius: 1.6,
                            backgroundColor: "var(--ws-surface, #f5f5f5)", // Visual indication it's disabled
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

                    {/* Package Discount Slider */}
                    <Grid item xs={12} sx={{ mt: 1 }}>
                      <SectionHeader
                        title="Discount (%)"
                        tooltip="Discount applied to the package total (e.g., 10%)"
                      />
                      <Typography
                        color="text.secondary"
                        sx={{ mb: 1, fontSize: "16px" }}
                      >
                        Discount For This Package.
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
                            color: "var(--ws-primary-ink, #8B5CF6)",
                            "& .MuiSlider-thumb": {
                              height: 24,
                              width: 24,
                              backgroundColor: "var(--ws-surface, #fff)",
                              border: "2px solid var(--ws-primary, #A855F7)",
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
                    </Grid>

                    {/* Final package price - DISABLED */}
                    <Grid item xs={12}>
                      <LabelWithTooltip
                        htmlFor={`finalPrice-${index}`}
                        label="Final package price"
                        tooltip="Auto-calculated total after discount (e.g., CHF 750 - 10% = CHF 675)"
                      />
                      <FormControl fullWidth>
                        <TextField
                          value={
                            pkg.finalPackagePrice === 0
                              ? ""
                              : pkg.finalPackagePrice
                          }
                          id={`finalPrice-${index}`}
                          disabled={true} // ✅ DISABLED - Auto-calculated
                          sx={{
                            "& .MuiOutlinedInput-root": {
                              padding: 1.1,
                              borderRadius: 1.6,
                              backgroundColor: "var(--ws-surface, #f5f5f5)", // Visual indication it's disabled
                            },
                          }}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <Typography>CHF</Typography>
                              </InputAdornment>
                            ),
                          }}
                          placeholder="Final Package Price"
                        />
                      </FormControl>
                    </Grid>

                    {/* Student Save - DISABLED */}
                    <Grid item xs={12}>
                      <LabelWithTooltip
                        htmlFor={`studentSave-${index}`}
                        label="Student Save Display"
                        tooltip="Difference between normal price and final package price (shown in green)"
                      />
                      <FormControl fullWidth>
                        <TextField
                          value={pkg.studentSave === 0 ? "" : pkg.studentSave}
                          id={`studentSave-${index}`}
                          disabled={true} // ✅ DISABLED - Auto-calculated
                          sx={{
                            "& .MuiOutlinedInput-root": {
                              padding: 1.1,
                              borderRadius: 1.6,
                              backgroundColor: "var(--ws-surface, #f5f5f5)", // Visual indication it's disabled
                            },
                          }}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <Typography>CHF</Typography>
                              </InputAdornment>
                            ),
                          }}
                          placeholder="Student Save Display"
                        />
                      </FormControl>
                    </Grid>

                    {/* Package End Date */}
                    <Box sx={{ mb: 2, px: 2, py: 3, width: "100%" }}>
                      <Grid item xs={12} sx={{ mb: 1 }}>
                        <LabelWithTooltip
                          htmlFor={`availability`}
                          label="Expiration date"
                          tooltip="Date until when the offer is valid"
                        />
                        <LocalizationProvider dateAdapter={AdapterDateFns}>
                          <Grid container spacing={3} sx={{ pt: 0.5 }}>
                            <Grid item xs={6}>
                              <DatePicker
                                label="End Date"
                                value={normalizePackageEndDate(
                                  tariffData.bulkPackages[index]?.PackageEndDate,
                                )}
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
                                    borderColor: "var(--ws-border, #e0e0e0)",
                                  },
                                  "&:hover .MuiOutlinedInput-notchedOutline": {
                                    borderColor: "var(--ws-border, #bdbdbd)",
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
      <Box className="dsp-tariff-save"
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
            background: "linear-gradient(135deg, var(--ws-primary, #7C3AED), var(--ws-primary, #EC4899))",
            "&:hover": { background: "linear-gradient(135deg, var(--ws-primary, #6D28D9), var(--ws-primary, #DB2777))" },
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
                  color: "#ffffff",
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
