// mapUtils.js
/**
 * Computes the map center and markers.
 *
 * @param {Array<number> | null} userCoordinates - The user's coordinates in [latitude, longitude] format (or null).
 * @param {Array<Object>} instructors - Array of instructor objects with coordinates.
 * @returns {Object} An object containing the mapCenter and markers.
 */
export const getMapCenterAndMarkers = (userCoordinates, instructors) => {
  // Create markers by reversing each instructor's coordinates from [longitude, latitude] to [latitude, longitude]
  const markers = instructors
    .map((instructor) => {
      const coord = instructor.coordinates?.coordinates;
      if (coord) {
        const [lng, lat] = coord;
        return {
          id: instructor._id,
          position: [lat, lng],
        };
      }
      return null;
    })
    .filter(Boolean);

  // Determine the map center:
  // 1. If userCoordinates exists and is not the default [0, 0], use it.
  // 2. Otherwise, if markers exist, calculate the average position.
  // 3. Else, fall back to [0, 0].
  let mapCenter;
  if (userCoordinates && userCoordinates[0] !== 0) {
    mapCenter = userCoordinates;
  } else if (markers.length > 0) {
    const total = markers.reduce(
      (acc, marker) => {
        return [
          acc[0] + marker.position[0], // latitude
          acc[1] + marker.position[1], // longitude
        ];
      },
      [0, 0]
    );
    mapCenter = [total[0] / markers.length, total[1] / markers.length];
  } else {
    mapCenter = [0, 0];
  }

  return { mapCenter, markers };
};
