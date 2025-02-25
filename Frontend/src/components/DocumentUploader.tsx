import type React from 'react';
import { useState, useRef, useEffect } from 'react';
import { Paper, Typography, Button, Box, IconButton } from '@mui/material';
import { Upload, Delete } from '@mui/icons-material';

// Define the type for a single document
type Document = {
    file: File; // The actual file object
    name: string; // Name of the file
    url: string; // URL for preview (created using URL.createObjectURL)
    type: string; // MIME type of the file (e.g., 'image/jpeg', 'application/pdf')
};

// Define the props for the DocumentUploader component
type DocumentUploaderProps = {
    onFileUpload: (file: File | null) => void; // Callback to return the file to the parent
    selectedFile: File | null; // Accept file from parent
    setSelectedFile: (file: File | null) => void; // Callback to return the file to the parent
};

const DocumentUploader: React.FC<DocumentUploaderProps> = ({ onFileUpload, selectedFile, setSelectedFile }) => {
    const [document, setDocument] = useState<Document | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        if (selectedFile) {
            const newDocument = {
                file: selectedFile,
                name: selectedFile.name,
                url: URL.createObjectURL(selectedFile),
                type: selectedFile.type,
            };
            setDocument(newDocument);
        } else {
            setDocument(null);
        }
    }, [selectedFile]);

    // Handle file upload
    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const newDocument = {
                file,
                name: file.name,
                url: URL.createObjectURL(file),
                type: file.type,
            };
            setDocument(newDocument);
            onFileUpload(file); // Return the file to the parent
        }
    };

    // Handle deselect (remove) the document
    const handleDeselect = () => {
        setDocument(null);
        setSelectedFile(null)
        onFileUpload(null); // Notify the parent that the file is removed

        // Reset the file input value
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    return (
        <Paper
            variant="outlined"
            sx={{
                p: 3,
                border: '2px dashed',
                borderColor: 'primary.main',
                textAlign: 'center',
                backgroundColor: '#f5f5f5',
            }}
        >
            <Typography variant="body1" sx={{ mb: 2 }}>
                Please upload your document
            </Typography>
            <Button
                component="label"
                variant="contained"
                startIcon={<Upload />}
                sx={{ mb: 2 }}
            >
                Upload Document
                <input
                    ref={fileInputRef} // Reference the input
                    type="file"
                    hidden
                    onChange={handleFileUpload}
                    accept=".pdf,.jpg,.jpeg,.png"
                    multiple={false} // Allow only single file upload
                />
            </Button>
            {document && (
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mb: 2,
                        p: 2,
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        backgroundColor: 'background.paper',
                    }}
                >
                    {/* Preview Section */}
                    {document.type.startsWith('image/') ? (
                        <img
                            src={document.url}
                            alt={document.name}
                            style={{
                                maxWidth: '100%',
                                maxHeight: '200px',
                                borderRadius: '4px',
                                marginBottom: '16px',
                            }}
                        />
                    ) : document.type === 'application/pdf' ? (
                        <iframe
                            src={document.url}
                            title={document.name}
                            style={{
                                width: '100%',
                                height: '200px',
                                border: 'none',
                                borderRadius: '4px',
                                marginBottom: '16px',
                            }}
                        />
                    ) : (
                        <Typography variant="body2" sx={{ mb: 2 }}>
                            Preview not available for this file type.
                        </Typography>
                    )}

                    {/* File Info and Actions */}
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            width: '100%',
                        }}
                    >
                        <Typography variant="body2">{document.name}</Typography>
                        <IconButton onClick={handleDeselect}>
                            <Delete />
                        </IconButton>
                    </Box>
                </Box>
            )}
        </Paper>
    );
};

export default DocumentUploader;
