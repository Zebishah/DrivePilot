interface LoadingSpinnerProps {
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  className = "",
}) => (
  <div className={`animate-pulse ${className}`}>
    <div className="bg-gray-100 rounded-lg p-8 mb-8">
      <div className="h-6 bg-gray-300 rounded w-1/4 mb-6"></div>
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-gray-300 rounded-full"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-300 rounded w-1/4"></div>
              <div className="h-4 bg-gray-300 rounded w-1/6"></div>
            </div>
            <div className="h-8 bg-gray-300 rounded w-24"></div>
          </div>
        ))}
      </div>
    </div>
  </div>
);
