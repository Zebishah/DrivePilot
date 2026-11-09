import { formatAuthError } from "../../../utils/errorReference";
import BrandActionSpinner from "../../../components/loaders/BrandActionSpinner";
import React, { useEffect, useRef, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Alert,
  Box,
  Button,
  TextField,
  Typography,
  InputLabel,
  Link as MuiLink,
} from "@mui/material";
import AuthLayout from "../../../layouts/AuthLayout";
import Logo from "../../../components/Logo";
import EmailDeliveryNotice from "../../../components/EmailDeliveryNotice";
import { Link } from "react-router-dom";
import { FORGOT_PASSWORD } from "../../../graphql/mutations/auth";
import { useMutation } from "@apollo/client";
import { useEmailResendCooldown } from "../../../hooks/useEmailResendCooldown";

const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address"),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

const ForgotPassword: React.FC = () => {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });
  const [sentEmail, setSentEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);
  const confirmationHeading = useRef<HTMLHeadingElement>(null);
  const { secondsRemaining, restartCooldown } = useEmailResendCooldown();
  const [forgotPassword, { loading }] = useMutation(FORGOT_PASSWORD);

  useEffect(() => {
    if (sentEmail) confirmationHeading.current?.focus();
  }, [sentEmail]);

  const sendResetEmail = async (email: string) => {
    if (loading || secondsRemaining > 0) return;
    setError(null);
    setResent(false);
    try {
      const response = await forgotPassword({ variables: { email } });
      if (response.data?.forgotPassword.success) {
        setResent(sentEmail !== null);
        setSentEmail(email);
        restartCooldown();
      } else {
        setError("We couldn’t request a reset email. Please try again.");
      }
    } catch (error: unknown) {
      setError(
        formatAuthError(error, "We couldn’t request a reset email. Please try again."),
      );
    }
  };

  return (
    <AuthLayout>
      <Box sx={{ width: "100%", py: 3 }}>
        <Logo />
        {sentEmail ? (
          <Box sx={{ mt: 4, textAlign: "center" }}>
            <Typography
              variant="h4"
              component="h1"
              ref={confirmationHeading}
              tabIndex={-1}
              sx={{ mb: 3, fontWeight: "bold" }}
            >
              Check your inbox
            </Typography>
            <EmailDeliveryNotice email={sentEmail} kind="password-reset" />
            {resent && (
              <Alert
                severity="success"
                role="status"
                sx={{ mt: 3, textAlign: "left" }}
              >
                Another reset email has been requested. When it arrives, use the
                link in the newest email.
              </Alert>
            )}
            {error && (
              <Alert severity="error" sx={{ mt: 3, textAlign: "left" }}>
                {error}
              </Alert>
            )}
            <Button
              fullWidth
              variant="contained"
              disabled={loading || secondsRemaining > 0}
              onClick={() => void sendResetEmail(sentEmail)}
              sx={{ mt: 3 }}
            >
              {loading
                ? <><BrandActionSpinner label="Requesting email" /> Requesting email…</>
                : secondsRemaining > 0
                  ? `Resend available in ${secondsRemaining}s`
                  : "Resend reset email"}
            </Button>
            <Button
              fullWidth
              disabled={loading}
              onClick={() => {
                setSentEmail(null);
                setError(null);
                setResent(false);
              }}
              sx={{ mt: 1 }}
            >
              Use a different email
            </Button>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Signed up with Google or Facebook? Use that option on the sign-in
              page.
            </Typography>
          </Box>
        ) : (
          <>
            <Typography
              variant="h4"
              component="h1"
              sx={{ mt: 4, fontWeight: "bold" }}
            >
              Forgot your password?
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 1, mb: 4 }}
            >
              Enter your email and we’ll send reset instructions.
            </Typography>
            <Box
              component="form"
              noValidate
              onSubmit={handleSubmit(({ email }) => sendResetEmail(email))}
              sx={{ width: "100%" }}
            >
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}
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
                    type="email"
                    placeholder="E-mail address"
                    autoComplete="email"
                    autoFocus
                    disabled={loading}
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
                disabled={loading || secondsRemaining > 0}
                sx={{ mt: 3, mb: 2, py: 1.5 }}
              >
                {loading ? (
                  <>
                    <BrandActionSpinner label="Sending reset instructions" />{" "}
                    Sending instructions…
                  </>
                ) : secondsRemaining > 0 ? (
                  `Send available in ${secondsRemaining}s`
                ) : (
                  "Send reset instructions"
                )}
              </Button>
            </Box>
          </>
        )}
        <Box sx={{ textAlign: "center", mt: 3 }}>
          <MuiLink component={Link} to="/auth/signin" variant="body2">
            Back to sign in
          </MuiLink>
        </Box>
      </Box>
    </AuthLayout>
  );
};

export default ForgotPassword;
