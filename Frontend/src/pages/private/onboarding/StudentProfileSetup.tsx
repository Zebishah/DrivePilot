import React, { useEffect, useRef, useState } from "react";
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
  CircularProgress,
  Paper,
  List,
  ListItem,
} from "@mui/material";
import axios from "axios";
import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Logo from "../../../components/Logo";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@apollo/client";
import { SETUP_STUDENT_PROFILE } from "../../../graphql/mutations/auth";
import DocumentUploader from "../../../components/DocumentUploader";
import { useFileUpload } from "../../../hooks/useUploadURL";
import { useAuth } from "../../../context/AuthContext";
import toast from "react-hot-toast";
import _ from "lodash";

const schema = z.object({
  homeAddress: z.string().min(1, "Home address is required"),
  location: z.string().min(1, "City is required"),
  zipCode: z.string().min(1, "ZIP code is required"),
  documentType: z.string().min(1, "Document type is required"),
  // documentUrl is now optional since we have documents array
  documentUrl: z.string().optional(),
  // Add validation for documents array
  documents: z
    .array(
      z.object({
        documentType: z.string(),
        documentUrl: z.string(),
      })
    )
    .optional(),
});

const steps = ["More Information", "Payment Method"];

const StudentProfileSetup = () => {
  const { user, markUserProfileComplete } = useAuth();
  const { uploadFile } = useFileUpload();
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      homeAddress: "",
      location: "",
      zipCode: "",
      documentType: "",
      documentUrl: "",
    },
  });

  const [setupProfile] = useMutation(SETUP_STUDENT_PROFILE, {
    onCompleted: (data) => {
      toast.success("Profile setup successfully");
      navigate("/student-dashboard/overview");
    },
    onError: (error) => {
      toast.error(`Profile setup failed :${error?.message}`);
    },
  });

  const [loading, setLoading] = useState(false);

  const handleNext = async (data) => {
    if (activeStep === steps.length - 1) {
      try {
        setLoading(true);

        if (!selectedFiles || selectedFiles.length === 0) {
          toast.error("Please upload at least one document");
          return;
        }

        // Upload all files
        const uploadResults = await Promise.all(
          selectedFiles.map((file) => uploadFile(file, user?.id, user?.role))
        );

        // Check if all uploads succeeded
        if (uploadResults.some((result) => !result.success)) {
          throw new Error("Some files failed to upload");
        }

        // Create documents array for the input
        const documents = selectedFiles.map((file, index) => ({
          documentType: data.documentType, // Or use individual types if you implement that
          documentUrl: uploadResults[index].fileUrl,
        }));

        const finalData = {
          ...data,
          documents,
          // Keep these for backward compatibility
          documentUrl: uploadResults[0].fileUrl,
        };

        await setupProfile({
          variables: {
            input: finalData,
          },
        });
        markUserProfileComplete();
      } catch (error) {
        toast.error(`Profile setup failed: ${error?.message}`);
      } finally {
        setLoading(false);
      }
    } else {
      setActiveStep((prevStep) => prevStep + 1);
    }
  };
  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };
  const [selectedFiles, setSelectedFiles] = useState<File[] | null>(null);

  const handleFileUpload = (files: File[] | null) => {
    if (files) {
      setSelectedFiles(files);
    } else {
      setSelectedFiles(null);
    }
  };
  interface Place {
    place_id: string;
    display_name: string;
    address?: {
      city?: string;
      town?: string;
      village?: string;
      county?: string;
      postcode?: string;
    };
    lat?: string;
    lon?: string;
  }

  const [suggestions, setSuggestions] = useState<Place[]>([]);
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

  const handleSelectSuggestion = (address: Place) => {
    isSelecting.current = true;
    setValue("homeAddress", address?.display_name, { shouldValidate: true });
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

  const renderMoreInfo = () => (
    <Box component="form" sx={{}}>
      <Box sx={{ mb: 3, position: "relative" }}>
        <InputLabel htmlFor="address" sx={{ mb: 1 }}>
          Home Address
        </InputLabel>
        <Controller
          name="homeAddress"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              placeholder="Enter Address"
              error={!!errors.homeAddress}
              helperText={errors.homeAddress?.message}
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
                  component="button"
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

      {/* <Box sx={{ mb: 3, position: "relative" }}>
        <InputLabel htmlFor="homeAddress" sx={{ mb: 1 }}>
          Home Address
        </InputLabel>
        <Controller
          name="homeAddress"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              placeholder="Enter Home Address"
              error={!!errors.homeAddress}
              helperText={errors.homeAddress?.message}
              onChange={(e) => {
                field.onChange(e);
                fetchLocations(e.target.value);
              }}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
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
                  onClick={() => handleSelectSuggestion(place.display_name)}
                >
                  {place.display_name}
                </ListItem>
              ))}
            </List>
          </Paper>
        )}
      </Box> */}

      <Box
        sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2, mb: 3 }}
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

      <Typography variant="h6" sx={{ mb: 2 }}>
        Upload Documents
      </Typography>

      <FormControl fullWidth sx={{ mb: 3 }}>
        <InputLabel>Document Type</InputLabel>
        <Controller
          name="documentType"
          control={control}
          render={({ field }) => (
            <Select
              {...field}
              label="Document Type"
              error={!!errors.documentType}
            >
              <MenuItem value="Driving License">Driving License</MenuItem>
              <MenuItem value="ID Card">ID Card</MenuItem>
            </Select>
          )}
        />
      </FormControl>

      <DocumentUploader
        documentType={"Document"}
        onFileUpload={handleFileUpload}
        selectedFiles={selectedFiles}
        setSelectedFiles={setSelectedFiles}
        setValue={setValue}
        maxFiles={3} // Optional: set maximum files
      />
    </Box>
  );

  const renderPaymentMethod = () => (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h6">Payment Method</Typography>
      {/* Payment method form fields will be added here */}
      <Typography variant="body1" sx={{ mt: 2 }}>
        Payment integration coming soon...
      </Typography>
    </Box>
  );

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return renderMoreInfo();
      case 1:
        return renderPaymentMethod();
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
    <Box sx={{ width: "100%", maxWidth: "md", mx: "auto", p: 3 }}>
      <Box
        component="img"
        alt="Circles"
        src="/auth/decorative-circles.png"
        sx={{
          position: "absolute",
          top: 1,
          right: 1,
          pointerEvents: "none", // Prevents clicks
          userSelect: "none",
        }}
      ></Box>
      <Logo />

      <Typography
        variant="h4"
        component="h1"
        sx={{ mb: 4, fontWeight: "bold" }}
      >
        Welcome!
      </Typography>

      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {/* Scrollable content container with custom scrollbar */}
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
        <Button disabled={activeStep === 0 || loading} onClick={handleBack}>
          Back
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit(handleNext, onError)}
          sx={{ bgcolor: "#5CD2D9" }}
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

export default StudentProfileSetup;
