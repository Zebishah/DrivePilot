import React from "react";

export const LoadingState: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="animate-pulse">
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex items-center space-x-4">
              <div className="w-20 h-20 bg-gray-300 rounded-full"></div>
              <div className="flex-1">
                <div className="h-6 bg-gray-300 rounded w-1/3 mb-2"></div>
                <div className="h-4 bg-gray-300 rounded w-1/4"></div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm p-6 h-96 bg-gray-300"></div>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-6 h-96 bg-gray-300"></div>
          </div>
        </div>
      </div>
    </div>
  );
};
