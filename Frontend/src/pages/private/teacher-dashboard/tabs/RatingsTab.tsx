import React from "react";
import InstructorReviews from "../../../../components/StudentComponents/InstructorReviews";
import { useAuth } from "../../../../context/AuthContext";

export const RatingsTab: React.FC = () => {
  const { user } = useAuth();
  return (
    <>
      {" "}
      <InstructorReviews instructorId={user?.id || ""} activeTab={2} />{" "}
    </>
  );
};
