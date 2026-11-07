import React from "react";
import { useEffect, useRef, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Alert,
  Box,
  Button,
  TextField,
  Typography,
  CircularProgress,
  InputLabel,
  InputAdornment,
  IconButton,
  Link as MuiLink,
} from "@mui/material";
import AuthLayout from "../../../layouts/AuthLayout";
import Logo from "../../../components/Logo";
import { Link, useParams } from "react-router-dom";
import { RESET_PASSWORD } from "../../../graphql/mutations/auth";
import { useMutation } from "@apollo/client";
import { CheckCircle2, Eye, EyeOff } from "lucide-react";

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords must match",
    path: ["confirmPassword"],
  });

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

const ResetPassword: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [resetPassword, { loading }] = useMutation(RESET_PASSWORD);
  const [isReset, setIsReset] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const successHeading = useRef<HTMLHeadingElement>(null);
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    if (isReset) successHeading.current?.focus();
  }, [isReset]);

  const onSubmit = async (data: ResetPasswordFormValues) => {
    if (!token || loading || isReset) return;
    setError(null);
    try {
      const response = await resetPassword({
        variables: { token, newPassword: data.password },
      });
      if (response.data?.resetPassword.success) {
        setIsReset(true);
      } else {
        setError(
          response.data?.resetPassword.message ||
            "We couldn’t reset your password. Please try again.",
        );
      }
    } catch (error: unknown) {
      setError(
        error instanceof Error
          ? error.message
          : "We couldn’t reset your password. Please try again.",
      );
    }
  };

  return (
    <AuthLayout>
      {isReset ? (
        <Box sx={{ width: "100%", textAlign: "center", py: 4 }}>
          <CheckCircle2
            size={44}
            aria-hidden="true"
            style={{
              margin: "0 auto 24px",
              color: "var(--ws-success, #23765B)",
            }}
          />
          <Typography
            component="h1"
            variant="h4"
            ref={successHeading}
            tabIndex={-1}
          >
            Your password has been reset
          </Typography>
          <Typography sx={{ mt: 2, mb: 3 }} color="text.secondary">
            You’re ready to sign in with your new password.
          </Typography>
          <Button
            component={Link}
            to="/auth/signin"
            variant="contained"
            fullWidth
          >
            Continue to sign in
          </Button>
        </Box>
      ) : (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "background.paper",
            height: "100vh",
            overflowY: "auto",
          }}
        >
          <Box
            sx={{
              mb: 4,
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              alignSelf: "flex-start",
              width: "100%",
            }}
          >
            <Logo />
            <Typography
              variant="h4"
              component="h1"
              sx={{ mt: 4, fontWeight: "bold" }}
            >
              Create a new password
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Use a new password to keep your Drive Pilot account secure.
            </Typography>
          </Box>

          <Box
            component="form"
            noValidate
            onSubmit={handleSubmit(onSubmit)}
            sx={{ width: "100%" }}
          >
            {(!token || error) && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error || "This reset link is missing or incomplete."}{" "}
                <MuiLink component={Link} to="/auth/forgot-password">
                  Request a new reset link
                </MuiLink>
              </Alert>
            )}
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
                  type={showPassword ? "text" : "password"}
                  id="password"
                  placeholder="New Password"
                  autoComplete="new-password"
                  error={!!errors.password}
                  helperText={
                    errors.password?.message ||
                    "Use at least 8 characters with uppercase and lowercase letters and a number."
                  }
                  disabled={loading || !token}
                  sx={{ mb: 2 }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                          aria-label="toggle password visibility"
                        >
                          {showPassword ? (
                            <EyeOff size={20} />
                          ) : (
                            <Eye size={20} />
                          )}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
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
                  type={showConfirmPassword ? "text" : "password"}
                  id="confirmPassword"
                  placeholder="Confirm Password"
                  autoComplete="new-password"
                  error={!!errors.confirmPassword}
                  helperText={errors.confirmPassword?.message}
                  disabled={loading || !token}
                  sx={{ mb: 2 }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() =>
                            setShowConfirmPassword(!showConfirmPassword)
                          }
                          edge="end"
                          aria-label="toggle confirm password visibility"
                        >
                          {showConfirmPassword ? (
                            <EyeOff size={20} />
                          ) : (
                            <Eye size={20} />
                          )}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              )}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading || !token}
              sx={{
                mt: 3,
                mb: 2,
                py: 1.5,
                bgcolor: "var(--ws-primary, #4CC9F0)",
                "&:hover": { bgcolor: "var(--ws-primary, #3AB7E0)" },
              }}
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                "Reset password"
              )}
            </Button>
            <Box sx={{ textAlign: "center", mt: 1 }}>
              <MuiLink component={Link} to="/auth/signin" variant="body2">
                Back to sign in
              </MuiLink>
            </Box>
          </Box>
        </Box>
      )}
    </AuthLayout>
  );
};

export default ResetPassword;
