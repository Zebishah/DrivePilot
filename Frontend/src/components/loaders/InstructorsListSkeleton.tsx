import React from 'react';
import {
    Box,
    Button,
    Skeleton,
    Grid,
    Container
} from '@mui/material';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';

const InstructorsListSkeleton: React.FC = () => {
    return (
        <Container>
            <Grid container spacing={2}>
                {/* Instructor List Column */}
                <Grid item xs={12} md={6}>
                    <Box sx={{ maxHeight: 900, overflowY: 'auto', pr: 2 }}>
                        {[1, 2].map((item) => (
                            <Box key={item} sx={{ mb: 2 }}>
                                <Grid container spacing={2}>
                                    {/* Left Side - Profile */}
                                    <Grid item xs={12} md={4}>
                                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                            <Skeleton variant="circular" width={96} height={96} />
                                            <Skeleton variant="text" width={120} height={30} />
                                            <Skeleton variant="text" width={100} height={20} />
                                            <Skeleton variant="text" width={80} height={20} />
                                        </Box>
                                    </Grid>

                                    {/* Right Side - Details */}
                                    <Grid item xs={12} md={8}>
                                        <Box sx={{ pl: 2 }}>
                                            <Skeleton variant="text" width="100%" height={30} />
                                            <Skeleton variant="text" width="100%" height={30} />
                                            <Skeleton variant="text" width="100%" height={30} />
                                            <Skeleton variant="text" width="100%" height={30} />

                                            <Skeleton
                                                variant="rectangular"
                                                width="100%"
                                                height={50}
                                                sx={{ mt: 2, borderRadius: 2 }}
                                            />
                                        </Box>
                                    </Grid>
                                </Grid>
                            </Box>
                        ))}

                        {/* Load More Skeleton */}
                        <Box sx={{ textAlign: 'center', mt: 2 }}>
                            <Skeleton
                                variant="rectangular"
                                width={200}
                                height={40}
                                sx={{ mx: 'auto' }}
                            />
                        </Box>
                    </Box>
                </Grid>

                {/* Map Column */}
                <Grid item xs={12} md={6}>
                    <Skeleton
                        variant="rectangular"
                        width="100%"
                        height={400}
                        sx={{ borderRadius: 2 }}
                    />
                </Grid>
            </Grid>
        </Container>
    );
};

export default InstructorsListSkeleton;