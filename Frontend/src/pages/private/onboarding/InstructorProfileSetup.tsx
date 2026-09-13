import type React from "react";
import { useEffect, useRef, useState } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Stepper,
  Step,
  StepLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  CircularProgress,
  List,
  ListItem,
  FormHelperText,
  IconButton,
  InputAdornment,
  Alert,
} from "@mui/material";
import { DeleteIcon } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Controller, useForm } from "react-hook-form";
import Logo from "../../../components/Logo";
import { useAuth } from "../../../context/AuthContext";
import { useMutation } from "@apollo/client";
import { SETUP_INSTRUCTOR_PROFILE } from "../../../graphql/mutations/auth";
import { useNavigate } from "react-router-dom";

// Import the Accordion components (add these at the top of your file)
import { Accordion, AccordionSummary, AccordionDetails } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import toast from "react-hot-toast";
import { useFileUpload } from "../../../hooks/useUploadURL";
import axios from "axios";
import _ from "lodash";
// Add this to your MUI imports
import { Description as DescriptionIcon } from "@mui/icons-material";
import DocumentUploaderInstructor from "../../../components/public/DocumentUploaderInstructor";
import {
  clearOnboardingDraft,
  loadOnboardingDraft,
  saveOnboardingDraft,
} from "../../../utils/onboardingDraft";
const schema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email"),
  phone: z.string().regex(/^\d{9}$/, "Phone number must be 9 digits after +41"),
  address: z.string().min(1, "Address is required"),
  location: z.string().min(1, "City is required"),
  zipCode: z.string().min(1, "ZIP code is required"),
  description: z.string().optional(),
  experience: z.string().optional(),
  documents: z
    .array(
      z.object({
        documentType: z.string().optional(),
        documentUrl: z.string().optional(),
      })
    )
    .optional(),
  optionalDocuments: z
    .array(
      z.object({
        documentType: z.string().optional(),
        documentUrl: z.string().optional(),
      })
    )
    .optional(),
  carName: z.string().min(2, "Car model must be at least 2 characters").max(50),
  transmissionType: z.enum(["Automatic", "Manual"]),
  gender: z.enum(["Male", "Female", "Other"]),
});
const steps = [
  "Personal Information",
  "More Information",
  "Finish Setup",
];

const InstructorProfileSetup: React.FC = () => {
  const [setupInstructorProfile] = useMutation(SETUP_INSTRUCTOR_PROFILE);

  const [activeStep, setActiveStep] = useState(0);
  const { user, markUserProfileComplete } = useAuth();
  const navigate = useNavigate();
  const { uploadFile } = useFileUpload();

  const {
    control,
    handleSubmit,
    setValue,
    reset,
    watch,
    getValues,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      email: user?.email || "",
      phone: "",
      address: "",
      location: "",
      zipCode: "",
      description: "",
      experience: "",
      documents: [],
      optionalDocuments: [],
      carName: "",
      transmissionType: "Manual",
      gender: "Male",
    },
  });
  const requiredDocuments = [
    "Swiss Driving License",
    "National ID or Passport",
    "Federal Driving Instructor Certificate",
    "Swiss Criminal Record Extract",
  ];

  const optionalDocuments = [
    "Driving Instructor Authorization",
    "Professional Passenger Transport Authorization",
    "Refresher Training Certificates",
    "Other Document (Optional)",
  ];

  useEffect(() => {
    if (user) {
      setValue("firstName", user.firstName || "");
      setValue("lastName", user.lastName || "");
      setValue("email", user.email || "");
    }
  }, [user, setValue]);

  const [selectedFiles, setSelectedFiles] = useState<
    { file: File; documentType: string }[]
  >([]);
  const [draftHydrated, setDraftHydrated] = useState(false);
  const [restoredDocumentMetadata, setRestoredDocumentMetadata] = useState<
    Array<{ documentType: string; fileName?: string }>
  >([]);

  const handleFileUpload = (file: File | null, documentType: string) => {
    if (file) {
      setRestoredDocumentMetadata((prev) =>
        prev.filter((document) => document.documentType !== documentType)
      );
    }
    if (file) {
      if (
        documentType === "Other Document (Optional)" ||
        documentType === "Refresher Training Certificates"
      ) {
        // Append multiple optional documents
        setSelectedFiles((prev) => [...prev, { file, documentType }]);
      } else {
        // Replace existing entries for the same documentType
        setSelectedFiles((prev) => [
          ...prev.filter((doc) => doc.documentType !== documentType),
          { file, documentType },
        ]);
      }
    } else {
      // Remove all entries of this documentType
      setSelectedFiles((prev) =>
        prev.filter((doc) => doc.documentType !== documentType)
      );
    }
  };
  const handleBack = () => {
    if (user?.id) {
      saveOnboardingDraft(user.id, "Instructor", {
        activeStep: Math.max(activeStep - 1, 0),
        formValues: getValues(),
        coordinates,
        documents: selectedFiles.map(({ file, documentType }) => ({
          documentType,
          fileName: file.name,
        })),
      });
    }
    setActiveStep((prevStep) => prevStep - 1);
  };

  const [loading, setLoading] = useState(false);

  const handleNext = async (data) => {
    const { email, ...mutationData } = data;
    void email;

    if (activeStep === 1) {
      if (!data?.experience) {
        toast.error("Experience is required.");
        return; // Stop progression
      }
      const missingDocuments = requiredDocuments.filter((docType) => {
        if (docType === "Other Documents") return false;

        if (docType === "Swiss Driving License") {
          const hasFront = selectedFiles.some(
            (file) => file.documentType === "Swiss Driving License (Front)"
          );
          const hasBack = selectedFiles.some(
            (file) => file.documentType === "Swiss Driving License (Back)"
          );
          return !(hasFront && hasBack); // missing if either side is missing
        }

        return !selectedFiles.some((file) => file.documentType === docType);
      });

      if (missingDocuments.length > 0) {
        toast.error(
          `Please upload the following documents: ${missingDocuments.join(
            ", "
          )}`
        );
        return; // Stop progression
      }
    }

    if (activeStep === steps.length - 1) {
      try {
        setLoading(true); // Start loading

        if (selectedFiles.length === 0) {
          throw new Error("Please re-select your document files before submitting.");
        }

        // Upload all files and collect their URLs
        const documentUploads = await Promise.all(
          selectedFiles.map(async (file) => {
            const uploadResult = await uploadFile(
              file.file,
              user?.id,
              user?.role
            );
            if (!uploadResult.success) {
              throw new Error(`File upload failed: ${uploadResult.message}`);
            }
            return {
              documentType: file.documentType,
              documentUrl: uploadResult.fileUrl,
              status: "pending",
            };
          })
        );

        // Prepare the final data for the mutation
        const { optionalDocuments, ...filteredData } = mutationData;
        void optionalDocuments;

        const finalData = {
          ...filteredData,
          documents: documentUploads,
          coordinates: coordinates,
        };
        // Call the mutation
        const result = await setupInstructorProfile({
          variables: {
            input: finalData,
          },
        });

        if (!result.data?.setupInstructorProfile) {
          throw new Error("Profile setup did not complete");
        }

        markUserProfileComplete();
        if (user?.id) clearOnboardingDraft(user.id, "Instructor");
        toast.success("Profile setup successfully");
        navigate("/teacher-dashboard/overview");
      } catch (err) {
        toast.error(
          `Profile setup failed: ${err instanceof Error ? err.message : "Please try again."}`
        );
      } finally {
        setLoading(false); // Stop loading
      }
    } else {
      if (user?.id) {
        saveOnboardingDraft(user.id, "Instructor", {
          activeStep: activeStep + 1,
          formValues: getValues(),
          coordinates,
          documents: selectedFiles.map(({ file, documentType }) => ({
            documentType,
            fileName: file.name,
          })),
        });
      }
      setActiveStep((prevStep) => prevStep + 1);
    }
  };
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastRequestTime = useRef(0);
  const isSelecting = useRef(false);

  const [coordinates, setCoordinates] = useState({
    type: "Point",
    coordinates: [0, 0],
  });

  useEffect(() => {
    if (!user?.id) {
      setDraftHydrated(true);
      return;
    }

    const draft = loadOnboardingDraft(user.id, "Instructor");
    if (draft) {
      reset({
        firstName: typeof draft.formValues.firstName === "string" ? draft.formValues.firstName : user.firstName || "",
        lastName: typeof draft.formValues.lastName === "string" ? draft.formValues.lastName : user.lastName || "",
        email: typeof draft.formValues.email === "string" ? draft.formValues.email : user.email || "",
        phone: typeof draft.formValues.phone === "string" ? draft.formValues.phone : "",
        address: typeof draft.formValues.address === "string" ? draft.formValues.address : "",
        location: typeof draft.formValues.location === "string" ? draft.formValues.location : "",
        zipCode: typeof draft.formValues.zipCode === "string" ? draft.formValues.zipCode : "",
        description: typeof draft.formValues.description === "string" ? draft.formValues.description : "",
        experience: typeof draft.formValues.experience === "string" ? draft.formValues.experience : "",
        documents: Array.isArray(draft.formValues.documents) ? draft.formValues.documents : [],
        optionalDocuments: Array.isArray(draft.formValues.optionalDocuments) ? draft.formValues.optionalDocuments : [],
        carName: typeof draft.formValues.carName === "string" ? draft.formValues.carName : "",
        transmissionType: draft.formValues.transmissionType === "Automatic" ? "Automatic" : "Manual",
        gender: draft.formValues.gender === "Female" || draft.formValues.gender === "Other" ? draft.formValues.gender : "Male",
      } as never);
      setActiveStep(Math.min(Math.max(draft.activeStep, 0), steps.length - 1));
      if (draft.coordinates) setCoordinates(draft.coordinates);
      setRestoredDocumentMetadata(draft.documents);
    }
    setDraftHydrated(true);
  }, [reset, user]);

  const watchedValues = watch();
  useEffect(() => {
    if (!draftHydrated || !user?.id) return;
    const timeout = window.setTimeout(() => {
      saveOnboardingDraft(user.id, "Instructor", {
        activeStep,
        formValues: watchedValues,
        coordinates,
        documents: selectedFiles.map(({ file, documentType }) => ({
          documentType,
          fileName: file.name,
        })),
      });
    }, 400);
    return () => window.clearTimeout(timeout);
  }, [activeStep, coordinates, draftHydrated, selectedFiles, user?.id, watchedValues]);
  const fetchLocations = useRef(
    _.debounce(async (inputValue) => {
      if (!inputValue) {
        setSuggestions([]);
        return;
      }

      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;
      const requestId = Date.now();
      lastRequestTime.current = requestId;

      try {
        const response = await axios.get(
          "https://nominatim.openstreetmap.org/search",
          {
            params: {
              q: inputValue,
              format: "json",
              addressdetails: 1,
              limit: 10,
              countrycodes: "ch", // Restrict to Switzerland with country code "ch"
            },
            signal: controller.signal,
          }
        );

        // Only update if this is the latest request
        if (lastRequestTime.current === requestId) {
          // Double-check that all results are from Switzerland
          interface OpenStreetMapResult {
            address: {
              country_code?: string;
            };
          }

          const swissLocations = response.data.filter(
            (place: OpenStreetMapResult) =>
              place.address && place.address.country_code === "ch"
          );
          setSuggestions(swissLocations);
          setShowSuggestions(true);
        }
      } catch (error) {
        if (!axios.isCancel(error)) {
          console.error("Error fetching locations:", error);
          setSuggestions([]);
        }
      }
    }, 300) // 300ms debounce time
  ).current;

  interface Address {
    display_name: string;
    address: {
      city?: string;
      town?: string;
      village?: string;
      county?: string;
      postcode?: string;
    };
    lat?: string;
    lon?: string;
  }

  const handleSelectSuggestion = (address: Address): void => {
    isSelecting.current = true;
    setValue("address", address?.display_name, { shouldValidate: true });
    setShowSuggestions(false);

    // Extract city and ZIP code from address details
    const city =
      address?.address?.city ||
      address?.address?.town ||
      address?.address?.village ||
      address?.address?.county ||
      "";
    const zipCode = address?.address?.postcode || "";

    // Update city and ZIP code fields
    setValue("location", city, { shouldValidate: true });
    setValue("zipCode", zipCode, { shouldValidate: true });

    // Update coordinates if available
    if (address?.lat && address?.lon) {
      setCoordinates({
        type: "Point",
        coordinates: [
          Number.parseFloat(address.lon),
          Number.parseFloat(address.lat),
        ],
      });
    }
  };

  useEffect(() => {
    return () => {
      // Cleanup debounce on unmount
      fetchLocations.cancel();
    };
  }, [fetchLocations]);

  const renderPersonalInfo = () => (
    <Box component="form">
      <Box>
        <Box sx={{ mb: 1 }}>
          <InputLabel htmlFor="firstName" sx={{ mb: 1 }}>
            First Name
          </InputLabel>
          <Controller
            name="firstName"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                id="firstName"
                placeholder="First Name"
                error={!!errors.firstName}
                helperText={errors.firstName?.message}
              />
            )}
          />
        </Box>

        <Box sx={{ mb: 1 }}>
          <InputLabel htmlFor="lastName" sx={{ mb: 1 }}>
            Last Name
          </InputLabel>
          <Controller
            name="lastName"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                id="lastName"
                placeholder="Last Name"
                error={!!errors.lastName}
                helperText={errors.lastName?.message}
              />
            )}
          />
        </Box>

        <Box sx={{ mb: 1 }}>
          <InputLabel htmlFor="email" sx={{ mb: 1 }}>
            E-mail address
          </InputLabel>
          <Controller
            name="email"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                id="email"
                placeholder="E-mail address"
                autoComplete="email"
                error={!!errors.email}
                helperText={errors.email?.message}
                disabled
              />
            )}
          />
        </Box>

        <Box sx={{ mb: 1 }}>
          <InputLabel htmlFor="phone" sx={{ mb: 1 }}>
            Phone Number
          </InputLabel>
          <Controller
            name="phone"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                id="phone"
                placeholder="79 123 45 67"
                error={!!errors.phone}
                helperText={errors.phone?.message}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">+41</InputAdornment>
                  ),
                  inputProps: {
                    maxLength: 9,
                    inputMode: "numeric",
                    pattern: "[0-9]*",
                  },
                  onChange: (e) => {
                    // Allow only digits and enforce 9 digit limit
                    const onlyDigits = e.target.value
                      .replace(/\D/g, "")
                      .slice(0, 9);
                    field.onChange(onlyDigits);
                  },
                }}
                value={field.value}
              />
            )}
          />
        </Box>
        {/* Car Name Field */}
        <Box sx={{ mb: 1 }}>
          <InputLabel htmlFor="carName" sx={{ mb: 1 }}>
            Car
          </InputLabel>
          <Controller
            name="carName"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                id="carName"
                placeholder="Enter your car name"
                error={!!errors.carName}
                helperText={errors.carName?.message}
              />
            )}
          />
        </Box>

        {/* Transmission Type Field */}
        <Box sx={{ mb: 1 }}>
          <InputLabel htmlFor="transmissionType" sx={{ mb: 1 }}>
            Transmission Type
          </InputLabel>
          <Controller
            name="transmissionType"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                fullWidth
                id="transmissionType"
                error={!!errors.transmissionType}
                displayEmpty
              >
                <MenuItem value="" disabled>
                  Select transmission type
                </MenuItem>
                <MenuItem value="Automatic">Automatic</MenuItem>
                <MenuItem value="Manual">Manual</MenuItem>
              </Select>
            )}
          />
          {errors.transmissionType && (
            <FormHelperText error>
              {errors.transmissionType.message}
            </FormHelperText>
          )}
        </Box>

        {/* Gender Field */}
        <Box sx={{ mb: 1 }}>
          <InputLabel htmlFor="gender" sx={{ mb: 1 }}>
            Gender
          </InputLabel>
          <Controller
            name="gender"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                fullWidth
                id="gender"
                error={!!errors.gender}
                displayEmpty
              >
                <MenuItem value="" disabled>
                  Select your gender
                </MenuItem>
                <MenuItem value="Male">Male</MenuItem>
                <MenuItem value="Female">Female</MenuItem>
                <MenuItem value="Other">Other</MenuItem>
              </Select>
            )}
          />
          {errors.gender && (
            <FormHelperText error>{errors.gender.message}</FormHelperText>
          )}
        </Box>

        <Box sx={{ mb: 3, position: "relative" }}>
          <InputLabel htmlFor="address" sx={{ mb: 1 }}>
            Home Address
          </InputLabel>
          <Controller
            name="address"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                placeholder="Enter Address"
                error={!!errors.address}
                helperText={errors.address?.message}
                onChange={(e) => {
                  field.onChange(e);
                  isSelecting.current = false;
                  fetchLocations(e.target.value);
                }}
                onBlur={() => {
                  // Add a small delay to allow click events to process first
                  setTimeout(() => {
                    if (!isSelecting.current) {
                      setShowSuggestions(false);
                    }
                  }, 200);
                }}
              />
            )}
          />
          {showSuggestions && suggestions.length > 0 && (
            <Paper
              sx={{
                position: "absolute",
                width: "100%",
                zIndex: 10,
                mt: 1,
                maxHeight: 200,
                overflowY: "auto",
              }}
            >
              <List>
                {suggestions.map((place) => (
                  <ListItem
                    button
                    key={place.place_id}
                    onClick={() => {
                      isSelecting.current = true;
                      handleSelectSuggestion(place);
                    }}
                    onMouseDown={(e) => e.preventDefault()} // Prevent blur on mouse down
                  >
                    {place.display_name}
                  </ListItem>
                ))}
              </List>
            </Paper>
          )}
        </Box>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 2,
            mb: 3,
          }}
        >
          <Box sx={{ display: "flex", flexDirection: "column" }}>
            <InputLabel htmlFor="location" sx={{ mb: 1 }}>
              City
            </InputLabel>
            <Controller
              name="location"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  id="location"
                  placeholder="City"
                  error={!!errors.location}
                  helperText={errors.location?.message}
                />
              )}
            />
          </Box>

          <Box sx={{ display: "flex", flexDirection: "column" }}>
            <InputLabel htmlFor="zipCode" sx={{ mb: 1 }}>
              ZIP Code
            </InputLabel>
            <Controller
              name="zipCode"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  id="zipCode"
                  placeholder="ZIP Code"
                  error={!!errors.zipCode}
                  helperText={errors.zipCode?.message}
                />
              )}
            />
          </Box>
        </Box>

        <Box sx={{ mb: 3 }}>
          <InputLabel htmlFor="description" sx={{ mb: 1 }}>
            Personal Description
          </InputLabel>
          <Controller
            name="description"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                id="description"
                placeholder="Personal Description"
                multiline
                rows={4}
                error={!!errors.description}
                helperText={errors.description?.message}
              />
            )}
          />
        </Box>
      </Box>
    </Box>
  );
  const renderMoreInfo = () => (
    <Box
      component="form"
      onSubmit={handleSubmit(handleNext)}
      sx={{ overflowY: "auto", height: "100%" }}
    >
      <Box sx={{ mt: 2 }}>
        {/* Experience Selector (unchanged) */}
        <FormControl fullWidth margin="normal" error={!!errors.experience}>
          <InputLabel>Experience</InputLabel>
          <Controller
            name="experience"
            control={control}
            render={({ field }) => (
              <Select {...field} label="Experience">
                <MenuItem value="0-1">0-1 years</MenuItem>
                <MenuItem value="1-3">1-3 years</MenuItem>
                <MenuItem value="3-5">3-5 years</MenuItem>
                <MenuItem value="5-10">5-10 years</MenuItem>
                <MenuItem value="10+">10+ years</MenuItem>
              </Select>
            )}
          />
          {errors.experience && (
            <Typography variant="body2" color="error">
              {errors.experience.message}
            </Typography>
          )}
        </FormControl>

        <Typography variant="h6" sx={{ mt: 2, mb: 2 }}>
          Upload Documents
        </Typography>

        {restoredDocumentMetadata.length > 0 && selectedFiles.length === 0 && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Previously selected files cannot be restored after a refresh. Please select them again before submitting.
          </Alert>
        )}

        {requiredDocuments.map((docType, index) => (
          <Box key={index} sx={{ mb: 2 }}>
            <FormControl fullWidth margin="normal">
              <Controller
                name={`documents.${index}.documentType`}
                control={control}
                defaultValue={docType}
                render={({ field }) => (
                  <Select {...field} disabled>
                    <MenuItem value={docType}>{docType}</MenuItem>
                  </Select>
                )}
              />
            </FormControl>

            {/* Special handling for Swiss Driving License - split into front and back */}
            {docType === "Swiss Driving License" ? (
              <Box sx={{ display: "flex", flexDirection: "row", gap: 2 }}>
                <Box sx={{ mt: 1 }}>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    Front Side
                  </Typography>
                  <DocumentUploaderInstructor
                    onFileUpload={(file) =>
                      handleFileUpload(file, "Swiss Driving License (Front)")
                    }
                    selectedFile={
                      selectedFiles.find(
                        (doc) =>
                          doc.documentType === "Swiss Driving License (Front)"
                      )?.file || null
                    }
                    setSelectedFile={(file) =>
                      handleFileUpload(file, "Swiss Driving License (Front)")
                    }
                    setValue={setValue}
                    documentType="Swiss Driving License (Front)"
                  />
                </Box>

                <Box sx={{ mt: 1 }}>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    Back Side
                  </Typography>
                  <DocumentUploaderInstructor
                    onFileUpload={(file) =>
                      handleFileUpload(file, "Swiss Driving License (Back)")
                    }
                    selectedFile={
                      selectedFiles.find(
                        (doc) =>
                          doc.documentType === "Swiss Driving License (Back)"
                      )?.file || null
                    }
                    setSelectedFile={(file) =>
                      handleFileUpload(file, "Swiss Driving License (Back)")
                    }
                    setValue={setValue}
                    documentType="Swiss Driving License (Back)"
                  />
                </Box>
              </Box>
            ) : (
              <DocumentUploaderInstructor
                key={docType}
                onFileUpload={handleFileUpload}
                selectedFile={
                  selectedFiles.find((doc) => doc.documentType === docType)
                    ?.file || null
                }
                setSelectedFile={(file) => handleFileUpload(file, docType)}
                setValue={setValue}
                documentType={docType}
              />
            )}
          </Box>
        ))}

        {/* Optional Documents Accordion Section */}
        <Box sx={{ paddingBottom: "10px" }}>
          <Accordion
            sx={{
              mt: 3,
              mb: 3,
              "&:before": {
                display: "none",
              },
            }}
            elevation={1}
            defaultExpanded={false}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              aria-controls="optional-documents-content"
              id="optional-documents-header"
              sx={{
                backgroundColor: "#168a72",
                color: "#ffffff",
                borderRadius: "4px",
                "&:hover": {
                  backgroundColor: "#11705d",
                },
                "& .MuiAccordionSummary-expandIconWrapper": {
                  color: "#ffffff",
                },
                "& .MuiTypography-root": {
                  color: "#ffffff",
                },
                "&.Mui-expanded": {
                  backgroundColor: "#168a72",
                  borderBottomLeftRadius: 0,
                  borderBottomRightRadius: 0,
                },
              }}
            >
              <Typography variant="h6">Optional Documents Upload</Typography>
            </AccordionSummary>
            <AccordionDetails
              sx={{
                pt: 3,
                border: "1px solid",
                borderColor: "#168a72",
                borderTop: "none",
                borderBottomLeftRadius: "4px",
                borderBottomRightRadius: "4px",
              }}
            >
              {optionalDocuments.map((docType, index) => (
                <Box key={index} sx={{ mb: 2 }}>
                  <FormControl fullWidth margin="normal">
                    <Controller
                      name={`optionalDocuments.${index}.documentType`}
                      control={control}
                      defaultValue={docType}
                      render={({ field }) => (
                        <Select {...field} disabled>
                          <MenuItem value={docType}>{docType}</MenuItem>
                        </Select>
                      )}
                    />
                  </FormControl>

                  {docType === "Other Document (Optional)" ? (
                    <Box sx={{ mt: 1 }}>
                      <input
                        accept=".pdf,.jpg,.jpeg,.png"
                        style={{ display: "none" }}
                        id={`optional-other-docs-upload`}
                        type="file"
                        multiple
                        onChange={(e) => {
                          const files = e.target.files
                            ? Array.from(e.target.files)
                            : [];
                          files.forEach((file) => {
                            handleFileUpload(file, "Other Document (Optional)");
                          });
                        }}
                      />
                      <label htmlFor={`optional-other-docs-upload`}>
                        <Button
                          variant="outlined"
                          component="span"
                          sx={{ mr: 2 }}
                        >
                          Upload Multiple
                        </Button>
                      </label>
                      <Typography
                        variant="caption"
                        display="block"
                        sx={{ mt: 1 }}
                      >
                        You can upload multiple optional documents
                      </Typography>

                      {/* Display uploaded optional other documents with previews */}
                      {selectedFiles
                        .filter(
                          (doc) =>
                            doc.documentType === "Other Document (Optional)"
                        )
                        .map((doc, idx) => (
                          <Box
                            key={idx}
                            sx={{
                              display: "flex",
                              flexDirection: "column",
                              mt: 2,
                              p: 2,
                              border: "1px solid #e0e0e0",
                              borderRadius: 1,
                            }}
                          >
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                mb: 1,
                              }}
                            >
                              <Typography
                                variant="body2"
                                sx={{ flexGrow: 1, fontWeight: "bold" }}
                              >
                                {doc.file.name}
                              </Typography>
                              <IconButton
                                size="small"
                                onClick={() => {
                                  const updatedFiles = selectedFiles.filter(
                                    (f) =>
                                      !(
                                        f.documentType ===
                                          "Other Document (Optional)" &&
                                        f?.file?.name === doc?.file?.name
                                      )
                                  );
                                  setSelectedFiles(updatedFiles);
                                  setValue("documents", updatedFiles);
                                }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Box>

                            {/* File Preview Section */}
                            {doc.file.type.startsWith("image/") ? (
                              <Box
                                sx={{
                                  mt: 1,
                                  maxHeight: 200,
                                  overflow: "hidden",
                                  display: "flex",
                                  justifyContent: "center",
                                }}
                              >
                                <img
                                  src={URL.createObjectURL(doc.file)}
                                  alt="Preview"
                                  style={{
                                    maxWidth: "100%",
                                    maxHeight: "100%",
                                    objectFit: "contain",
                                  }}
                                />
                              </Box>
                            ) : (
                              <Box
                                sx={{
                                  mt: 1,
                                  p: 2,
                                  backgroundColor: "#f5f5f5",
                                  borderRadius: 1,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                <DescriptionIcon
                                  sx={{ mr: 1, color: "primary.main" }}
                                />
                                <Typography variant="body2">
                                  PDF Document (Preview not available)
                                </Typography>
                              </Box>
                            )}
                          </Box>
                        ))}
                    </Box>
                  ) : (
                    <DocumentUploaderInstructor
                      key={docType}
                      onFileUpload={handleFileUpload}
                      selectedFile={
                        selectedFiles.find(
                          (doc) => doc.documentType === docType
                        )?.file || null
                      }
                      setSelectedFile={(file) =>
                        handleFileUpload(file, docType)
                      }
                      allowMultiple={
                        docType === "Refresher Training Certificates"
                      }
                      setValue={setValue}
                      documentType={docType}
                    />
                  )}
                </Box>
              ))}
            </AccordionDetails>
          </Accordion>
        </Box>
      </Box>
    </Box>
  );
  const renderPaymentInfo = () => (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h6" sx={{ mb: 1 }}>
        Your profile is ready to submit
      </Typography>
      <Typography variant="body1" color="text.secondary">
        Submit your details and documents for review. Once approved, you can
        finish payment and payout setup from your instructor dashboard.
      </Typography>
    </Box>
  );

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return renderPersonalInfo();
      case 1:
        return renderMoreInfo();
      case 2:
        return renderPaymentInfo();
      default:
        return null;
    }
  };

  const onError = (errors) => {
    Object.values(errors).forEach((error) => {
      toast.error(error.message);
    });
  };

  return (
    <Box
      sx={{ width: "100%", maxWidth: "md", mx: "auto", overflowY: "scroll" }}
    >
      <Box
        component="img"
        alt="Circles"
        src="/auth/decorative-circles.png"
        sx={{
          position: "absolute",
          top: 1,
          right: 1,
          pointerEvents: "none",
          userSelect: "none",
        }}
      />

      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
        }}
      >
        <Logo />
        <Typography
          variant="h4"
          component="h1"
          sx={{ mt: 1, fontWeight: "bold" }}
        >
          Welcome!
        </Typography>
      </Box>

      <Stepper activeStep={activeStep} sx={{ mt: 2, mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>
      <Box
        sx={{
          maxHeight: "50vh", // Adjust this value as needed
          overflowY: "auto",
          paddingRight: "12px",
          // pr: 1.5,
        }}
      >
        {renderStepContent()}
      </Box>

      <Box sx={{ display: "flex", justifyContent: "space-between", mt: 4 }}>
        <Button disabled={activeStep === 0} onClick={handleBack}>
          Back
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit(handleNext, onError)}
          disabled={loading}
        >
          {loading ? (
            <CircularProgress size={24} color="inherit" />
          ) : activeStep === steps.length - 1 ? (
            "Submit"
          ) : (
            "Next"
          )}
        </Button>
      </Box>
    </Box>
  );
};

export default InstructorProfileSetup;
