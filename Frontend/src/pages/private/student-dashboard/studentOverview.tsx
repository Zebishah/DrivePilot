import { Box, Grid, Paper, Typography, Button, Card, CardContent } from "@mui/material"
import { BookOpen, Download } from "lucide-react"
import { CircularProgressbar } from "react-circular-progressbar"
import "react-circular-progressbar/dist/styles.css"

export default function StudentOverview() {
    return (
        <Box sx={{ p: 3 }}>
            {/* Stats Grid */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ bgcolor: "#ffcdd2", height: "100%" }}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Total Lessons
                            </Typography>
                            <Typography variant="h3" component="div">
                                30
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ bgcolor: "rgba(222, 78, 245, 0.2)", height: "100%" }}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Current Booking
                            </Typography>
                            <Typography variant="h3" component="div">
                                6
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ bgcolor: "rgba(254, 204, 28, 0.2)", height: "100%" }}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Total Instructors
                            </Typography>
                            <Typography variant="h3" component="div">
                                4
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ bgcolor: "rgba(94, 194, 210, 0.2)", height: "100%" }}>
                        <CardContent sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <Typography variant="h6">Total Hours</Typography>
                            <Box sx={{ width: 80, height: 80 }}>
                                <CircularProgressbar value={50} text="5hrs" />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* This Week's Lessons */}
            <Box sx={{ mb: 4 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                    <Typography variant="h5">This Week's Lessons</Typography>
                    <Button variant="contained" sx={{ bgcolor: "#5ec2d2", "&:hover": { bgcolor: "#4ba1b0" } }}>
                        Find Instructor
                    </Button>
                </Box>
                <Grid container spacing={2}>
                    {[1, 2, 3, 4].map((lesson) => (
                        <Grid item xs={12} key={lesson}>
                            <Paper
                                sx={{
                                    p: 2,
                                    bgcolor: "rgba(94, 194, 210, 0.1)",
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                }}
                            >
                                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                                    <BookOpen size={20} />
                                    <Typography>Lesson {lesson}</Typography>
                                </Box>
                                <Typography color="text.secondary">{lesson <= 2 ? "Completed" : "In Progress"}</Typography>
                            </Paper>
                        </Grid>
                    ))}
                </Grid>
            </Box>

            {/* All Lessons */}
            <Box sx={{ mb: 4 }}>
                <Typography variant="h5" sx={{ mb: 2 }}>
                    All Lessons
                </Typography>
                <Grid container spacing={2}>
                    {[1, 2, 3].map((lesson) => (
                        <Grid item xs={12} key={lesson}>
                            <Paper
                                sx={{
                                    p: 2,
                                    bgcolor: "rgba(94, 194, 210, 0.1)",
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                }}
                            >
                                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                                    <BookOpen size={20} />
                                    <Typography>Lesson {lesson}</Typography>
                                </Box>
                                <Typography color="text.secondary">{lesson <= 2 ? "Completed" : "In Progress"}</Typography>
                            </Paper>
                        </Grid>
                    ))}
                </Grid>
            </Box>

            {/* Notes From Instructors */}
            <Box>
                <Typography variant="h5" sx={{ mb: 2 }}>
                    Notes From Instructors
                </Typography>
                <Grid container spacing={2}>
                    {[1, 2, 3, 4].map((note) => (
                        <Grid item xs={12} sm={6} md={4} lg={3} key={note}>
                            <Paper sx={{ p: 2 }}>
                                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                                    <Typography variant="subtitle1">
                                        Lesson{note} ({note} hrs)
                                    </Typography>
                                    <Button startIcon={<Download />} size="small">
                                        Download
                                    </Button>
                                </Box>
                                <Typography variant="body2" color="text.secondary">
                                    Jan 25, 2024 12:45 am
                                </Typography>
                            </Paper>
                        </Grid>
                    ))}
                </Grid>
            </Box>
        </Box>
    )
}

