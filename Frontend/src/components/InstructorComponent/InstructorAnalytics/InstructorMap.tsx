import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { LocationCoordinates } from "../../../types/InstructorAnalytics";

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface InstructorMapProps {
  address: string;
  className?: string;
}

export const InstructorMap: React.FC<InstructorMapProps> = ({
  address,
  className,
}) => {
  const [coordinates, setCoordinates] = useState<LocationCoordinates | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const geocodeAddress = async () => {
      setError(null);

      // If there is no address yet, still show a default map
      if (!address) {
        setCoordinates({
          lat: -12.0464,
          lng: -77.0428,
        });
        return;
      }

      setLoading(true);

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
          // Default to Lima coordinates as shown in the image
          setCoordinates({
            lat: -12.0464,
            lng: -77.0428,
          });
        }
      } catch (err) {
        console.error("Error geocoding address:", err);
        setError("Failed to load location");
        // Default to Lima coordinates
        setCoordinates({
          lat: -12.0464,
          lng: -77.0428,
        });
      } finally {
        setLoading(false);
      }
    };

    geocodeAddress();
  }, [address]);

  return (
    <div
      className={`h-80 bg-white rounded-2xl overflow-hidden shadow-sm ${className}`}
    >
      <div className="h-full relative">
        <MapContainer
          center={[
            coordinates?.lat ?? -12.0464,
            coordinates?.lng ?? -77.0428,
          ]}
          zoom={13}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker
            position={[
              coordinates?.lat ?? -12.0464,
              coordinates?.lng ?? -77.0428,
            ]}
          />
        </MapContainer>

        {/* Additional location markers as shown in the image */}
        <div className="absolute top-12 right-8 bg-white rounded-full w-6 h-6 flex items-center justify-center shadow-md z-[1000]">
          <span className="text-xs font-bold">10</span>
        </div>
        <div className="absolute bottom-12 right-12 bg-white rounded-full w-6 h-6 flex items-center justify-center shadow-md z-[1000]">
          <span className="text-xs font-bold">10</span>
        </div>
      </div>
    </div>
  );
};
