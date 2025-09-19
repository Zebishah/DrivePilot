import React, { useState } from "react";
import { Star } from "lucide-react";

interface SimpleHalfStarRatingProps {
  initialRating?: number;
  onRatingChange?: (rating: number) => void;
}

export const SimpleHalfStarRating: React.FC<SimpleHalfStarRatingProps> = ({
  initialRating = 0,
  onRatingChange,
}) => {
  const [rating, setRating] = useState(initialRating);
  const [hoveredRating, setHoveredRating] = useState(0);

  const handleStarClick = (starIndex: number, isHalf: boolean = false) => {
    const newRating = isHalf ? starIndex - 0.5 : starIndex;
    setRating(newRating);
    onRatingChange?.(newRating);
  };

  const renderStar = (starIndex: number) => {
    const currentRating = hoveredRating || rating;
    const isFull = starIndex <= currentRating;
    const isHalf = starIndex - 0.5 === currentRating;

    return (
      <div key={starIndex} className="relative inline-block">
        {/* Left half button (for 0.5 rating) */}
        <button
          type="button"
          onClick={() => handleStarClick(starIndex, true)}
          onMouseEnter={() => setHoveredRating(starIndex - 0.5)}
          onMouseLeave={() => setHoveredRating(0)}
          className="absolute left-0 top-0 w-1/2 h-full z-10 cursor-pointer"
          aria-label={`Rate ${starIndex - 0.5} stars`}
        />

        {/* Right half button (for full rating) */}
        <button
          type="button"
          onClick={() => handleStarClick(starIndex, false)}
          onMouseEnter={() => setHoveredRating(starIndex)}
          onMouseLeave={() => setHoveredRating(0)}
          className="absolute right-0 top-0 w-1/2 h-full z-10 cursor-pointer"
          aria-label={`Rate ${starIndex} stars`}
        />

        {/* Background star */}
        <Star size={32} className="text-gray-300" />

        {/* Filled star overlay */}
        <div
          className="absolute top-0 left-0 overflow-hidden transition-all duration-200"
          style={{
            width: isFull ? "100%" : isHalf ? "50%" : "0%",
          }}
        >
          <Star size={32} className="text-yellow-400 fill-yellow-400" />
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center">
      <div className="flex justify-center space-x-2">
        {[1, 2, 3, 4, 5].map((star) => renderStar(star))}
      </div>
      {rating > 0 && (
        <p className="text-sm text-gray-600 mt-2">
          You rated {rating} out of 5 stars
        </p>
      )}
    </div>
  );
};
