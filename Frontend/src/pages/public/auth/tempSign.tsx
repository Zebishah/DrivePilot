import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Box,
  Button,
  Grid,
  IconButton,
  InputAdornment,
  Link,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Eye, EyeOff } from "lucide-react";
import BrandLogo from "../../../components/BrandLogo";

// Validation schema
const signInSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type SignInFormData = z.infer<typeof signInSchema>;

export default function SignIn() {
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
  });

  const onSubmit = async (data: SignInFormData) => {
    try {
      void data;
      // TODO: Implement GraphQL mutation
    } catch (error) {
      console.error("Sign in error:", error);
    }
  };

  return (
    <Grid container sx={{ minHeight: "100vh" }}>
      {/* Left Side - Image */}
      <Grid
        item
        xs={12}
        md={6}
        sx={{
          backgroundImage: "url(/auth/side-screen.png)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />

      {/* Right Side - Form */}
      <Grid
        item
        xs={12}
        md={6}
        sx={{
          display: "flex",
          flexDirection: "column",
          p: 4,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Decorative Circles */}
        <Box
          component="img"
          alt="Drive Pilot Logo"
          src="/decorative-circles.png"
          sx={{
            position: "absolute",
            top: -100,
            right: -100,
            width: 300,
            height: 300,
            // borderRadius: '50%',
            // background: 'rgba(94, 197, 211, 0.1)',
            // zIndex: 0,
          }}
        />
        {/* <Box
                    sx={{
                        position: 'absolute',
                        top: -50,
                        right: -150,
                        width: 200,
                        height: 200,
                        borderRadius: '50%',
                        background: 'rgba(94, 197, 211, 0.05)',
                        zIndex: 0,
                    }}
                /> */}

        {/* Form Content */}
        <Box
          sx={{
            maxWidth: 450,
            width: "100%",
            mx: "auto",
            zIndex: 1,
          }}
        >
          <BrandLogo size="md" />

          <Typography variant="h4" component="h1" gutterBottom align="left">
            Welcome!
          </Typography>

          <Box
            component="form"
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            sx={{ mt: 3 }}
          >
            <Typography variant="body1" gutterBottom>
              E-mail address
            </Typography>
            <TextField
              fullWidth
              id="email"
              placeholder="Email Address"
              autoComplete="email"
              autoFocus
              error={!!errors.email}
              helperText={errors.email?.message}
              {...register("email")}
              sx={{ mb: 3 }}
            />

            <Typography variant="body1" gutterBottom>
              Password
            </Typography>
            <TextField
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
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              {...register("password")}
            />

            <Box sx={{ textAlign: "right", mt: 1 }}>
              <Link
                href="/forgot-password"
                sx={{
                  color: "text.secondary",
                  textDecoration: "none",
                  "&:hover": { textDecoration: "underline" },
                }}
              >
                Forgot Password?
              </Link>
            </Box>

            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={isSubmitting}
              sx={{
                mt: 3,
                mb: 2,
                py: 1.5,
                bgcolor: "rgb(94, 197, 211)",
                "&:hover": {
                  bgcolor: "rgb(84, 177, 191)",
                },
              }}
            >
              Login
            </Button>

            <Stack spacing={2} alignItems="center">
              <Typography variant="body2" color="text.secondary">
                Or Sign in using
              </Typography>

              <Stack direction="row" spacing={2}>
                <IconButton
                  sx={{
                    border: 1,
                    borderColor: "divider",
                    p: 1,
                  }}
                >
                  <Box
                    component="img"
                    src="/facebook-icon.png"
                    alt="Facebook"
                    sx={{ width: 24, height: 24 }}
                  />
                </IconButton>
                <IconButton
                  sx={{
                    border: 1,
                    borderColor: "divider",
                    p: 1,
                  }}
                >
                  <Box
                    component="img"
                    src="/google-icon.png"
                    alt="Google"
                    sx={{ width: 24, height: 24 }}
                  />
                </IconButton>
              </Stack>

              <Typography variant="body2" color="text.secondary">
                Don't have an account?{" "}
                <Link
                  href="/sign-up"
                  sx={{
                    color: "rgb(94, 197, 211)",
                    textDecoration: "none",
                    "&:hover": { textDecoration: "underline" },
                  }}
                >
                  Register Here
                </Link>
              </Typography>
            </Stack>
          </Box>
        </Box>
      </Grid>
    </Grid>
  );
}
