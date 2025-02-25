// src/pages/Public/SignIn.tsx
import React from 'react';
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
    InputLabel,
} from '@mui/material';
import { Eye, EyeOff, Facebook } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../../../layouts/AuthLayout';
import Logo from '../../../components/Logo';
import { useAuth } from '../../../context/AuthContext';
import { SIGN_IN } from '../../../graphql/mutations/auth';
import { useMutation } from '@apollo/client';
import toast from 'react-hot-toast';

// Define schema for form validation
const signInSchema = z.object({
    email: z.string().email('Please enter a valid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    rememberMe: z.boolean().optional(),
});

type SignInFormValues = z.infer<typeof signInSchema>;
const backendAuth = import.meta.env.VITE_APP_AUTH_URL;
const SignIn: React.FC = () => {
    const navigate = useNavigate();
    const { login, tempUser } = useAuth();
    const [showPassword, setShowPassword] = React.useState(false);

    const {
        control,
        handleSubmit,
        formState: { errors },
    } = useForm<SignInFormValues>({
        resolver: zodResolver(signInSchema),
        defaultValues: {
            email: '',
            password: '',
            rememberMe: false,
        },
    });

    const [signIn, { loading }] = useMutation(SIGN_IN, {
        onCompleted: (data) => {

            const { signIn } = data;
            if (signIn?.user?.isProfileComplete) {
                login(signIn);
                if (signIn?.user?.role === "Student") navigate("/student-dashboard/overview");
                else if (signIn?.user?.role === "Instructor") navigate("/teacher-dashboard/overview");
                toast.success("Login Successfully");
            } else {
                toast.success("Please Complete your Profile");
                const userRole = signIn?.user?.role.toLowerCase();
                tempUser(signIn);
                if (userRole === "userbase") {
                    navigate("/onboarding/role-selection");
                } else if (userRole === "student") {
                    navigate("/onboarding/student-profile");
                } else if (userRole === "instructor") {
                    navigate("/onboarding/instructor-profile");
                }
            }
        },
        onError: (error) => {

            toast.error(`${error.graphQLErrors[0]?.message}`)
        },
    });
    const onSubmit = async (formData: SignInFormValues) => {

        try {
            await signIn({
                variables: {
                    email: formData.email,
                    password: formData.password,
                },
            });
        } catch (error) {
            toast.error(`Login error: ${error?.message}`)
            console.error('Login error:', error);
        }
    };

    return (
        <AuthLayout>
            <Box
                sx={{
                    mb: 4,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',

                }}
            >
                <Logo />
                <Typography variant="h4" component="h1" sx={{ mt: 4, fontWeight: 'bold' }}>
                    Welcome!
                </Typography>
            </Box>


            <Box component="img"
                alt="Cricles"
                src="/auth/decorative-circles.png"
                sx={{
                    position: 'absolute',
                    top: 1,
                    right: 1
                }}>
            </Box>


            <Box component="form" noValidate onSubmit={handleSubmit(onSubmit)} sx={{ width: '100%' }}>
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
                            placeholder="E-mail address"
                            autoComplete="email"
                            autoFocus
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
                            autoComplete="current-password"
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
                        />
                    )}
                />

                <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mt: 1 }}>
                    {/* <Controller
                        name="rememberMe"
                        control={control}
                        render={({ field }) => (
                            <FormControlLabel
                                control={<Checkbox {...field} color="primary" />}
                                label="Remember me"
                            />
                        )}
                    /> */}
                    <MuiLink component={Link} to="/auth/forgot-password" variant="body2">
                        Forgot Password?
                    </MuiLink>
                </Box>

                <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    disabled={loading}
                    sx={{
                        mt: 3,
                        mb: 2,
                        py: 1.5,
                        bgcolor: '#4CC9F0',
                        '&:hover': {
                            bgcolor: '#3AB7E0',
                        },
                    }}
                >
                    {loading ? <CircularProgress size={24} color="inherit" /> : 'Login'}
                </Button>

                <Box sx={{ mt: 2, mb: 3, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                        Or Sign in using
                    </Typography>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mb: 3 }}>
                    <IconButton
                        sx={{
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: '50%',
                            p: 1.5,
                        }}
                        href={`${backendAuth}auth/facebook`}
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
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24">
                            <path
                                fill="#DB4437"
                                d="M21.35,11.1H12.18V13.83H18.69C18.36,17.64 15.19,19.27 12.19,19.27C8.36,19.27 5,16.25 5,12C5,7.9 8.2,4.73 12.2,4.73C15.29,4.73 17.1,6.7 17.1,6.7L19,4.72C19,4.72 16.56,2 12.1,2C6.42,2 2.03,6.8 2.03,12C2.03,17.05 6.16,22 12.25,22C17.6,22 21.5,18.33 21.5,12.91C21.5,11.76 21.35,11.1 21.35,11.1V11.1Z"
                            />
                        </svg>
                    </IconButton>
                </Box>

                <Box sx={{ textAlign: 'center', mt: 2 }}>
                    <Typography variant="body2">
                        Don't have an account?{' '}
                        <MuiLink component={Link} to="/auth/signup" variant="body2" sx={{ fontWeight: 'bold' }}>
                            Register Here
                        </MuiLink>
                    </Typography>
                </Box>
            </Box>
        </AuthLayout>
    );
};

export default SignIn;