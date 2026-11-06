const LoadingCard: React.FC = () => (
  <div className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-center space-x-3">
        <div className="w-12 h-12 rounded-full bg-gray-200" />
        <div>
          <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
          <div className="h-3 bg-gray-200 rounded w-32" />
        </div>
      </div>
      <div className="w-6 h-6 bg-gray-200 rounded-full" />
    </div>
    <div className="space-y-2">
      <div className="h-3 bg-gray-200 rounded w-20" />
      <div className="h-3 bg-gray-200 rounded w-16" />
      <div className="h-2 bg-gray-200 rounded-full" />
    </div>
  </div>
);

export default LoadingCard;
