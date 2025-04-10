import { Box, Typography } from '@mui/material';
import InstructorInfo from '../../../components/ProfessionalInstructor/InstructorInfo';

export default function StudentInstructorInfo() {
  return (
    <div className="bg-[#f5f7fa] min-h-screen p-4">
      <Box className="max-w-screen-xl mx-auto">
        <Typography variant="h4" className="mb-6 font-bold text-gray-800">
          Professional Instructors
        </Typography>
        <InstructorInfo />
      </Box>
    </div>
  );
} 