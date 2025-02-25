import type React from 'react';
import { Box, Container, Grid, useMediaQuery, useTheme } from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

interface AuthLayoutProps {
    children: React.ReactNode;
    backgroundImage?: string;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({
    children,
    backgroundImage = '/auth/side-screen.png'
}) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const { isAuthenticated } = useAuth();
    const nav = useNavigate()

    // if (isAuthenticated) {
    //     nav("/student-dashboard/overview")
    // }

    return (
        <Container maxWidth={false} disableGutters sx={{ height: '100vh' }}>
            <Grid container sx={{ height: '100%' }}>

                {!isMobile && (
                    <Grid
                        item
                        xs={12}
                        md={6}
                        lg={5}
                        sx={{
                            backgroundImage: `url(${backgroundImage})`,
                            backgroundRepeat: 'no-repeat',
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            height: '100vh',
                            overflow: 'hidden',
                        }}
                    />
                )}

                <Grid
                    item
                    xs={12}
                    md={6}
                    lg={7}
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        backgroundColor: 'background.paper',
                        height: '100vh',
                        overflowY: 'auto',
                    }}
                >
                    <Box
                        sx={{
                            height: '100%',
                            width: '100%',
                            maxWidth: '70%',
                            display: 'flex',
                            flexDirection: 'column',
                        }}
                    >
                        {children}
                    </Box>
                </Grid>
            </Grid>
        </Container>
    );
};

export default AuthLayout;
