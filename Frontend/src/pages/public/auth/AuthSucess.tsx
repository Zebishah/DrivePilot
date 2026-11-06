import React, { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Typography } from "@mui/material";
import { Loader2 } from "lucide-react";
import { jwtDecode } from "jwt-decode";
import type { AuthPayload } from "../../../types/auth";
import { useAuth } from "../../../context/AuthContext";
import AuthLayout from "../../../layouts/AuthLayout";

const AuthSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();

  useEffect(() => {
    const handleAuth = async () => {
      try {
        const token = searchParams.get("token");
        if (!token) {
          throw new Error("No token provided");
        }

        const decodedToken = jwtDecode<{
          id: string;
          email: string;
          firstName: string;
          lastName: string;
          role: string;
          isProfileComplete: boolean;
          isUserVerified: boolean;
        }>(token);
        const isProfileComplete = decodedToken.isProfileComplete;

        const authPayload: AuthPayload = {
          token,
          user: {
            id: decodedToken.id,
            email: decodedToken.email,
            firstName: decodedToken.firstName,
            lastName: decodedToken.lastName,
            role: decodedToken.role,
            isUserVerified: decodedToken.isUserVerified,
            isProfileComplete,
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
          login(authPayload);
          const userRole = authPayload.user.role.toLowerCase();
          if (userRole === "userbase") {
            navigate("/onboarding/role-selection");
          } else if (userRole === "student") {
            navigate("/onboarding/student-profile");
          } else if (userRole === "instructor") {
            navigate("/onboarding/instructor-profile");
          }
        }
      } catch {
        navigate("/auth/signin?error=auth_failed");
      }
    };

    handleAuth();
  }, [login, navigate, searchParams]);

  return (
    <AuthLayout>
      <div className="dsp-auth-status">
          <Loader2 className="h-12 w-12 text-blue-500 animate-spin mb-4" />
          <Typography component="h1">
            Completing Authentication
          </Typography>
          <Typography component="p">We’re securely taking you to your workspace.</Typography>
      </div>
    </AuthLayout>
  );
};

export default AuthSuccess;
