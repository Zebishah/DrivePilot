import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect } from "react";

// Geneva, Switzerland coordinates
const position: [number, number] = [46.2044, 6.1432];

function SetView({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [map, center, zoom]);
  return null;
}

const MapComponent: React.FC = () => {
  return (
    <MapContainer className="h-[400px] w-full ">
      <SetView center={position} zoom={13} />
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Marker position={position}>
        <Popup>Geneva, Switzerland</Popup>
      </Marker>
    </MapContainer>
  );
};

export default MapComponent;
