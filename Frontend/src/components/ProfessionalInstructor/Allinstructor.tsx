
import React from 'react';
import { Container } from '@mui/material';
import InstructorInfo from './InstructorInfo';

const AllInstructor: React.FC = () => {
  return (
    <div>
      <div className="bg-[url('/images/map.png')] bg-cover bg-center h-[650px] flex items-center justify-center">
        <Container>
          <div className="w-full flex flex-col items-center justify-center text-center">
            <div className="w-full sm:w-[60%]">
              <h1 className="text-white text-5xl font-bold mb-6">
                Professional Instructors
              </h1>
              <p className="text-white font-poppins lg:text-lg xl:text-xl">
                Lorem ipsum dolor sit amet consectetur. Eu faucibus felis fermentum nunc sit. Suspendisse vivamus ipsum vestibulum morbi tortor
              </p>
            </div>
          </div>
        </Container>
      </div>
    
      <InstructorInfo />
    </div>
  );
};

export default AllInstructor;