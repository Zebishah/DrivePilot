import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
    Box,
    Button,
    TextField,
    Typography,
    CircularProgress,
    InputLabel,
} from '@mui/material';
import AuthLayout from '../../../layouts/AuthLayout';
import Logo from '../../../components/Logo';
import { useNavigate } from 'react-router-dom';

const resetPasswordSchema = z.object({
    password: z.string().min(6, 'Password must be at least 6 characters long'),
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords must match",
    path: ["confirmPassword"],
});

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

const ResetPassword: React.FC = () => {
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const nav = useNavigate();

    const {
        control,
        handleSubmit,
        formState: { errors },
    } = useForm<ResetPasswordFormValues>({
        resolver: zodResolver(resetPasswordSchema),
        defaultValues: {
            password: '',
            confirmPassword: '',
        },
    });

    const onSubmit = async (data: ResetPasswordFormValues) => {
        try {
            setIsSubmitting(true);
            console.log('Reset Password Request:', data);
            await new Promise(resolve => setTimeout(resolve, 1000)); // Simulated API call

        } catch (error) {
            console.error('Error:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AuthLayout>
            <Box sx={{ mb: 4, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <Box sx={{ mb: 4, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                    <Logo />
                    <Typography variant="h4" component="h1" sx={{ mt: 4, fontWeight: 'bold' }}>
                        Reset Password
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1, whiteSpace: 'nowrap' }}>
                        Enter your new password below to reset your account access.
                    </Typography>

                </Box>

                <Box component="form" noValidate onSubmit={handleSubmit(onSubmit)} sx={{ width: '100%' }}>
                    <InputLabel htmlFor="password">New Password</InputLabel>
                    <Controller
                        name="password"
                        control={control}
                        render={({ field }) => (
                            <TextField
                                {...field}
                                margin="normal"
                                required
                                fullWidth
                                type="password"
                                id="password"
                                placeholder="New Password"
                                autoComplete="new-password"
                                error={!!errors.password}
                                helperText={errors.password?.message}
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
                                type="password"
                                id="confirmPassword"
                                placeholder="Confirm Password"
                                autoComplete="new-password"
                                error={!!errors.confirmPassword}
                                helperText={errors.confirmPassword?.message}
                                sx={{ mb: 2 }}
                            />
                        )}
                    />

                    <Button

                        type="submit"
                        fullWidth
                        variant="contained"
                        disabled={isSubmitting}
                        sx={{ mt: 3, mb: 2, py: 1.5, bgcolor: '#4CC9F0', '&:hover': { bgcolor: '#3AB7E0' } }}
                    >
                        {isSubmitting ? <CircularProgress size={24} color="inherit" /> : 'Change Password'}
                    </Button>
                </Box>
            </Box>
        </AuthLayout>
    );
};

export default ResetPassword;
