
import React from 'react';

import InstructorInfo from './InstructorInfo';
import Banner4 from '../public/Banner4';

const AllInstructor: React.FC = () => {
  return (
    <div>
      <Banner4
        header={" Professional Instructors"}
        paragraph={
          "Lorem ipsum dolor sit amet consectetur. Eu faucibus felis fermentum nunc sit. Suspendisse vivamus ipsum vestibulum morbi tortor"
        }
      />
      <InstructorInfo />
    </div>
  );
};

export default AllInstructor;