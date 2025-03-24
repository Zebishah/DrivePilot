import React from 'react';
import { Grid, Paper, Typography, Box } from '@mui/material';

interface Document {
  documentType: string;
  documentUrl: string;
}

interface DocumentsTabProps {
  documents: Document[];
}

export const DocumentsTab: React.FC<DocumentsTabProps> = ({ documents }) => {
  if (!documents || documents.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body1" color="text.secondary">
          No documents uploaded yet
        </Typography>
      </Box>
    );
  }

  return (
    <Grid container spacing={3}>
      {documents.map((doc: Document, index: number) => (
        <Grid item xs={12} sm={6} md={3} key={index}>
          <Paper sx={{ p: 2, textAlign: "center" }}>
            <img
              src={doc.documentUrl}
              alt={doc.documentType}
              style={{
                width: "100%",
                height: "150px",
                objectFit: "cover",
                borderRadius: "8px",
              }}
            />
            <Typography variant="body1" sx={{ mt: 1 }}>
              {doc.documentType}
            </Typography>
          </Paper>
        </Grid>
      ))}
    </Grid>
  );
}; 