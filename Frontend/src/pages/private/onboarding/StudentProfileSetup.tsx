import React, { useState } from "react";
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
} from "@mui/material";
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

const schema = z.object({
    homeAddress: z.string().min(1, "Home address is required"),
    location: z.string().min(1, "Location is required"),
    zipCode: z.string().min(1, "ZIP code is required"),
    documentType: z.string().min(1, "Document type is required"),
    documentUrl: z.string().optional(),
});

const steps = ["More Information", "Payment Method"];

const StudentProfileSetup = () => {
    const { user, login, markUserProfileComplete } = useAuth();
    const { uploadFile } = useFileUpload();
    const navigate = useNavigate();
    const [activeStep, setActiveStep] = useState(0);


    const { control, handleSubmit, formState: { errors } } = useForm({
        resolver: zodResolver(schema),
        defaultValues: {
            homeAddress: "",
            location: "",
            zipCode: "",
            documentType: "",
            documentUrl: "",
        }
    });

    const [setupProfile] = useMutation(SETUP_STUDENT_PROFILE, {
        onCompleted: (data) => {
            toast.success("Profile setup successfully");
            navigate("/student-dashboard/overview")
        },
        onError: (error) => {
            console.error("Profile setup error:", error);
            toast.error(`Profile setup failed :${error?.message}`);
        }
    });

    const [loading, setLoading] = useState(false);

    const handleNext = async (data) => {
        if (activeStep === steps.length - 1) {
            try {
                setLoading(true); // Start loading

                let fileUrl: string | undefined = undefined;

                if (!selectedFile) {
                    toast.error("Please upload a document");
                    return;
                }
                console.log("user", user)

                const uploadResult = await uploadFile(selectedFile, user?.id, user?.role);
                if (!uploadResult.success) {
                    throw new Error(`File upload failed: ${uploadResult.message}`);
                }
                fileUrl = uploadResult.fileUrl;

                const finalData = { ...data, documentUrl: fileUrl };

                await setupProfile({
                    variables: {
                        input: {
                            ...finalData,
                        }
                    }
                });
                markUserProfileComplete()


            } catch (error) {
                toast.error(`Profile setup failed: ${error?.message}`);
            } finally {
                setLoading(false); // Stop loading
            }
        } else {
            setActiveStep((prevStep) => prevStep + 1);
        }
    };

    const handleBack = () => {
        setActiveStep((prevStep) => prevStep - 1);
    };
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const handleFileUpload = (file: File | null) => {
        if (file) {

            setSelectedFile(file);
        }
    };

    const renderMoreInfo = () => (
        <Box component="form" sx={{}}>
            <Box sx={{ mb: 3 }}>
                <InputLabel htmlFor="homeAddress" sx={{ mb: 1 }}>Home Address</InputLabel>
                <Controller
                    name="homeAddress"
                    control={control}
                    render={({ field }) => (
                        <TextField
                            {...field}
                            fullWidth
                            id="homeAddress"
                            placeholder="Postal Address"
                            error={!!errors.homeAddress}
                            helperText={errors.homeAddress?.message}
                        />
                    )}
                />
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 3 }}>
                <Box>
                    <InputLabel htmlFor="location" sx={{ mb: 1 }}>Location</InputLabel>
                    <Controller
                        name="location"
                        control={control}
                        render={({ field }) => (
                            <TextField
                                {...field}
                                fullWidth
                                id="location"
                                placeholder="Enter Location"
                                error={!!errors.location}
                                helperText={errors.location?.message}
                            />
                        )}
                    />
                </Box>

                <Box>
                    <InputLabel htmlFor="zipCode" sx={{ mb: 1 }}>ZIP Code</InputLabel>
                    <Controller
                        name="zipCode"
                        control={control}
                        render={({ field }) => (
                            <TextField
                                {...field}
                                fullWidth
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

            <DocumentUploader onFileUpload={handleFileUpload} selectedFile={selectedFile} setSelectedFile={setSelectedFile} />

        </Box>
    );

    const renderPaymentMethod = () => (
        <Box sx={{ mt: 4 }}>
            <Typography variant="h6">
                Payment Method
            </Typography>
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
        console.log("Form errors:", errors);

        Object.values(errors).forEach((error) => {
            toast.error(error.message);
        });
    };


    return (
        <Box sx={{ width: '100%', maxWidth: 'md', mx: 'auto', p: 3 }}>
            <Box component="img"
                alt="Circles"
                src="/auth/decorative-circles.png"
                sx={{
                    position: 'absolute',
                    top: 1,
                    right: 1
                }}>
            </Box>
            <Logo />

            <Typography variant="h4" component="h1" sx={{ mb: 4, fontWeight: 'bold' }}>
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
                    maxHeight: '50vh', // Adjust this value as needed
                    overflowY: 'auto',
                    // pr: 1.5,

                }}
            >
                {renderStepContent()}
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
                <Button
                    disabled={activeStep === 0 || loading}
                    onClick={handleBack}
                >
                    Back
                </Button>
                <Button
                    variant="contained"
                    onClick={handleSubmit(handleNext, onError)}
                    sx={{ bgcolor: '#5CD2D9' }}
                    disabled={loading}
                >
                    {loading ? <CircularProgress size={24} color="inherit" /> : (activeStep === steps.length - 1 ? "Submit" : "Next")}
                </Button>
            </Box>
        </Box>
    );
};

export default StudentProfileSetup;