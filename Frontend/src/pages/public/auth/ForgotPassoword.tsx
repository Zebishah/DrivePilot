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

const forgotPasswordSchema = z.object({
    email: z.string().email('Please enter a valid email address'),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

const ForgotPassword: React.FC = () => {
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const nav = useNavigate();
    const {
        control,
        handleSubmit,
        formState: { errors },
    } = useForm<ForgotPasswordFormValues>({
        resolver: zodResolver(forgotPasswordSchema),
        defaultValues: {
            email: '',
        },
    });

    const onSubmit = async (data: ForgotPasswordFormValues) => {
        try {
            setIsSubmitting(true);
            console.log('Forgot Password Request:', data);
            await new Promise(resolve => setTimeout(resolve, 1000));
            nav('/auth/reset-password');
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AuthLayout>
            <Box component="img"
                alt="Cricles"
                src="/auth/decorative-circles.png"
                sx={{
                    position: 'absolute',
                    top: 1,
                    right: 1
                }}>
            </Box>
            <Box sx={{ mb: 4, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <Logo />
                <Typography variant="h4" component="h1" sx={{ mt: 4, fontWeight: 'bold' }}>
                    Forgot Password?
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, whiteSpace: 'nowrap' }}>
                    Enter your email address and we'll send you a link to reset your password.
                </Typography>

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
        </AuthLayout>
    );
};

export default ForgotPassword;
