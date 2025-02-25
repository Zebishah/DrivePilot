const getProportionalHeight1 = (width) => {
  const originalWidth = 2000;
  const originalHeight = 940;
  const aspectRatio = originalHeight / originalWidth;
  return Math.round(width * aspectRatio);
};

export default getProportionalHeight1;
