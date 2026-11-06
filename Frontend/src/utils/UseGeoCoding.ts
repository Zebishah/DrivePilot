import { useState, useEffect } from "react";
import { LocationCoordinates } from "../types/InstructorAnalytics";

export const useGeocoding = (address: string) => {
  const [coordinates, setCoordinates] = useState<LocationCoordinates | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const geocodeAddress = async () => {
      if (!address) return;

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`
        );
        const data = await response.json();

        if (data && data.length > 0) {
          setCoordinates({
            lat: parseFloat(data[0].lat),
            lng: parseFloat(data[0].lon),
          });
        } else {
          setError("Location not found");
        }
      } catch (err) {
        console.error("Error geocoding address:", err);
        setError("Failed to geocode address");
      } finally {
        setLoading(false);
      }
    };

    geocodeAddress();
  }, [address]);

  return { coordinates, loading, error };
};
