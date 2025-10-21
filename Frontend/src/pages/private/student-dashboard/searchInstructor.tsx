import { useState } from "react";
import { Box, TextField, InputAdornment, Typography } from "@mui/material";
import { Search as SearchIcon } from "@mui/icons-material";
import InstructorInfo from "../../../components/ProfessionalInstructor/InstructorInfo";
import { useAuth } from "../../../context/AuthContext";
import { Navigate } from "react-router-dom";

export default function SearchInstructor() {
  const { isAuthenticated } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="bg-[#f5f7fa] min-h-screen p-4">
      <Box className="w-[80%] mx-auto">
        <InstructorInfo />
      </Box>
    </div>
  );
}
