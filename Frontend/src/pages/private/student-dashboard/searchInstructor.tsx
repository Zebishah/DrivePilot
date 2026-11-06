import { Box } from "@mui/material";
import InstructorInfo from "../../../components/ProfessionalInstructor/InstructorInfo";
import { useAuth } from "../../../context/AuthContext";
import { Navigate } from "react-router-dom";
import { Search } from "lucide-react";

export default function SearchInstructor() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="dsp-student-search-page">
      <header className="dsp-student-search-page__header">
        <div>
          <span className="dsp-student-search-page__eyebrow"><Search size={14} /> Student marketplace</span>
          <h1>Find an instructor</h1>
          <p>Compare verified instructors, availability, and lesson prices near you.</p>
        </div>
        <span className="dsp-student-search-page__header-note">Choose a profile to view real availability</span>
      </header>
      <Box className="dsp-student-search-page__content">
        <InstructorInfo studentMode />
      </Box>
    </div>
  );
}
