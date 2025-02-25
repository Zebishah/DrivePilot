// src/pages/Public/SignUp.tsx
import type React from 'react';
import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
    Box,
    Button,
    TextField,
    Typography,
    IconButton,
    InputAdornment,
    Link as MuiLink,
    CircularProgress,
    FormControlLabel,
    Checkbox,
    InputLabel,
} from '@mui/material';
import { Eye, EyeOff, Facebook } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../../../layouts/AuthLayout';
import Logo from '../../../components/Logo';
import { useMutation } from '@apollo/client';
import { SIGN_UP_MUTATION } from '../../../graphql/mutations/auth';
import { useAuth } from '../../../context/AuthContext';
import toast from 'react-hot-toast';


// Define schema for form validation
const signUpSchema = z.object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    email: z.string().email('Please enter a valid email address'),
    password: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number'),
    // .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
    confirmPassword: z.string(),
    agreeToTerms: z.boolean().refine(value => value === true, {
        message: 'You must agree to the Terms of Use and Privacy Policy',
    }),
}).refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
});

const backendAuth = import.meta.env.VITE_APP_AUTH_URL;
console.log("backendAuth", backendAuth);


type SignUpFormValues = z.infer<typeof signUpSchema>;

const SignUp: React.FC = () => {
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const nav = useNavigate()
    const { login, tempUser } = useAuth();
    const [signUp, { loading }] = useMutation(SIGN_UP_MUTATION);

    const {
        control,
        handleSubmit,
        formState: { errors },
    } = useForm<SignUpFormValues>({
        resolver: zodResolver(signUpSchema),
        defaultValues: {
            firstName: '',
            lastName: '',
            email: '',
            password: '',
            confirmPassword: '',
            agreeToTerms: false,
        },
    });

    const onSubmit = async (data: SignUpFormValues) => {
        try {
            setIsSubmitting(true);
            const { data: authData } = await signUp({
                variables: {
                    input: {
                        firstName: data.firstName,
                        lastName: data.lastName,
                        email: data.email,
                        password: data.password,
                        agreeToTerms: data.agreeToTerms,
                    },
                },
            });

            tempUser(authData.signUp);
            toast.success("Sign Up Successfull .Please Select Role")
            nav('/onboarding/role-selection');
        } catch (error) {
            console.error('Registration error:', error);
            // Handle error (show toast, error message, etc.)
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AuthLayout>
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: 'background.paper',
                    height: "auto",
                    overflowY: 'auto',
                }}
            >
                <Box
                    sx={{

                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        alignSelf: 'flex-start',
                        width: '100%',

                    }}
                >
                    <Logo />
                    <Typography variant="h4" component="h1" sx={{ mb: 4, mt: 1, fontWeight: 'bold' }}>
                        Welcome!
                    </Typography>
                </Box>
                <Box
                    component="img"
                    alt="Circles"
                    src="/auth/decorative-circles.png"
                    sx={{
                        position: 'absolute',
                        top: 1,
                        right: 1
                    }}
                />

                <Box component="form" noValidate onSubmit={handleSubmit(onSubmit)} sx={{ width: '100%', overflowY: "scroll" }}>
                    <InputLabel htmlFor="firstName">First Name</InputLabel>
                    <Controller
                        name="firstName"
                        control={control}
                        render={({ field }) => (
                            <TextField
                                {...field}
                                margin="normal"
                                required
                                fullWidth
                                id="firstName"
                                placeholder="First Name"
                                autoFocus
                                error={!!errors.firstName}
                                helperText={errors.firstName?.message}
                                sx={{ mb: 2 }}
                            />
                        )}
                    />

                    <InputLabel htmlFor="lastName">Last Name</InputLabel>
                    <Controller
                        name="lastName"
                        control={control}
                        render={({ field }) => (
                            <TextField
                                {...field}
                                margin="normal"
                                required
                                fullWidth
                                id="lastName"
                                placeholder="Last Name"
                                error={!!errors.lastName}
                                helperText={errors.lastName?.message}
                                sx={{ mb: 2 }}
                            />
                        )}
                    />

                    <InputLabel htmlFor="email">E-mail address</InputLabel>
                    <Controller
                        name="email"
                        control={control}
                        render={({ field }) => (
                            <TextField
                                {...field}
                                margin="normal"
                                required
                                fullWidth
                                id="email"
                                placeholder="Email Address"
                                autoComplete="email"
                                error={!!errors.email}
                                helperText={errors.email?.message}
                                sx={{ mb: 2 }}
                            />
                        )}
                    />

                    <InputLabel htmlFor="password">Password</InputLabel>
                    <Controller
                        name="password"
                        control={control}
                        render={({ field }) => (
                            <TextField
                                {...field}
                                margin="normal"
                                required
                                fullWidth
                                placeholder="Password"
                                type={showPassword ? 'text' : 'password'}
                                id="password"
                                error={!!errors.password}
                                helperText={errors.password?.message}
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton
                                                onClick={() => setShowPassword(!showPassword)}
                                                edge="end"
                                                aria-label="toggle password visibility"
                                            >
                                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                }}
                                sx={{ mb: 2 }}
                            />
                        )}
                    />

                    <InputLabel htmlFor="confirmPassword">Confirm Password</InputLabel>
                    <Controller
                        name="confirmPassword"
                        control={control}
                        render={({ field }) => (
                            <TextField
                                {...field}
                                margin="normal"
                                required
                                fullWidth
                                placeholder="Confirm Password"
                                type={showConfirmPassword ? 'text' : 'password'}
                                id="confirmPassword"
                                error={!!errors.confirmPassword}
                                helperText={errors.confirmPassword?.message}
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                edge="end"
                                                aria-label="toggle confirm password visibility"
                                            >
                                                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                }}

                            />
                        )}
                    />

                    <Box sx={{ mt: 1 }}>
                        <Controller
                            name="agreeToTerms"
                            control={control}
                            render={({ field }) => (
                                <FormControlLabel
                                    control={<Checkbox {...field} color="primary" />}
                                    label={
                                        <Typography variant="body2">
                                            I have read and agreed with{' '}
                                            <MuiLink component={Link} to="/terms" variant="body2">
                                                Terms of Use
                                            </MuiLink>{' '}
                                            and{' '}
                                            <MuiLink component={Link} to="/privacy" variant="body2">
                                                Privacy Policy
                                            </MuiLink>
                                        </Typography>
                                    }
                                />
                            )}
                        />
                        {errors.agreeToTerms && (
                            <Typography variant="caption" color="error">
                                {errors.agreeToTerms.message}
                            </Typography>
                        )}
                    </Box>

                    <Button
                        type="submit"
                        fullWidth
                        variant="contained"
                        disabled={isSubmitting}
                        sx={{
                            mt: 1,
                            mb: 1,
                            py: 1.5,
                            bgcolor: '#4CC9F0',
                            '&:hover': {
                                bgcolor: '#3AB7E0',
                            },
                        }}
                    >
                        {isSubmitting ? <CircularProgress size={24} color="inherit" /> : 'Next'}
                    </Button>

                    <Box sx={{ mt: 1, mb: 2, textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                            Or Sign in using
                        </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mb: 2 }}>
                        <IconButton
                            sx={{
                                border: '1px solid',
                                borderColor: 'divider',
                                borderRadius: '50%',
                                p: 1.5,
                            }}
                        >
                            <Facebook color="#1877F2" size={24} />
                        </IconButton>
                        <IconButton
                            sx={{
                                border: '1px solid',
                                borderColor: 'divider',
                                borderRadius: '50%',
                                p: 1.5,
                            }}
                            href={`${backendAuth}auth/google`}
                        // onClick={() => window.location.href = `${backendAuth}auth/google`}
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24">
                                <path
                                    fill="#DB4437"
                                    d="M21.35,11.1H12.18V13.83H18.69C18.36,17.64 15.19,19.27 12.19,19.27C8.36,19.27 5,16.25 5,12C5,7.9 8.2,4.73 12.2,4.73C15.29,4.73 17.1,6.7 17.1,6.7L19,4.72C19,4.72 16.56,2 12.1,2C6.42,2 2.03,6.8 2.03,12C2.03,17.05 6.16,22 12.25,22C17.6,22 21.5,18.33 21.5,12.91C21.5,11.76 21.35,11.1 21.35,11.1V11.1Z"
                                />
                            </svg>
                        </IconButton>

                    </Box>
                </Box>
            </Box>
        </AuthLayout>
    );
};

export default SignUp;