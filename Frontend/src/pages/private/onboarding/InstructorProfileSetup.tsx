import type React from "react";
import { useEffect, useState } from "react";
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
} from "@mui/material";
import { Upload } from "lucide-react";
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Controller, useForm } from "react-hook-form";
import Logo from "../../../components/Logo";
import { useAuth } from "../../../context/AuthContext";
import { useMutation } from "@apollo/client";
import { SETUP_INSTRUCTOR_PROFILE } from "../../../graphql/mutations/auth";
import { useNavigate } from "react-router-dom";
import DocumentUploader from "../../../components/DocumentUploader";
import toast from "react-hot-toast";
import { useFileUpload } from "../../../hooks/useUploadURL";

const schema = z.object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email("Invalid email"),
    phone: z.string().min(1, "Phone number is required"),
    address: z.string().min(1, "Address is required"),
    location: z.string().min(1, "Location is required"),
    zipCode: z.string().min(1, "ZIP code is required"),
    description: z.string().optional(),
    experience: z.string().optional(),
    documentType: z.string().optional(),
    documentUrl: z.string().optional(),
});

const steps = ["Personal Information", "More Information", "Payment Information"];

const InstructorProfileSetup: React.FC = () => {
    const [setupInstructorProfile, { error }] = useMutation(SETUP_INSTRUCTOR_PROFILE);

    const [activeStep, setActiveStep] = useState(0);
    const { user, login } = useAuth();
    const navigate = useNavigate();
    const { uploadFile } = useFileUpload();

    const { control, handleSubmit, setValue, formState: { errors } } = useForm({
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
            documentUrl: "",
        }
    });

    useEffect(() => {
        if (user) {
            setValue("firstName", user.firstName || "");
            setValue("lastName", user.lastName || "");
            setValue("email", user.email || "");
        }
    }, [user, setValue]);

    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const handleFileUpload = (file: File | null) => {
        if (file) {
            console.log('File uploaded:', file);
            setSelectedFile(file);
        }
    };

    // const handleNext = () => {
    //     setActiveStep((prevStep) => prevStep + 1);
    // };

    const handleBack = () => {
        setActiveStep((prevStep) => prevStep - 1);
    };

    const [loading, setLoading] = useState(false);

    const handleNext = async (data) => {
        const { email, ...mutationData } = data;

        if (activeStep === steps.length - 1) {
            try {
                setLoading(true); // Start loading

                let fileUrl: string | undefined = undefined;

                if (!selectedFile || !data?.documentType) {
                    console.log("acas");
                    toast.error("Please select a document type and upload a document");
                    return;
                }

                const uploadResult = await uploadFile(selectedFile, user?.id, user?.role);
                if (!uploadResult.success) {
                    throw new Error(`File upload failed: ${uploadResult.message}`);
                }

                fileUrl = uploadResult.fileUrl;
                const finalData = { ...mutationData, documentUrl: fileUrl };

                await setupInstructorProfile({
                    variables: {
                        input: {
                            ...finalData,
                        }
                    },
                });

                toast.success("Profile setup successfully");
                navigate("/teacher-dashboard/overview");

            } catch (err) {
                console.error("Error setting up instructor profile:", err);
                toast.error(`Profile setup failed: ${err?.message}`);
            } finally {
                setLoading(false); // Stop loading
            }
        } else {
            setActiveStep((prevStep) => prevStep + 1);
        }
    };

    const renderPersonalInfo = () => (
        <Box component="form">
            <Box  >
                <Box sx={{ mb: 1 }}>
                    <InputLabel htmlFor="firstName" sx={{ mb: 1 }}>First Name</InputLabel>
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
                    <InputLabel htmlFor="lastName" sx={{ mb: 1 }}>Last Name</InputLabel>
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
                    <InputLabel htmlFor="email" sx={{ mb: 1 }}>E-mail address</InputLabel>
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
                    <InputLabel htmlFor="phone" sx={{ mb: 1 }}>Phone Number</InputLabel>
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

                <Box sx={{ mb: 1 }}>
                    <InputLabel htmlFor="address" sx={{ mb: 1 }}>Home Address</InputLabel>
                    <Controller
                        name="address"
                        control={control}
                        render={({ field }) => (
                            <TextField
                                {...field}
                                fullWidth
                                id="address"
                                placeholder="Home Address"
                                error={!!errors.address}
                                helperText={errors.address?.message}
                            />
                        )}
                    />
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 3 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                        <InputLabel htmlFor="location" sx={{ mb: 1 }}>Location</InputLabel>
                        <Controller
                            name="location"
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    id="location"
                                    placeholder="Location"
                                    error={!!errors.location}
                                    helperText={errors.location?.message}
                                />
                            )}
                        />
                    </Box>

                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                        <InputLabel htmlFor="zipCode" sx={{ mb: 1 }}>ZIP Code</InputLabel>
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
                    <InputLabel htmlFor="description" sx={{ mb: 1 }}>Personal Description</InputLabel>
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
        <Box component="form" onSubmit={handleSubmit(handleNext)} >
            <Box sx={{ mt: 2 }}>
                <FormControl fullWidth margin="normal" error={!!errors.experience}>
                    <InputLabel>Experience</InputLabel>
                    <Controller
                        name="experience"
                        control={control}
                        render={({ field }) => (
                            <Select
                                {...field}
                                label="Experience"
                            >
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

                <FormControl fullWidth margin="normal" error={!!errors.documentType}>
                    <InputLabel>Document Type</InputLabel>
                    <Controller
                        name="documentType"
                        control={control}
                        render={({ field }) => (
                            <Select
                                {...field}
                                label="Document Type"
                            >
                                <MenuItem value="Driving License">Driving License</MenuItem>
                                <MenuItem value="ID Card">ID Card</MenuItem>
                                <MenuItem value="Certificates">Certificates</MenuItem>
                                <MenuItem value="Criminal Record">Criminal Record</MenuItem>
                                <MenuItem value="Other Document">Other Document</MenuItem>
                            </Select>
                        )}
                    />
                    {errors.documentType && (
                        <Typography variant="body2" color="error">
                            {errors.documentType.message}
                        </Typography>
                    )}
                </FormControl>
                <DocumentUploader onFileUpload={handleFileUpload} selectedFile={selectedFile} setSelectedFile={setSelectedFile} />
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
        <Box sx={{ width: '100%', maxWidth: 'md', mx: "auto", overflowY: "scroll" }}>
            <Box component="img"
                alt="Cricles"
                src="/auth/decorative-circles.png"
                sx={{
                    position: 'absolute',
                    top: 1,
                    right: 1
                }}>
            </Box>
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',

                }}
            >
                <Logo />
                <Typography variant="h4" component="h1" sx={{ mt: 1, fontWeight: 'bold' }}>
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
                    maxHeight: '50vh', // Adjust this value as needed
                    overflowY: 'auto',
                    // pr: 1.5,

                }}
            >
                {renderStepContent()}
            </Box>


            <Box sx={{ display: "flex", justifyContent: "space-between", mt: 4 }}>
                <Button
                    disabled={activeStep === 0}
                    onClick={handleBack}
                >
                    Back
                </Button>
                <Button
                    variant="contained"
                    onClick={handleSubmit(handleNext, onError)}
                    disabled={loading}
                >
                    {loading ? <CircularProgress size={24} color="inherit" /> : (activeStep === steps.length - 1 ? "Submit" : "Next")}

                </Button>
            </Box>
        </Box>
    );
};

export default InstructorProfileSetup;