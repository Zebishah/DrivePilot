import ReactStars from "react-rating-stars-component";

interface StarRatingProps {
  rating: number;
  size?: number;
  isHalf?: boolean;
  edit?: boolean;
}

export const StarRating: React.FC<StarRatingProps> = ({
  rating,
  size = 20,
  isHalf = true, // Enable half stars by default
  edit = false,
}) => {
  const sizeMap = {
    sm: 16,
    md: 20,
    lg: 24,
  };

  const actualSize =
    typeof size === "number"
      ? size
      : sizeMap[size as keyof typeof sizeMap] || 20;

  return (
    <div className="flex items-center">
      <ReactStars
        count={5}
        value={rating}
        size={actualSize}
        isHalf={isHalf} // Use the prop instead of hardcoded true
        edit={edit}
        activeColor="#fbbf24" // Tailwind yellow-400
        color="#e5e7eb" // Tailwind gray-300
      />
      <span className="ml-2 text-xs font-medium text-gray-700">
        ({rating?.toFixed(1) || 0})
      </span>
    </div>
  );
};
