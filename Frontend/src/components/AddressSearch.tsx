import React, { useState, useCallback, useRef } from 'react';
import {
    Box,
    Typography,
    TextField,
    Paper,
    List,
    ListItem
} from '@mui/material';
import axios from 'axios';

interface AddressSearchProps {
    onCoordinatesChange: (coordinates: {
        type: string,
        coordinates: [number, number]
    }) => void;
}

const AddressSearch: React.FC<AddressSearchProps> = ({ onCoordinatesChange }) => {
    const [inputValue, setInputValue] = useState('');
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Use useRef to store and manage debounce timer
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Native debounce function
    const debouncedFetchLocations = useCallback((value: string) => {
        // Clear previous timer
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        // Set new timer
        debounceTimerRef.current = setTimeout(async () => {
            if (!value || value.length < 3) {
                setSuggestions([]);
                return;
            }
            try {
                const response = await axios.get(
                    `https://nominatim.openstreetmap.org/search`,
                    {
                        params: {
                            q: value,
                            format: "json",
                            addressdetails: 1,
                            limit: 5,
                        },
                    }
                );
                setSuggestions(response.data);
                setShowSuggestions(true);
            } catch (error) {
                console.error("Error fetching locations:", error);
                setSuggestions([]);
            }
        }, 500); // 500ms debounce
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setInputValue(value);
        debouncedFetchLocations(value);
    };

    const handleSelectSuggestion = (address: any) => {
        setInputValue(address.display_name);
        setShowSuggestions(false);

        // Update coordinates: simply return an array [lat, lng]
        if (address?.lat && address?.lon) {
            const coordinates = [
                Number.parseFloat(address.lon),
                Number.parseFloat(address.lat)
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
        <Box sx={{ position: "relative" }}>
            <Typography sx={{ fontFamily: 'Poppins, sans-serif', mb: 1 }}>
                Address
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
                        boxShadow: 2
                    }}
                >
                    <List>
                        {suggestions.map((place) => (
                            <ListItem
                                button
                                key={place.place_id}
                                onClick={() => handleSelectSuggestion(place)}
                                sx={{
                                    '&:hover': {
                                        backgroundColor: '#f0f0f0'
                                    }
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