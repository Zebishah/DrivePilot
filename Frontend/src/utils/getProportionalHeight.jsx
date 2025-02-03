const getProportionalHeight = (width) => {
  const originalWidth = 1440;
  const originalHeight = 657;
  const aspectRatio = originalHeight / originalWidth;
  return Math.round(width * aspectRatio);
};

export default getProportionalHeight;
56


  