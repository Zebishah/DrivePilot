import React from "react";
import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Box,
  Button,
  TextField,
  Typography,
  CircularProgress,
  InputLabel,
  InputAdornment,
  IconButton,
} from "@mui/material";
import AuthLayout from "../../../layouts/AuthLayout";
import Logo from "../../../components/Logo";
import { useNavigate, useParams } from "react-router-dom";
import { RESET_PASSWORD } from "../../../graphql/mutations/auth";
import { useMutation } from "@apollo/client";
import toast from "react-hot-toast";
import { Eye, EyeOff } from "lucide-react";

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
  const nav = useNavigate();
  const { token } = useParams<{ token: string }>();
  const [resetPassword, { loading, error }] = useMutation(RESET_PASSWORD);
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
    if (!token) {
      toast.error("Invalid or missing reset token. Please try again.");
    }
  }, [token]);

  const onSubmit = async (data: ResetPasswordFormValues) => {
    if (!token) {
      toast.error("Invalid or missing reset token. Please try again.");
      return;
    }

    try {
      const response = await resetPassword({
        variables: {
          token: token,
          newPassword: data.password,
        },
      });
      if (response.data?.resetPassword.success) {
        toast.success(
          response.data.resetPassword.message || "Password reset successful!"
        );

        // // Store the token if it was returned
        // if (response.data.resetPassword.token) {
        //     localStorage.setItem('authToken', response.data.resetPassword.token);
        // }

        setTimeout(() => {
          nav("/auth/signin");
        }, 3000);
      } else {
        toast.error("Failed to reset password. Please try again.");
      }
    } catch (error: any) {
      toast.error(error.message || "An error occurred. Please try again.");
    }
  };

  return (
    <AuthLayout>
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
          component="img"
          alt="Cricles"
          src="/auth/decorative-circles.png"
          sx={{
            position: "absolute",
            top: 1,
            right: 1,
          }}
        ></Box>

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
            Reset Password
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 1, whiteSpace: "nowrap" }}
          >
            Enter your new password below to reset your account access.
          </Typography>
        </Box>

        <Box
          component="form"
          noValidate
          onSubmit={handleSubmit(onSubmit)}
          sx={{ width: "100%" }}
        >
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
                helperText={errors.password?.message}
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

          {/* <InputLabel htmlFor="confirmPassword">Confirm Password</InputLabel>
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
          /> */}

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
            disabled={loading}
            sx={{
              mt: 3,
              mb: 2,
              py: 1.5,
              bgcolor: "#4CC9F0",
              "&:hover": { bgcolor: "#3AB7E0" },
            }}
          >
            {loading ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              "Change Password"
            )}
          </Button>
        </Box>
      </Box>
    </AuthLayout>
  );
};

export default ResetPassword;
