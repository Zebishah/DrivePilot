import React from 'react';
import PropTypes from 'prop-types';
import {
    Card,
    CardContent,
    Typography,
    Button,
    Grid,
    Box,
} from '@mui/material';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';

/**
 * Single bulk package card with two-column rows
 */
const BulkPackageCard = ({ lessons, cost, startDate, endDate, lessonFee, packageDiscount, variant }) => {
    const calculatedSave = Math.round((1 - cost / (lessonFee * lessons)) * 100);
    const save = packageDiscount != null ? packageDiscount : calculatedSave;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const msPerDay = 1000 * 60 * 60 * 24;
    const durationDays = Math.floor((end - start) / msPerDay) + 1;

    // Define card styles based on variant
    const cardStyles = {
        highlighted: {
            backgroundColor: '#5FC2D333',
            color: 'black',
            border: '1px solid #A19A99',
        },
        default: {
            backgroundColor: 'white',
            color: 'black',
            border: '1px solid #A19A99',
        },
    }[variant];

    return (
        <Card
            variant="outlined"
            sx={{
                width: '100%',
                minWidth: 310,
                maxWidth: 420,
                mx: 'auto',
                mb: 2,
                borderRadius: 2,
                ...cardStyles,
                '& .MuiTypography-root': {
                    color: cardStyles.color,
                },
            }}
        >
            <CardContent>
                <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="subtitle1">Courses</Typography>
                    <Typography variant="subtitle1">{lessons}</Typography>
                </Box>
                <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="subtitle1">Price</Typography>
                    <Typography variant="subtitle1">${cost}</Typography>
                </Box>
                <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="subtitle1">Duration</Typography>
                    <Typography variant="subtitle1">{durationDays} days</Typography>
                </Box>
                <Box display="flex" justifyContent="space-between" mb={2}>
                    <Typography variant="subtitle1">Save</Typography>
                    <Typography variant="subtitle1">{save}%</Typography>
                </Box>
                <Button
                    fullWidth
                    variant="contained"
                    sx={{
                        backgroundColor: variant === 'first' ? 'white' : '#5FC2D3',
                        color: variant === 'first' ? '#5FC2D3' : 'white',
                        '&:hover': {
                            backgroundColor: variant === 'first' ? '#f5f5f5' : '#4bb1c2',
                        },
                    }}
                >
                    Get This Offer Now
                </Button>
            </CardContent>
        </Card>
    );
};

// Update PropTypes
BulkPackageCard.propTypes = {
    lessons: PropTypes.number.isRequired,
    cost: PropTypes.number.isRequired,
    startDate: PropTypes.string.isRequired,
    endDate: PropTypes.string.isRequired,
    lessonFee: PropTypes.number.isRequired,
    packageDiscount: PropTypes.number,
    variant: PropTypes.oneOf(['highlighted', 'default']).isRequired,
};

/**
 * Renders a grid of bulk lesson packages
 */
const BulkLessonPackages = ({ tariff }) => {
    if (!tariff || !Array.isArray(tariff.bulkPackages) || tariff.bulkPackages.length === 0) {
        return null;
    }

    const { lessonFee, packageDiscount, bulkPackages } = tariff;

    // Carousel settings
    const settings = {
        dots: true,
        infinite: false,
        speed: 500,
        slidesToShow: Math.min(3, bulkPackages.length),
        slidesToScroll: 1,
        responsive: [
            {
                breakpoint: 1024,
                settings: {
                    slidesToShow: 2,
                    slidesToScroll: 1,
                }
            },
            {
                breakpoint: 600,
                settings: {
                    slidesToShow: 1,
                    slidesToScroll: 1,
                }
            }
        ]
    };

    const renderPackages = () => {
        return bulkPackages.map((pkg, idx) => (
            <Grid item key={idx} sx={{ px: 1 }}> {/* Increase horizontal padding */}
                <BulkPackageCard
                    lessons={pkg.lessons}
                    cost={pkg.cost}
                    startDate={pkg.startDate}
                    endDate={pkg.endDate}
                    lessonFee={lessonFee}
                    packageDiscount={pkg?.cost}
                    variant={idx % 2 === 0 ? 'highlighted' : 'default'}
                />
            </Grid>
        ));
    };

    return (
        <Box sx={{
            width: '100%',
            maxWidth: 1400, // Increase maximum width of container
            margin: '0 auto',
            px: { xs: 2, md: 4 } // Add horizontal padding
        }}>
            {bulkPackages.length <= 3 ? (
                <Grid container spacing={4} justifyContent="center">
                    {renderPackages()}
                </Grid>
            ) : (
                <Box sx={{
                    '.slick-dots': {
                        bottom: -40
                    },
                    '.slick-dots li button:before': {
                        fontSize: 12,
                        color: '#5FC2D3'
                    },
                    '.slick-dots li.slick-active button:before': {
                        color: '#5FC2D3'
                    },
                    '.slick-prev, .slick-next': {
                        '&:before': {
                            color: '#5FC2D3'
                        }
                    },
                    py: 2
                }}>
                    <Slider {...settings}>
                        {renderPackages()}
                    </Slider>
                </Box>
            )}
        </Box>
    );
};

BulkLessonPackages.propTypes = {
    tariff: PropTypes.shape({
        lessonFee: PropTypes.number.isRequired,
        packageDiscount: PropTypes.number,
        bulkPackages: PropTypes.arrayOf(
            PropTypes.shape({
                lessons: PropTypes.number.isRequired,
                cost: PropTypes.number.isRequired,
                startDate: PropTypes.string.isRequired,
                endDate: PropTypes.string.isRequired,
            })
        ),
    }),
};

export default BulkLessonPackages;
