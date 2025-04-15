// src/pages/Public/SignIn.tsx
import React, { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Box,
  Button,
  TextField,
  Typography,
  IconButton,
  InputAdornment,
  Link as MuiLink,
  CircularProgress,
  InputLabel,
} from "@mui/material";
import { Eye, EyeOff, Facebook } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import AuthLayout from "../../../layouts/AuthLayout";
import Logo from "../../../components/Logo";
import { useAuth } from "../../../context/AuthContext";
import { SIGN_IN } from "../../../graphql/mutations/auth";
import { useMutation } from "@apollo/client";
import toast from "react-hot-toast";

// Define schema for form validation
const signInSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  rememberMe: z.boolean().optional(),
});

type SignInFormValues = z.infer<typeof signInSchema>;
const backendAuth = import.meta.env.VITE_APP_AUTH_URL;
const SignIn: React.FC = () => {
  const navigate = useNavigate();
  const { login, tempUser } = useAuth();
  const [showPassword, setShowPassword] = React.useState(false);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const error = searchParams.get("error");
    if (error) {
      toast.error(decodeURIComponent(error));

      // Remove error param from URL after showing toast
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("error");
      navigate(`?${newParams.toString()}`, { replace: true });
    }
  }, [searchParams, navigate]);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  const [signIn, { loading }] = useMutation(SIGN_IN, {
    onCompleted: (data) => {
      const { signIn } = data;
      if (signIn?.user?.role === "Admin") {
        login(signIn);
        navigate(`/admin-dashboard/overview`);
        return
      }
      if (!signIn?.user?.isUserVerified) {
        navigate(`/auth/verificationPage/${signIn?.user.email}`);
      } else {
        if (signIn?.success) {
          navigate(`/auth/twoFactorAuthPage/${signIn.user.email}`);
        }
      }

      // if (signIn?.user?.isProfileComplete) {
      //     login(signIn);

      //     if (signIn?.user?.role === "Student") navigate("/student-dashboard/overview");
      //     else if (signIn?.user?.role === "Instructor") navigate("/teacher-dashboard/overview");
      //     else if (signIn?.user?.role === "Admin") navigate("/admin-dashboard/overview");
      //     toast.success("Login Successfully");
      // } else {
      //     toast.success("Please Complete your Profile");
      //     const userRole = signIn?.user?.role.toLowerCase();
      //     tempUser(signIn);
      //     if (userRole === "userbase") {
      //         navigate("/onboarding/role-selection");
      //     } else if (userRole === "student") {
      //         navigate("/onboarding/student-profile");
      //     } else if (userRole === "instructor") {
      //         navigate("/onboarding/instructor-profile");
      //     }
      // }
    },
    onError: (error) => {
      toast.error(`${error.graphQLErrors[0]?.message}`);
    },
  });
  const onSubmit = async (formData: SignInFormValues) => {
    try {
      await signIn({
        variables: {
          email: formData.email,
          password: formData.password,
        },
      });
    } catch (error) {
      toast.error(`Login error: ${error?.message}`);
      console.error("Login error:", error);
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
            sx={{ mb: 4, mt: 4, fontWeight: "bold" }}
          >
            Welcome!
          </Typography>
        </Box>

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
          component="form"
          noValidate
          onSubmit={handleSubmit(onSubmit)}
          sx={{ width: "100%" }}
        >
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
          <InputLabel htmlFor="password">Password</InputLabel>
          <Controller
            name="password"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                margin="normal"
                required
                fullWidth
                placeholder="Password"
                type={showPassword ? "text" : "password"}
                id="password"
                autoComplete="current-password"
                error={!!errors.password}
                helperText={errors.password?.message}
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

          <Box
            sx={{
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
              mt: 1,
            }}
          >
            {/* <Controller
                        name="rememberMe"
                        control={control}
                        render={({ field }) => (
                            <FormControlLabel
                                control={<Checkbox {...field} color="primary" />}
                                label="Remember me"
                            />
                        )}
                    /> */}
            <MuiLink
              component={Link}
              to="/auth/forgot-password"
              variant="body2"
            >
              Forgot Password?
            </MuiLink>
          </Box>

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
              "&:hover": {
                bgcolor: "#3AB7E0",
              },
            }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : "Login"}
          </Button>

          <Box sx={{ mt: 2, mb: 3, textAlign: "center" }}>
            <Typography variant="body2" color="text.secondary">
              Or Sign in using
            </Typography>
          </Box>

          <Box
            sx={{ display: "flex", justifyContent: "center", gap: 2, mb: 3 }}
          >
            <IconButton
              sx={{
                p: 0,
                width: 54,
                height: 54,
                borderRadius: 0,
              }}
              href={`${backendAuth}auth/facebook`}
            >
              <img
                src="/auth/facebook_logo.png"
                alt="Facebook"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </IconButton>
            <IconButton
              sx={{
                border: "1px solid",
                borderColor: "divider",
                borderRadius: "50%",
                p: 1.2,
                width: 54,
                height: 54,
              }}
              href={`${backendAuth}auth/google`}
            >
              <img
                src="/auth/google_logo.png"
                alt="Google"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </IconButton>
          </Box>

          <Box sx={{ textAlign: "center", mt: 2 }}>
            <Typography variant="body2">
              Don't have an account?{" "}
              <MuiLink
                component={Link}
                to="/auth/signup"
                variant="body2"
                sx={{ fontWeight: "bold" }}
              >
                Register Here
              </MuiLink>
            </Typography>
          </Box>
        </Box>
      </Box>
    </AuthLayout>
  );
};

export default SignIn;
