// src/pages/Public/SignUp.tsx
import type React from "react";
import { useEffect, useState } from "react";
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
  FormControlLabel,
  Checkbox,
  InputLabel,
} from "@mui/material";
import { Eye, EyeOff } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import AuthLayout from "../../../layouts/AuthLayout";
import { useMutation, useQuery } from "@apollo/client";
import {
  GET_SIGNUP_TOKEN_DETAILS,
  SIGN_UP_MUTATION,
  UPDATE_SIGNUP_LINK_STATUS,
} from "../../../graphql/mutations/auth";
import { useAuth } from "../../../context/AuthContext";
import toast from "react-hot-toast";

// Define schema for form validation
const signUpSchema = z
  .object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email("Please enter a valid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    // .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
    confirmPassword: z.string(),
    agreeToTerms: z.boolean().refine((value) => value === true, {
      message: "You must agree to the Terms of Use and Privacy Policy",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

const backendAuth = import.meta.env.VITE_APP_AUTH_URL;

type SignUpFormValues = z.infer<typeof signUpSchema>;

const SignUp: React.FC = () => {
  const { token } = useParams();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [linkID, setLinkID] = useState(null);
  const nav = useNavigate();
  const { verifyUser } = useAuth();
  const [updateSignupLinkStatus] = useMutation(UPDATE_SIGNUP_LINK_STATUS, {
    onCompleted: () => {
      toast.success("Signup successful! Redirecting you to Sign in...");
      setTimeout(() => {
        nav("/auth/signin");
      }, 2000); // delay for better UX, or remove if not needed
    },
    onError: (err) => {
      toast.error(err.message || "Something went wrong!");
    },
  });
  const [signUp, { loading }] = useMutation(SIGN_UP_MUTATION);
  const {
    data,
  } = useQuery(GET_SIGNUP_TOKEN_DETAILS, {
    skip: !token,
    variables: { token: token || "" },
  });

  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
      agreeToTerms: false,
    },
  });

  useEffect(() => {
    if (token && data) {
      if (data.getSignupTokenDetails.pending === true)
        setValue("firstName", data.getSignupTokenDetails.firstName);
      setValue("lastName", data.getSignupTokenDetails.lastName);
      setValue("email", data.getSignupTokenDetails.email);
      setLinkID(data.getSignupTokenDetails.id);
    }
  }, [data, setValue, token]);

  const onSubmit = async (data: SignUpFormValues) => {
    try {
      setIsSubmitting(true);
      const { data: authData } = await signUp({
        variables: {
          input: {
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            password: data.password,
            agreeToTerms: data.agreeToTerms,
          },
        },
      });
      if (token && linkID) {
        const pending = false;
        await updateSignupLinkStatus({
          variables: { id: linkID, pending, email: data.email },
        });
      }

      // tempUser(authData.signUp);
      if (!token) {
        verifyUser(authData.signUp);

        if (authData.signUp.success) {
          nav(`/auth/verificationPage/${authData.signUp.user.email}`);
        }
      }
      // nav("/onboarding/role-selection");
    } catch (error) {
      toast.error(`${error?.message}`);
    } finally {
      setIsSubmitting(false);
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
          height: "auto",
          overflowY: "auto",
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            alignSelf: "flex-start",
            width: "100%",
          }}
        >
          <Typography
            variant="h4"
            component="h1"
            sx={{ mb: 3, fontWeight: "bold" }}
          >
            Create your account
          </Typography>
          <Typography className="dsp-auth-intro" variant="body2">
            Start your learning or teaching journey with DSP.
          </Typography>
        </Box>
        <Box
          component="form"
          noValidate
          onSubmit={handleSubmit(onSubmit)}
          sx={{
            width: "100%",
            overflowY: "scroll",
            paddingRight: "12px", // Add padding for scrollbar spacing
            // boxSizing: "content-box" // Ensures padding doesn't affect width
          }}
        >
          <InputLabel htmlFor="firstName">First Name</InputLabel>
          <Controller
            name="firstName"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                margin="normal"
                required
                fullWidth
                id="firstName"
                placeholder="First Name"
                autoFocus
                error={!!errors.firstName}
                helperText={errors.firstName?.message}
                sx={{ mb: 2 }}
                disabled={!!data?.getSignupTokenDetails?.name}
              />
            )}
          />

          <InputLabel htmlFor="lastName">Last Name</InputLabel>
          <Controller
            name="lastName"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                margin="normal"
                required
                fullWidth
                id="lastName"
                placeholder="Last Name"
                error={!!errors.lastName}
                helperText={errors.lastName?.message}
                sx={{ mb: 2 }}
                disabled={!!data?.getSignupTokenDetails?.name}
              />
            )}
          />

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
                placeholder="Email Address"
                autoComplete="email"
                error={!!errors.email}
                helperText={errors.email?.message}
                sx={{ mb: 2 }}
                disabled={!!data?.getSignupTokenDetails?.email}
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
                sx={{ mb: 2 }}
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
                placeholder="Confirm Password"
                type={showConfirmPassword ? "text" : "password"}
                id="confirmPassword"
                error={!!errors.confirmPassword}
                helperText={errors.confirmPassword?.message}
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

          <Box sx={{ mt: 1, display: "flex ", flexDirection: "column", mb: 1 }}>
            <Controller
              name="agreeToTerms"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={<Checkbox {...field} color="primary" />}
                  label={
                    <Typography variant="body2">
                      I have read and agreed with{" "}
                      <MuiLink component={Link} to="/terms" variant="body2">
                        Terms of Use
                      </MuiLink>{" "}
                      and{" "}
                      <MuiLink component={Link} to="/privacy" variant="body2">
                        Privacy Policy
                      </MuiLink>
                    </Typography>
                  }
                />
              )}
            />
            {errors.agreeToTerms && (
              <Typography variant="caption" color="error">
                {errors.agreeToTerms.message}
              </Typography>
            )}
          </Box>

          <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={isSubmitting || loading}
            sx={{
              mt: 1,
              mb: 1,
              py: 1.5,
              bgcolor: "#4CC9F0",
              "&:hover": {
                bgcolor: "#3AB7E0",
              },
            }}
          >
            {isSubmitting ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              "Create account"
            )}
          </Button>

          <Box className="dsp-auth-divider" sx={{ mt: 1, mb: 2, textAlign: "center" }}>
            <Typography variant="body2" color="text.secondary">
              or continue with
            </Typography>
          </Box>

          <Box className="dsp-auth-social">
            <a href={`${backendAuth}auth/google`}><img src="/auth/google_logo.png" alt="" />Continue with Google</a>
            <a href={`${backendAuth}auth/facebook`}><img src="/auth/facebook_logo.png" alt="" />Continue with Facebook</a>
          </Box>

          <Typography className="dsp-auth-account-link" variant="body2">
            Already have an account? <Link to="/auth/signin">Sign in</Link>
          </Typography>
        </Box>
      </Box>
    </AuthLayout>
  );
};

export default SignUp;
