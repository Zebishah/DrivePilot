import type React from 'react';
import { useParams } from 'react-router-dom';
import ProfileSummary from '../../components/InstructorComponent/PostSummary';

const OurInstructor: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <div>
      <ProfileSummary />
    </div>
  );
};

export default OurInstructor;