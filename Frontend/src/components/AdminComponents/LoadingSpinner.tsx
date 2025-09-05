import React from "react";

export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="relative">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
        <div className="mt-4 text-center text-gray-600 font-medium">
          Loading analytics...
        </div>
      </div>
    </div>
  );
}
