interface EmptyStateProps {
  title: string;
  description: string;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  className = "",
}) => (
  <div className={`text-center py-8 ${className}`}>
    <p className="text-gray-500 text-lg">{title}</p>
    <p className="text-gray-400 text-sm mt-2">{description}</p>
  </div>
);
