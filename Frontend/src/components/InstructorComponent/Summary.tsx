import React from "react";
import {
  Box,
  Card,
  CardContent,
  ListItemIcon,
  Typography,
} from "@mui/material";
import { List, ListItem } from "@mui/material";
import CircleIcon from "@mui/icons-material/Circle";
import { FaRegCheckCircle } from "react-icons/fa";
interface SummaryProps {
  instructorData: any;
  tariffData: any;
  loading: boolean;
}
const Summary: React.FC<SummaryProps> = ({
  instructorData,
  tariffData,
  loading,
}) => {
  return (
    <div>
      <Card
        sx={{
          marginTop: 2,

          height: { xs: "auto", md: 650 },
          borderRadius: "10px",
          marginBottom: "1rem",
          boxShadow: 2,
        }}
      >
        <CardContent>
          <Typography
            sx={{
              fontWeight: "600",
              fontFamily: "Poppins, sans-serif",
            }}
            variant="h6"
          >
            Summary
          </Typography>
          <Typography
            sx={{
              marginBottom: "0.5rem",
              fontFamily: "Poppins, sans-serif",
              fontWeight: "600",
            }}
            variant="subtitle1"
            marginTop={2}
          >
            About Me
          </Typography>
          <Typography
            sx={{
              textJustify: "1",
              fontFamily: "Poppins, sans-serif",
            }}
            variant="body2"
            color="textSecondary"
          >
            {instructorData?.description || "No description available."}
          </Typography>

          <Typography
            sx={{
              marginBottom: "0.5rem",
              fontFamily: "Poppins, sans-serif",
              fontWeight: "600",
            }}
            variant="subtitle1"
            marginTop={2}
          >
            Language Spoken
          </Typography>
          {Array.isArray(instructorData?.languagePreference) &&
          instructorData.languagePreference.length > 0 ? (
            <List dense>
              {instructorData.languagePreference.map(
                (lang: string, idx: number) => (
                  <ListItem key={idx} disableGutters sx={{ pl: 0 }}>
                    <CircleIcon
                      sx={{ fontSize: "0.5rem", color: "var(--ws-muted, #4D4D4D)", mr: 1 }}
                    />
                    <Typography
                      variant="body2"
                      color="textSecondary"
                      sx={{ fontFamily: "Poppins, sans-serif" }}
                    >
                      {lang}
                    </Typography>
                  </ListItem>
                )
              )}
            </List>
          ) : (
            <Typography
              sx={{
                fontFamily: "Poppins, sans-serif",
              }}
              variant="body2"
              color="textSecondary"
            >
              Not specified
            </Typography>
          )}

          <Typography
            sx={{
              marginBottom: "0.5rem",
              fontFamily: "Poppins, sans-serif",
              fontWeight: "600",
            }}
            variant="subtitle1"
            marginTop={2}
          >
            Certifications (static)
          </Typography>
          <Typography
            sx={{
              marginBottom: "0.5rem",
              fontFamily: "Poppins, sans-serif",
            }}
            variant="body2"
            color="textSecondary"
          >
            Certified Child Care Provider
          </Typography>

          <Typography
            sx={{
              marginBottom: "0.5rem",
              fontFamily: "Poppins, sans-serif",
              fontWeight: "600",
            }}
            variant="subtitle1"
            marginTop={2}
          >
            Verification (static)
          </Typography>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              marginBottom: "0.5rem",
            }}
          >
            <Typography
              variant="body2"
              color="textSecondary"
              sx={{ marginRight: "0.5rem", fontFamily: "Poppins, sans-serif" }}
            >
              Criminal Record Check
            </Typography>
            <FaRegCheckCircle style={{ color: "var(--ws-success, #25D422)" }} />
          </Box>
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Typography
              variant="body2"
              color="textSecondary"
              sx={{
                marginRight: "0.5rem",
                fontFamily: "Poppins, sans-serif",
              }}
            >
              Reference Check
            </Typography>
            <FaRegCheckCircle style={{ color: "var(--ws-success, #25D422)" }} />
          </Box>
        </CardContent>
      </Card>
    </div>
  );
};

export default Summary;
