import { useState } from 'react';
import { Box, TextField, InputAdornment, Typography } from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import InstructorInfo from '../../../components/ProfessionalInstructor/InstructorInfo';
import { useAuth } from '../../../context/AuthContext';
import { Navigate } from 'react-router-dom';

export default function SearchInstructor() {
  const { isAuthenticated } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="bg-[#f5f7fa] min-h-screen p-4">
      <Box className="max-w-screen-xl mx-auto">
        <Typography variant="h4" className="mb-6 font-bold text-gray-800">
          Find Your Instructor
        </Typography>
        
        <Box className="mb-8">
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Search instructors by name, location, or expertise..."
            value={searchQuery}
            onChange={handleSearch}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
              sx: {
                borderRadius: '12px',
                backgroundColor: 'white',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#e2e8f0',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#5FC2D3',
                },
              },
            }}
          />
        </Box>

        <InstructorInfo />
      </Box>
    </div>
  );
}
