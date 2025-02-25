import type React from "react";
import type { ReactNode } from "react";
import { Box, Container } from "@mui/material";
import { Outlet, useLocation } from "react-router-dom";

interface OnboardingLayoutProps {
    children?: ReactNode;
}

const OnboardingLayout: React.FC<OnboardingLayoutProps> = ({ children }) => {
    const location = useLocation();

    return (
        <Box
            sx={{
                height: '100vh',
                width: '100vw',
                display: 'flex',
                bgcolor: 'background.default',
            }}
        >
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                        xs: '1fr',
                        md: location.pathname === "/onboarding/role-selection" ? '1fr' : '1fr 1fr'
                    },
                    width: '100%',
                    height: '100%',
                }}
            >

                {location.pathname !== "/onboarding/role-selection" && (
                    <Box
                        sx={{
                            display: { xs: 'none', md: 'block' },
                            background: `url('/onboarding/onboarding-img.png') no-repeat center`,
                            backgroundSize: 'cover',
                            height: '100vh',
                            width: '100%',
                            overflow: 'hidden',
                        }}
                    />
                )}


                <Box
                    sx={{
                        overflowY: 'auto',
                        p: 4,
                        width: '100%',
                        height: '100vh',
                    }}
                >
                    <Container>
                        {children || <Outlet />}
                    </Container>
                </Box>
            </Box>
        </Box>
    );
};

export default OnboardingLayout;
