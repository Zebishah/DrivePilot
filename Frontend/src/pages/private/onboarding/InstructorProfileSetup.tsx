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

import toast from "react-hot-toast";
import { useFileUpload } from "../../../hooks/useUploadURL";
import axios from "axios";
import _ from "lodash";
// Add this to your MUI imports
import { Description as DescriptionIcon } from "@mui/icons-material";
import DocumentUploaderInstructor from "../../../components/public/DocumentUploaderInstructor";
const schema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email"),
  phone: z.string().min(1, "Phone number is required"),
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
  carName: z.string().min(2, "Car model must be at least 2 characters").max(50),
  transmissionType: z.enum(["Automatic", "Manual"]),
  gender: z.enum(["Male", "Female", "Other"]),
});
const steps = [
  "Personal Information",
  "More Information",
  "Payment Information",
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
      carName: "",
      transmissionType: "Manual",
      gender: "Male",
    },
  });
  const requiredDocuments = [
    "Driving License",
    "ID Card",
    "Certificates",
    "Criminal Record",
    "Other Documents",
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

  const handleFileUpload = (file: File | null, documentType: string) => {
    if (file) {
      setSelectedFiles((prev) => [...prev, { file, documentType }]);
    } else {
      setSelectedFiles((prev) =>
        prev.filter((doc) => doc.documentType !== documentType)
      );
    }
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const [loading, setLoading] = useState(false);

  const handleNext = async (data) => {
    const { email, ...mutationData } = data;

    if (activeStep === 1) {
      if (!data?.experience) {
        toast.error("Experience is required.");
        return; // Stop progression
      }
      const missingDocuments = requiredDocuments.filter((docType) => {
        // Skip "Other Documents" from required check
        if (docType === "Other Documents") return false;
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
            };
          })
        );

        // Prepare the final data for the mutation
        const finalData = {
          ...mutationData,
          documents: documentUploads, // Array of documents with type and URL
          coordinates: coordinates,
        };

        // Call the mutation
        await setupInstructorProfile({
          variables: {
            input: finalData,
          },
        });

        markUserProfileComplete();
        toast.success("Profile setup successfully");
        navigate("/teacher-dashboard/overview");
      } catch (err) {
        toast.error(`Profile setup failed: ${err?.message}`);
      } finally {
        setLoading(false); // Stop loading
      }
    } else {
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
              limit: 5,
            },
            signal: controller.signal,
          }
        );

        // Only update if this is the latest request
        if (lastRequestTime.current === requestId) {
          setSuggestions(response.data);
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
                placeholder="Phone Number"
                error={!!errors.phone}
                helperText={errors.phone?.message}
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
    <Box component="form" onSubmit={handleSubmit(handleNext)}>
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
                <MenuItem value="5+">5+ years</MenuItem>
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

            {/* Special handling for Other Documents */}
            {docType === "Other Documents" ? (
              <Box sx={{ mt: 1 }}>
                <input
                  accept=".pdf,.jpg,.jpeg,.png"
                  style={{ display: "none" }}
                  id={`other-docs-upload`}
                  type="file"
                  multiple
                  onChange={(e) => {
                    const files = e.target.files
                      ? Array.from(e.target.files)
                      : [];
                    files.forEach((file) => {
                      handleFileUpload(file, "Other Documents");
                    });
                  }}
                />
                <label htmlFor={`other-docs-upload`}>
                  <Button variant="outlined" component="span" sx={{ mr: 2 }}>
                    Upload Multiple
                  </Button>
                </label>
                <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                  You can upload multiple files for Other Documents
                </Typography>

                {/* Display uploaded other documents with previews */}
                {selectedFiles
                  .filter((doc) => doc.documentType === "Other Documents")
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
                        sx={{ display: "flex", alignItems: "center", mb: 1 }}
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
                              (f, i) =>
                                !(
                                  f.documentType === "Other Documents" &&
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
      </Box>
    </Box>
  );
  const renderPaymentInfo = () => (
    <Box sx={{ mt: 4 }}>
      <Box sx={{ mt: 4 }}>
        {/* Payment information form fields will go here */}
        <Typography>Payment information coming soon...</Typography>
      </Box>
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
