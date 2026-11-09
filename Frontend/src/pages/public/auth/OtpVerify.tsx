import { formatAuthError } from "../../../utils/errorReference";
import BrandActionSpinner from "../../../components/loaders/BrandActionSpinner";
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
  Alert,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import BrandLogo from "../../../components/BrandLogo";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useMutation } from "@apollo/client";
import { RESEND_OTP, VERIFY_OTP } from "../../../graphql/mutations/auth";
import { useAuth } from "../../../context/AuthContext";
import toast from "react-hot-toast";
import { OTP_LENGTH } from "../../../constants/auth";
import AuthLayout from "../../../layouts/AuthLayout";
import EmailDeliveryNotice from "../../../components/EmailDeliveryNotice";
import { useEmailResendCooldown } from "../../../hooks/useEmailResendCooldown";

// Styled OTP input for consistent sizing and spacing
const OtpInput = styled(TextField)(({ theme }) => ({
  width: "100%",
  minWidth: 0,
  margin: 0,
  "& input": {
    textAlign: "center",
    fontSize: "1.5rem",
    padding: theme.spacing(1, 0),
  },
}));

interface OtpVerificationProps {
  logoSrc?: string; // Optional logo source URL
  onVerify?: (otp: string) => Promise<boolean>; // Optional verification handler
  title?: string; // Custom title
  subtitle?: string; // Custom subtitle
}

const OtpVerification: React.FC<OtpVerificationProps> = ({
  title = "Check your email",
  subtitle = "Enter the six-digit code we sent to your email address.",
}) => {
  const { email: legacyEmail } = useParams();
  const location = useLocation();
  const routeEmail = (location.state as { email?: unknown } | null)?.email;
  const email = (typeof routeEmail === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(routeEmail)
    ? routeEmail : legacyEmail) ?? "";
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const inputRefs = useRef<(HTMLInputElement | null)[]>(
    Array(OTP_LENGTH).fill(null),
  );
  const { login } = useAuth();
  const navigate = useNavigate();
  // GraphQL mutations
  const [verifyUser, { loading: verifying }] = useMutation(VERIFY_OTP);
  const [resendOtp, { loading: resending }] = useMutation(RESEND_OTP);

  const [isVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendStatus, setResendStatus] = useState<{
    severity: "success" | "error";
    message: string;
  } | null>(null);
  const { secondsRemaining, restartCooldown } = useEmailResendCooldown(60);

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
      if (numericValue && index < OTP_LENGTH - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    }

    setError(null);
  };

  // Handle key events for navigation between inputs
  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLElement>,
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
    } else if (e.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      // Navigate right
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle OTP verification
  const handleVerify = async () => {
    const otpString = otp.join("");

    if (!email) {
      setError("Your email address is missing. Return to sign in and try again.");
      return;
    }
    if (otpString.length !== OTP_LENGTH || !/^\d{6}$/.test(otpString)) {
      setError(`Please enter all ${OTP_LENGTH} digits`);
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
        login(data.verifyUser);

        toast.success("Your email is verified. You’re ready to continue.");

        // Don't set isVerified if you want to navigate immediately
        // Instead, navigate right away

        if (data?.verifyUser.user.isProfileComplete) {
          navigate("/auth/signin");
        } else {
          navigate(`/onboarding/role-selection`);
        }
      } else {
        setError("That code is invalid or expired. Check the code and try again.");
      }
    } catch (err) {
      setError(formatAuthError(err, "We couldn’t verify the code. Please try again."));
    }
  };

  // Keep delivery feedback visible next to the code entry form.
  const handleResendOtp = async () => {
    if (!email || resending || verifying || secondsRemaining > 0) return;
    setResendStatus(null);
    try {
      const { data } = await resendOtp({
        variables: { input: { email, type: "email_verification" } },
      });

      if (data?.resendOtp?.success) {
        setResendStatus({
          severity: "success",
          message:
            "A new code has been sent. Check your inbox and use the newest code.",
        });
        setOtp(Array(OTP_LENGTH).fill(""));
        setError(null);
        restartCooldown();
        inputRefs.current[0]?.focus();
      } else {
        setResendStatus({
          severity: "error",
          message: "We couldn’t send a new code. Please try again.",
        });
      }
    } catch (err) {
      setResendStatus({
        severity: "error",
        message: formatAuthError(err, "We couldn’t send a new code. Please try again."),
      });
    }
  };

  // Handle paste from clipboard
  const handlePaste = (e: React.ClipboardEvent) => {
    if (isVerified) return;

    e.preventDefault();
    const pastedData = e.clipboardData.getData("text/plain").trim();
    const numericValue = pastedData.replace(/[^0-9]/g, "");

    if (numericValue.length <= OTP_LENGTH) {
      const newOtp = [...otp];
      for (let i = 0; i < numericValue.length; i++) {
        if (i < OTP_LENGTH) {
          newOtp[i] = numericValue[i];
        }
      }
      setOtp(newOtp);

      // Focus appropriate field
      if (numericValue.length < OTP_LENGTH) {
        inputRefs.current[numericValue.length]?.focus();
      } else {
        inputRefs.current[OTP_LENGTH - 1]?.focus();
      }
    }
  };

  // Check if OTP is complete to enable verification
  const isOtpComplete = otp.every((digit) => digit !== "");

  return (
    <AuthLayout>
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
          <BrandLogo size="lg" />

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
                <Typography variant="overline" color="text.secondary" fontWeight={700}>
                  EMAIL VERIFICATION · STEP 2 OF 2
                </Typography>
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
                  {isVerified
                    ? "You have been successfully verified"
                    : subtitle}
                </Typography>

                {!isVerified && email && (
                  <EmailDeliveryNotice email={email} kind="verification" />
                )}
                {!email && <Alert severity="warning" sx={{ width: "100%" }} role="alert">
                  Verification requires an email address. Return to sign in or sign up to begin.
                </Alert>}
                {resendStatus && (
                  <Alert
                    severity={resendStatus.severity}
                    role={
                      resendStatus.severity === "success" ? "status" : "alert"
                    }
                    sx={{ width: "100%" }}
                  >
                    {resendStatus.message}
                  </Alert>
                )}

                {isVerified ? (
                  <CheckCircleOutlineIcon
                    color="success"
                    sx={{ fontSize: 60, my: 2 }}
                  />
                ) : (
                  <>
                    <Box
                      component="form"
                      id="email-verification-form"
                      onSubmit={(event) => {
                        event.preventDefault();
                        if (isOtpComplete && !verifying && !resending)
                          void handleVerify();
                      }}
                      sx={{
                        display: "grid",
                        gridTemplateColumns: `repeat(${OTP_LENGTH}, minmax(0, 1fr))`,
                        gap: 0.75,
                        width: "100%",
                        maxWidth: 320,
                        my: 2,
                      }}
                      onPaste={handlePaste}
                      className="dsp-otp-fields"
                    >
                      {otp.map((digit, index) => (
                        <OtpInput
                          className="dsp-otp-digit"
                          key={index}
                          inputRef={(el) => (inputRefs.current[index] = el)}
                          variant="outlined"
                          value={digit}
                          onChange={(e) => handleChange(index, e.target.value)}
                          onKeyDown={(e) => handleKeyDown(index, e)}
                          inputProps={{
                            "aria-label": `Verification code digit ${index + 1} of ${OTP_LENGTH}`,
                            maxLength: 1,
                            inputMode: "numeric",
                            pattern: "[0-9]*",
                          }}
                          autoComplete={index === 0 ? "one-time-code" : "off"}
                          disabled={verifying || isVerified}
                          error={!!error}
                        />
                      ))}
                    </Box>

                    {error && (
                      <Alert severity="error" sx={{ width: "100%" }}>
                        {error}
                      </Alert>
                    )}

                    <Button
                      variant="contained"
                      fullWidth
                      size="large"
                      type="submit"
                      form="email-verification-form"
                      disabled={
                        !isOtpComplete || verifying || resending || isVerified
                      }
                      sx={{ mt: 2 }}
                      startIcon={
                        verifying && (
                          <BrandActionSpinner label="Verifying code" />
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
                        disabled={
                          resending ||
                          verifying ||
                          isVerified ||
                          secondsRemaining > 0
                        }
                      >
                        {resending
                          ? <><BrandActionSpinner label="Sending verification code" /> Sending…</>
                          : secondsRemaining > 0
                            ? `Resend in ${secondsRemaining}s`
                            : "Resend code"}
                      </Button>
                    </Typography>
                    <Button component={Link} to="/auth/signin" variant="text">
                      Back to sign in
                    </Button>
                  </>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Box>
      </Container>
    </AuthLayout>
  );
};

export default OtpVerification;
