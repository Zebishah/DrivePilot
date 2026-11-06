interface StudentAvatarProps {
  student: {
    profileImage?: string;
    firstName: string;
    lastName: string;
  };
  size?: "sm" | "md" | "lg";
}

export const StudentAvatar: React.FC<StudentAvatarProps> = ({
  student,
  size = "md",
}) => {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-12 h-12",
  };

  return (
    <div
      className={`${sizeClasses[size]} rounded-full overflow-hidden bg-gray-300 flex items-center justify-center`}
    >
      {student.profileImage ? (
        <img
          src={student.profileImage}
          alt="Profile"
          className="w-full h-full object-cover"
        />
      ) : (
        <span className="text-gray-600 font-medium text-sm">
          {student.firstName.charAt(0)}
          {student.lastName.charAt(0)}
        </span>
      )}
    </div>
  );
};
