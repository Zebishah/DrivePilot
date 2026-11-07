import React from "react";
import { Typography, Button } from "@mui/material";
import { GraduationCap, UsersRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@apollo/client";
import { SELECT_ROLE_MUTATION } from "../../../graphql/mutations/auth";
import { useAuth } from "../../../context/AuthContext";
import { UserRole } from "../../../types/auth";
import toast from "react-hot-toast";
import AuthLayout from "../../../layouts/AuthLayout";

interface RoleCardProps {
  title: string;
  description: string;
  icon: React.ElementType;
  selected: boolean;
  onClick: () => void;
}

const RoleCard: React.FC<RoleCardProps> = ({
  title,
  description,
  icon: Icon,
  selected,
  onClick,
}) => {
  return (
    <button type="button" className={`dsp-onboarding-role ${selected ? "is-selected" : ""}`} onClick={onClick} aria-pressed={selected}>
      <span className="dsp-onboarding-role__icon"><Icon size={28} /></span>
      <strong>{title}</strong>
      <span>{description}</span>
      {selected && <span className="dsp-onboarding-role__check" aria-hidden="true">✓</span>}
    </button>
  );
};

const RoleSelection: React.FC = () => {
  const [selectedRole, setSelectedRole] = React.useState<
    "student" | "instructor" | null
  >(null);
  const navigate = useNavigate();
  const { login } = useAuth();

  const [selectRole, { loading }] = useMutation(SELECT_ROLE_MUTATION, {
    onCompleted: (data) => {
      login(data.selectRole);

      if (data.selectRole.user.role === UserRole.Student) {
        navigate("/onboarding/student-profile");
      } else if (data.selectRole.user.role === UserRole.Instructor) {
        navigate("/onboarding/instructor-profile");
      }
      toast.success("Role Selected , Please complete Profile Setup");
    },
    onError: (error) => {
      toast.error(`Role selection error: ${error?.message}`);
    },
  });

  const handleContinue = async () => {
    if (!selectedRole) return;

    try {
      await selectRole({
        variables: {
          role:
            selectedRole === "student" ? UserRole.Student : UserRole.Instructor,
        },
      });
    } catch (err) {
      // Error will be handled by onError callback
      console.error("Error selecting role:", err);
    }
  };

  return (
    <AuthLayout>
      <div className="dsp-onboarding-card">
        <span className="dsp-auth-eyebrow">CHOOSE YOUR WORKSPACE</span>
        <Typography component="h1">How will you use Drive Pilot?</Typography>
        <Typography className="dsp-onboarding-card__intro">Choose the workspace that matches your next step. You can complete your profile right after.</Typography>
        <div className="dsp-onboarding-roles">
          <RoleCard title="Student" description="Find instructors and book lessons" icon={GraduationCap} selected={selectedRole === "student"} onClick={() => setSelectedRole("student")} />
          <RoleCard title="Instructor" description="Teach, manage students, and grow" icon={UsersRound} selected={selectedRole === "instructor"} onClick={() => setSelectedRole("instructor")} />
        </div>
        <Button className="dsp-onboarding-continue" variant="contained" size="large" disabled={!selectedRole || loading} onClick={handleContinue}>{loading ? "Selecting..." : "Continue"}</Button>
      </div>
    </AuthLayout>
  );
};

export default RoleSelection;
