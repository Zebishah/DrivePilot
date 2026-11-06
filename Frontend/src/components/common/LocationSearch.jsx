import { useEffect, useState } from "react";
import { GeoSearchControl, OpenStreetMapProvider } from "leaflet-geosearch";
import { useMap } from "react-leaflet";

const LocationSearch = ({ onSelect }) => {
  const map = useMap();
  const [searchControl, setSearchControl] = useState(null);

  useEffect(() => {
    const provider = new OpenStreetMapProvider();
    const search = new GeoSearchControl({
      provider,
      style: "bar",
      autoComplete: true,
      autoCompleteDelay: 250,
      showMarker: false,
    });

    map.addControl(search);
    setSearchControl(search);

    return () => {
      map.removeControl(search);
    };
  }, [map]);

  useEffect(() => {
    if (!searchControl) return;

    const handleResult = (event) => {
      const { result } = event;
      if (result) {
        onSelect(result);
      }
    };

    map.on("geosearch/showlocation", handleResult);

    return () => {
      map.off("geosearch/showlocation", handleResult);
    };
  }, [searchControl, map, onSelect]);

  return null;
};

export default LocationSearch;
