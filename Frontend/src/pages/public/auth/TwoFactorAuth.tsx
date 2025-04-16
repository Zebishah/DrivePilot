import React, { useState, useRef } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  Container,
  Stack,
  CircularProgress,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import logoSrc from "../../../../../Frontend/public/Website-new-logo.png"; // Adjust the path as necessary
import { useNavigate, useParams } from "react-router-dom";
import { useMutation } from "@apollo/client";
import { RESEND_OTP, VERIFY_OTP } from "../../../graphql/mutations/auth";
import { useAuth } from "../../../context/AuthContext";
import toast from "react-hot-toast";

// Styled OTP input for consistent sizing and spacing
const OtpInput = styled(TextField)(({ theme }) => ({
  width: "3rem",
  margin: theme.spacing(0, 0.5),
  "& input": {
    textAlign: "center",
    fontSize: "1.5rem",
    padding: theme.spacing(1, 0),
  },
}));

interface TwoFactorAuthProps {
  logoSrc?: string; // Optional logo source URL
  onVerify?: (otp: string) => Promise<boolean>; // Optional verification handler
  digits?: number; // Number of OTP digits, default 6
  title?: string; // Custom title
  subtitle?: string; // Custom subtitle
}

const TwoFactorAuth: React.FC<TwoFactorAuthProps> = ({
  digits = 4,
  title = "Two Factor Authentication",
  subtitle = "Please enter the Two Factor verification code sent to your device",
}) => {
  const { email } = useParams();
  const [otp, setOtp] = useState<string[]>(Array(digits).fill(""));
  const inputRefs = useRef<(HTMLInputElement | null)[]>(
    Array(digits).fill(null)
  );
  const { login, tempUser } = useAuth();
  // State for toast messages

  const navigate = useNavigate();
  // GraphQL mutations
  const [verifyUser, { loading: verifying }] = useMutation(VERIFY_OTP);
  const [resendOtp, { loading: resending }] = useMutation(RESEND_OTP);

  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle OTP input change
  const handleChange = (index: number, value: string) => {
    if (isVerified) return;

    // Only allow numbers
    const numericValue = value.replace(/[^0-9]/g, "");

    if (numericValue.length <= 1) {
      const newOtp = [...otp];
      newOtp[index] = numericValue;
      setOtp(newOtp);

      // Auto focus next input
      if (numericValue && index < digits - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    }

    setError(null);
  };

  // Handle key events for navigation between inputs
  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (isVerified) return;

    if (e.key === "Backspace" && !otp[index] && index > 0) {
      // Focus previous input on backspace when current is empty
      const newOtp = [...otp];
      newOtp[index - 1] = "";
      setOtp(newOtp);
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowLeft" && index > 0) {
      // Navigate left
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < digits - 1) {
      // Navigate right
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle OTP verification
  const handleVerify = async () => {
    const otpString = otp.join("");

    if (otpString.length !== digits) {
      setError(`Please enter all ${digits} digits`);
      return;
    }

    setError(null);

    try {
      const { data } = await verifyUser({
        variables: {
          input: {
            email: email,
            otp: otpString,
            type: "two_factor_auth", // or "two_factor_auth"
          },
        },
      });

      if (data && data.verifyUser) {
        await tempUser(data.verifyUser);
        toast.success(
          "OTP verified successfully!Sign Up Successful .Please Select Role"
        );

        if (data.verifyUser.success) {
          if (data.verifyUser?.user?.isProfileComplete) {
            login(data.verifyUser);

            if (data.verifyUser?.user?.role === "Student")
              navigate("/student-dashboard/overview");
            else if (data.verifyUser?.user?.role === "Instructor")
              navigate("/teacher-dashboard/overview");
            else if (data.verifyUser?.user?.role === "Admin")
              navigate("/admin-dashboard/overview");
            toast.success("Login Successfully");
          } else {
            toast.error("Profile not complete. Please complete your profile.");

            const userRole = data.verifyUser?.user?.role.toLowerCase();
            tempUser(data.verifyUser);
            if (userRole === "userbase") {
              navigate("/onboarding/role-selection");
            } else if (userRole === "student") {
              navigate("/onboarding/student-profile");
            } else if (userRole === "instructor") {
              navigate("/onboarding/instructor-profile");
            }
          }
        }
      } else {
        setError("Invalid OTP. Please try again.");
        toast.error("Invalid OTP. Please try again.");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Verification failed. Please try again.";
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  // Handle resend OTP
  const handleResendOtp = async () => {
    try {
      const { data } = await resendOtp({
        variables: {
          input: {
            email: email,
            type: "two_factor_auth", // or "two_factor_auth"
          },
        },
      });

      if (data && data.resendOtp.success) {
        toast.success("Verification code resent successfully!");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to resend code. Please try again.";
      toast.error(errorMessage);
    }
  };

  // Handle paste from clipboard
  const handlePaste = (e: React.ClipboardEvent) => {
    if (isVerified) return;

    e.preventDefault();
    const pastedData = e.clipboardData.getData("text/plain").trim();
    const numericValue = pastedData.replace(/[^0-9]/g, "");

    if (numericValue.length <= digits) {
      const newOtp = [...otp];
      for (let i = 0; i < numericValue.length; i++) {
        if (i < digits) {
          newOtp[i] = numericValue[i];
        }
      }
      setOtp(newOtp);

      // Focus appropriate field
      if (numericValue.length < digits) {
        inputRefs.current[numericValue.length]?.focus();
      }
    }
  };

  // Close toast notification

  // Check if OTP is complete to enable verification
  const isOtpComplete = otp.every((digit) => digit !== "");

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          py: 4,
        }}
      >
        {/* Logo */}
        {logoSrc ? (
          <Box
            component="img"
            src={logoSrc}
            alt="Company Logo"
            sx={{
              width: 200,
              height: 120,
              mb: 3,
              objectFit: "contain",
            }}
          />
        ) : (
          <Box
            sx={{
              bgcolor: "primary.main",
              width: 280,
              height: 180,
              mb: 3,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <LockOutlinedIcon sx={{ fontSize: 64, color: "white" }} />
          </Box>
        )}

        {/* OTP Card */}
        <Card
          elevation={3}
          sx={{
            width: "100%",
            borderRadius: 2,
            overflow: "visible",
          }}
        >
          <CardContent sx={{ p: 4 }}>
            <Stack spacing={3} alignItems="center">
              <Typography
                variant="h5"
                component="h1"
                fontWeight="bold"
                textAlign="center"
              >
                {isVerified ? "Verification Successful" : title}
              </Typography>

              <Typography
                variant="body1"
                color="text.secondary"
                textAlign="center"
              >
                {isVerified ? "You have been successfully verified" : subtitle}
              </Typography>

              {isVerified ? (
                <CheckCircleOutlineIcon
                  color="success"
                  sx={{ fontSize: 60, my: 2 }}
                />
              ) : (
                <>
                  <Box
                    component="form"
                    sx={{
                      display: "flex",
                      justifyContent: "center",
                      flexWrap: "wrap",
                      my: 2,
                    }}
                    onPaste={handlePaste}
                  >
                    {otp.map((digit, index) => (
                      <OtpInput
                        key={index}
                        inputRef={(el) => (inputRefs.current[index] = el)}
                        variant="outlined"
                        value={digit}
                        onChange={(e) => handleChange(index, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(index, e)}
                        inputProps={{
                          maxLength: 1,
                          inputMode: "numeric",
                          pattern: "[0-9]*",
                        }}
                        autoComplete="off"
                        disabled={verifying || isVerified}
                        error={!!error}
                      />
                    ))}
                  </Box>

                  {error && (
                    <Typography
                      variant="body2"
                      color="error"
                      textAlign="center"
                    >
                      {error}
                    </Typography>
                  )}

                  <Button
                    variant="contained"
                    fullWidth
                    size="large"
                    onClick={handleVerify}
                    disabled={!isOtpComplete || verifying || isVerified}
                    sx={{ mt: 2 }}
                    startIcon={
                      verifying && (
                        <CircularProgress size={20} color="inherit" />
                      )
                    }
                  >
                    {verifying ? "Verifying..." : "Verify"}
                  </Button>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                    textAlign="center"
                  >
                    Didn't receive the code?{" "}
                    <Button
                      color="primary"
                      sx={{ p: 0, minWidth: "auto" }}
                      variant="text"
                      onClick={handleResendOtp}
                      disabled={resending || isVerified}
                    >
                      Resend
                    </Button>
                  </Typography>
                </>
              )}
            </Stack>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
};

export default TwoFactorAuth;
