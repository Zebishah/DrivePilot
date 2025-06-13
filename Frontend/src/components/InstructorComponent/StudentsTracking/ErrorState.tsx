import React from "react";

interface ErrorStateProps {
  error: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ error }) => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="text-red-500 text-xl font-semibold mb-2">
          Error Loading Dashboard
        </div>
        <div className="text-gray-600">{error}</div>
      </div>
    </div>
  );
};
