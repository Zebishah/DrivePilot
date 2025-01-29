const getProportionalHeight1 = (width) => {
    const originalWidth = 1440;
    const originalHeight = 863;
    const aspectRatio = originalHeight / originalWidth;
    return Math.round(width * aspectRatio);
  };
  
  export default getProportionalHeight1;