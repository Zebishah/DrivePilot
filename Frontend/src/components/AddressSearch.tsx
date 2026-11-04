import React, { useState, useCallback, useRef } from "react";
import {
  Box,
  Typography,
  TextField,
  Paper,
  List,
  ListItem,
} from "@mui/material";
import axios from "axios";
import _ from "lodash";

interface AddressSearchProps {
  onCoordinatesChange: (coordinates: {
    type: string;
    coordinates: [number, number];
  }) => void;
}

const AddressSearch: React.FC<AddressSearchProps> = ({
  onCoordinatesChange,
}) => {
  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  // Use useRef to store and manage debounce timer
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastRequestTime = useRef(0);

  // Native debounce function
  const debouncedFetchLocations = useRef(
    _.debounce(async (inputValue) => {
      if (!inputValue) {
        setSuggestions([]);
        return;
      }

      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;
      const requestId = Date.now();
      lastRequestTime.current = requestId;

      try {
        const response = await axios.get(
          "https://nominatim.openstreetmap.org/search",
          {
            params: {
              q: inputValue,
              format: "json",
              addressdetails: 1,
              limit: 10,
              countrycodes: "ch", // Restrict to Switzerland with country code "ch"
            },
            signal: controller.signal,
          }
        );

        // Only update if this is the latest request
        if (lastRequestTime.current === requestId) {
          // Double-check that all results are from Switzerland
          interface OpenStreetMapResult {
            address: {
              country_code?: string;
            };
          }

          const swissLocations = response.data.filter(
            (place: OpenStreetMapResult) =>
              place.address && place.address.country_code === "ch"
          );
          setSuggestions(swissLocations);
          setShowSuggestions(true);
        }
      } catch (error) {
        if (!axios.isCancel(error)) {
          console.error("Error fetching locations:", error);
          setSuggestions([]);
        }
      }
    }, 300) // 300ms debounce time
  ).current;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);

    // If input is cleared, reset coordinates
    if (!value.trim() && onCoordinatesChange) {
      onCoordinatesChange(null);
    }

    debouncedFetchLocations(value);
  };
  const handleSelectSuggestion = (address: any) => {
    setInputValue(address.display_name);
    setShowSuggestions(false);

    // Update coordinates: simply return an array [lat, lng]
    if (address?.lat && address?.lon) {
      const coordinates = [
        Number.parseFloat(address.lon),
        Number.parseFloat(address.lat),
      ];
      onCoordinatesChange(coordinates);
    }
  };

  // Cleanup timer on unmount
  React.useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return (
    <Box sx={{ position: "relative" }} className="unstyled">
      <Typography sx={{ fontFamily: "Poppins, sans-serif", mb: 1 }}>
        My Address
      </Typography>
      <TextField
        fullWidth
        variant="outlined"
        className="rounded-lg"
        placeholder="Enter Address"
        value={inputValue}
        onChange={handleInputChange}
        onFocus={() => {
          if (suggestions.length > 0) {
            setShowSuggestions(true);
          }
        }}
        sx={{
          "& .MuiOutlinedInput-input": {
            // Add your custom styles here
            padding: "14px 8px !important",
            fontSize: "16px",
            fontFamily: "Poppins, sans-serif",
            // Add any other styles you need
          },
        }}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
      />
      {showSuggestions && suggestions.length > 0 && (
        <Paper
          sx={{
            position: "absolute",
            width: "100%",
            zIndex: 10,
            mt: 1,
            maxHeight: 200,
            overflowY: "auto",
            borderRadius: 1,
            border: "1px solid var(--ws-border, #c4c4c4)",
            boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.1)",
          }}
        >
          <List>
            {suggestions.map((place) => (
              <ListItem
                key={place.place_id}
                onClick={() => handleSelectSuggestion(place)}
                sx={{
                  fontSize: "16px",
                  paddingY: "12px",
                  paddingX: "14px",
                  fontFamily: '"Roboto","Helvetica","Arial",sans-serif',
                  lineHeight: "1.4375em",
                  "&:hover": {
                    backgroundColor: "var(--ws-surface, #f0f0f0)",
                  },
                }}
              >
                {place.display_name}
              </ListItem>
            ))}
          </List>
        </Paper>
      )}
    </Box>
  );
};

export default AddressSearch;
