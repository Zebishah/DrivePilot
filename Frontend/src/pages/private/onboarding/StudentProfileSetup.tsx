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
  Alert,
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
import { useFileUpload } from "../../../hooks/useUploadURL";
import { useAuth } from "../../../context/AuthContext";
import toast from "react-hot-toast";
import _ from "lodash";
import SingleDocumentUploader from "../../../components/SingleDocumentUploader";
import {
  clearOnboardingDraft,
  loadOnboardingDraft,
  saveOnboardingDraft,
} from "../../../utils/onboardingDraft";

const schema = z.object({
  homeAddress: z.string().min(1, "Home address is required"),
  location: z.string().min(1, "City is required"),
  zipCode: z.string().min(1, "ZIP code is required"),
  documents: z
    .array(
      z.object({
        documentType: z.enum(["Driving License", "ID Card"]).optional(),
        documentUrl: z.string().optional(),
      })
    )
    .min(1, "At least one document is required"),
});

const steps = ["More Information", "Finish Setup"];
type DocumentType = "Driving License" | "ID Card";

type DocumentFile = {
  file: File;
  documentType: DocumentType;
};
const StudentProfileSetup = () => {
  const { user, markUserProfileComplete } = useAuth();
  const { uploadFile } = useFileUpload();
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);

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
      homeAddress: "",
      location: "",
      zipCode: "",
      documents: [],
    },
  });

  const [setupProfile] = useMutation(SETUP_STUDENT_PROFILE);

  const [loading, setLoading] = useState(false);
  const [documentFiles, setDocumentFiles] = useState<{
    [key in DocumentType]?: DocumentFile;
  }>({});
  const [draftHydrated, setDraftHydrated] = useState(false);
  const [restoredDocumentMetadata, setRestoredDocumentMetadata] = useState<
    Array<{ documentType: string; fileName?: string }>
  >([]);

  const handleNext = async (data) => {
    if (activeStep === steps.length - 1) {
      try {
        setLoading(true);

        if (Object.keys(documentFiles).length === 0) {
          toast.error("Please upload at least one document");
          setLoading(false);
          return;
        }

        const filesToUpload = Object.values(documentFiles);

        const uploadResults = await Promise.all(
          filesToUpload.map(({ file }) =>
            uploadFile(file, user?.id, user?.role)
          )
        );

        if (uploadResults.some((result) => !result.success)) {
          throw new Error("Some files failed to upload");
        }

        const documents = filesToUpload.map((doc, index) => ({
          status: "pending",
          documentType: doc.documentType,
          documentUrl: uploadResults[index].fileUrl,
        }));

        // Update the documents field with actual URLs
        setValue("documents", documents, { shouldValidate: true });

        // Prepare the final payload
        const finalData = {
          ...data,
          documents,
        };

        const result = await setupProfile({
          variables: {
            input: finalData,
          },
        });

        if (!result.data?.setupStudentProfile) {
          throw new Error("Profile setup did not complete");
        }

        markUserProfileComplete();
        if (user?.id) clearOnboardingDraft(user.id, "Student");
        toast.success("Profile setup successfully");
        navigate("/student-dashboard/overview");
      } catch (error) {
        toast.error(
          `Profile setup failed: ${error instanceof Error ? error.message : "Please try again."}`
        );
      } finally {
        setLoading(false);
      }
    } else {
      if (user?.id) {
        saveOnboardingDraft(user.id, "Student", {
          activeStep: activeStep + 1,
          formValues: getValues(),
          coordinates,
          documents: Object.values(documentFiles).map(({ file, documentType }) => ({
            documentType,
            fileName: file.name,
          })),
        });
      }
      setActiveStep((prevStep) => prevStep + 1);
    }
  };

  const handleBack = () => {
    if (user?.id) {
      saveOnboardingDraft(user.id, "Student", {
        activeStep: Math.max(activeStep - 1, 0),
        formValues: getValues(),
        coordinates,
        documents: Object.values(documentFiles).map(({ file, documentType }) => ({
          documentType,
          fileName: file.name,
        })),
      });
    }
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleFileUpload = (file: File | null, documentType: DocumentType) => {
    if (file) {
      setRestoredDocumentMetadata((prev) =>
        prev.filter((document) => document.documentType !== documentType)
      );
      setDocumentFiles((prev) => ({
        ...prev,
        [documentType]: {
          file,
          documentType,
        },
      }));
    } else {
      const newDocumentFiles = { ...documentFiles };
      delete newDocumentFiles[documentType];
      setDocumentFiles(newDocumentFiles);
    }

    // Update documents in form state
    const updatedDocuments = Object.entries(documentFiles).reduce<
      Array<{ documentType: string; documentUrl: string }>
    >((acc, [docType, doc]) => {
      if (docType === documentType && file) {
        return [...acc, { documentType: docType, documentUrl: "pending" }];
      }
      if (docType !== documentType && doc) {
        return [...acc, { documentType: docType, documentUrl: "pending" }];
      }
      return acc;
    }, []);

    setValue("documents", updatedDocuments, { shouldValidate: true });
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

  useEffect(() => {
    if (!user?.id) {
      setDraftHydrated(true);
      return;
    }

    const draft = loadOnboardingDraft(user.id, "Student");
    if (draft) {
      reset({
        homeAddress: typeof draft.formValues.homeAddress === "string" ? draft.formValues.homeAddress : "",
        location: typeof draft.formValues.location === "string" ? draft.formValues.location : "",
        zipCode: typeof draft.formValues.zipCode === "string" ? draft.formValues.zipCode : "",
        documents: Array.isArray(draft.formValues.documents) ? draft.formValues.documents : [],
      } as never);
      setActiveStep(Math.min(Math.max(draft.activeStep, 0), steps.length - 1));
      if (draft.coordinates) setCoordinates(draft.coordinates);
      setRestoredDocumentMetadata(draft.documents);
    }
    setDraftHydrated(true);
  }, [user?.id, reset]);

  const watchedValues = watch();
  useEffect(() => {
    if (!draftHydrated || !user?.id) return;
    const timeout = window.setTimeout(() => {
      saveOnboardingDraft(user.id, "Student", {
        activeStep,
        formValues: watchedValues,
        coordinates,
        documents: Object.values(documentFiles).map(({ file, documentType }) => ({
          documentType,
          fileName: file.name,
        })),
      });
    }, 400);
    return () => window.clearTimeout(timeout);
  }, [activeStep, coordinates, documentFiles, draftHydrated, user?.id, watchedValues]);
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

      {restoredDocumentMetadata.length > 0 && Object.keys(documentFiles).length === 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Previously selected files cannot be restored after a refresh. Please select them again before submitting.
        </Alert>
      )}

      {/* Driving License Document */}
      <FormControl fullWidth sx={{ mb: 3 }} margin="normal">
        <Select value="Driving License" disabled>
          <MenuItem value="Driving License">Driving License</MenuItem>
        </Select>
      </FormControl>

      <SingleDocumentUploader
        documentType="Driving License"
        onFileUpload={handleFileUpload}
        documentFile={documentFiles["Driving License"]}
        setValue={setValue}
      />

      {/* ID Card Document */}
      <FormControl fullWidth sx={{ mb: 3 }} margin="normal">
        <Select value="ID Card" disabled>
          <MenuItem value="ID Card">ID Card</MenuItem>
        </Select>
      </FormControl>

      <SingleDocumentUploader
        documentType="ID Card"
        onFileUpload={handleFileUpload}
        documentFile={documentFiles["ID Card"]}
        setValue={setValue}
      />
    </Box>
  );

  const renderFinishSetup = () => (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h6">You’re ready to learn</Typography>
      <Typography variant="body1" sx={{ mt: 2 }}>
        Your profile information and documents are ready to submit.
        Payments are handled securely in your student dashboard when you book
        a lesson, so you can choose the right payment option at checkout.
      </Typography>
    </Box>
  );

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return renderMoreInfo();
      case 1:
        return renderFinishSetup();
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
