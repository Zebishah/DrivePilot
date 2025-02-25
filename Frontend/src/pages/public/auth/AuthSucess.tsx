import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import { Loader2 } from 'lucide-react';
import { jwtDecode } from "jwt-decode";
import type { AuthPayload } from '../../../types/auth';
import { useAuth } from '../../../context/AuthContext';
import AuthLayout from '../../../layouts/AuthLayout';

const AuthSuccess = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { login, tempUser } = useAuth();

    useEffect(() => {
        const handleAuth = async () => {
            try {
                const token = searchParams.get('token');
                if (!token) {
                    throw new Error('No token provided');
                }

                const decodedToken = jwtDecode<{ id: string, email: string, firstName: string, lastName: string, role: string, isProfileComplete: string }>(token);
                const isProfileComplete = decodedToken.isProfileComplete;

                const authPayload: AuthPayload = {
                    token,
                    user: {
                        id: decodedToken.id,
                        email: decodedToken.email,
                        firstName: decodedToken.firstName,
                        lastName: decodedToken.lastName,
                        role: decodedToken.role,
                    },
                };

                if (isProfileComplete) {
                    const userRole = authPayload.user.role.toLowerCase();
                    login(authPayload);
                    if (userRole === "student") {
                        navigate("/student-dashboard/overview");
                    } else if (userRole === "instructor") {
                        navigate("/teacher-dashboard/overview");
                    }
                } else {
                    tempUser(authPayload)
                    const userRole = authPayload.user.role.toLowerCase();
                    if (userRole === "userbase") {
                        navigate("/onboarding/role-selection");
                    } else if (userRole === "student") {
                        navigate("/onboarding/student-profile");
                    } else if (userRole === "instructor") {
                        navigate("/onboarding/instructor-profile");
                    }
                }
            } catch (error) {
                console.error('Auth error:', error);
                navigate('/auth/signin?error=auth_failed');
            }
        };

        handleAuth();
    }, [navigate, searchParams]);

    return (
        <AuthLayout>
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
                <div className="bg-white rounded-lg p-8 flex flex-col items-center max-w-sm mx-4">
                    <Loader2 className="h-12 w-12 text-blue-500 animate-spin mb-4" />
                    <Typography className="text-xl font-semibold text-gray-800 mb-2">
                        Completing Authentication
                    </Typography>
                </div>
            </div>
        </AuthLayout>
    );
};

export default AuthSuccess;