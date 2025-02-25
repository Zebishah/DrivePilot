import React, { useState, useEffect } from "react";

const ResponsiveImage = ({ src, alt }) => {
  const originalWidth = 1440;
  const originalHeight = 657;
  const aspectRatio = originalHeight / originalWidth;

  const getProportionalHeight = () => {
    return Math.round(window.innerWidth * aspectRatio);
  };

  const [height, setHeight] = useState(getProportionalHeight());

  useEffect(() => {
    const handleResize = () => {
      setHeight(getProportionalHeight());
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <img
      src={src}
      alt={alt}
      style={{ width: "100%", height: `${height}px`, objectFit: "cover" }}
    />
  );
};

export default ResponsiveImage;
