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
import logoSrc from "../../../../../Frontend/public/dsp-logo.png"; // Adjust the path as necessary
import { useNavigate, useParams } from "react-router-dom";
import { useMutation } from "@apollo/client";
import { RESEND_OTP, VERIFY_OTP } from "../../../graphql/mutations/auth";
import { useAuth } from "../../../context/AuthContext";

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

interface OtpVerificationProps {
  logoSrc?: string; // Optional logo source URL
  onVerify?: (otp: string) => Promise<boolean>; // Optional verification handler
  digits?: number; // Number of OTP digits, default 6
  title?: string; // Custom title
  subtitle?: string; // Custom subtitle
}

const OtpVerification: React.FC<OtpVerificationProps> = ({
  digits = 4,
  title = "Verify OTP",
  subtitle = "Please enter the verification code sent to your device",
}) => {
  const { email } = useParams();
  const [otp, setOtp] = useState<string[]>(Array(digits).fill(""));
  const inputRefs = useRef<(HTMLInputElement | null)[]>(
    Array(digits).fill(null)
  );
  const { login, tempUser, user } = useAuth();
  // State for toast messages
  const [toast, setToast] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "info" | "warning";
  }>({
    open: false,
    message: "",
    severity: "info",
  });
  const navigate = useNavigate();
  // GraphQL mutations
  const [verifyUser, { loading: verifying }] = useMutation(VERIFY_OTP);
  const [resendOtp, { loading: resending }] = useMutation(RESEND_OTP);

  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  console.log("user details", tempUser, user);
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
            type: "email_verification",
          },
        },
      });

      if (data?.verifyUser?.success) {
        // Update the user state first
        await tempUser(data.verifyUser);

        setToast({
          open: true,
          message:
            "OTP verified successfully! Sign Up Successful. Please select your role.",
          severity: "success",
        });

        // Don't set isVerified if you want to navigate immediately
        // Instead, navigate right away
        console.log("user details", data.verifyUser.user);
        if (data?.verifyUser.user.isProfileComplete) {
          navigate("/auth/signin");
        } else {
          navigate(`/onboarding/role-selection`);
        }
      } else {
        setError("Invalid OTP. Please try again.");
        setToast({
          open: true,
          message: "Invalid OTP. Please try again.",
          severity: "error",
        });
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Verification failed. Please try again.";
      setError(errorMessage);
      setToast({
        open: true,
        message: errorMessage,
        severity: "error",
      });
    }
  };

  // Handle resend OTP
  const handleResendOtp = async () => {
    try {
      console.log("email", email);
      const { data } = await resendOtp({
        variables: {
          input: {
            email,
            type: "email_verification", // or "two_factor_auth"
          },
        },
      });

      if (data && data.resendOtp.success) {
        setToast({
          open: true,
          message: "Verification code resent successfully!",
          severity: "success",
        });
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to resend code. Please try again.";
      setToast({
        open: true,
        message: errorMessage,
        severity: "error",
      });
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
  const handleCloseToast = () => {
    setToast({ ...toast, open: false });
  };

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

export default OtpVerification;
