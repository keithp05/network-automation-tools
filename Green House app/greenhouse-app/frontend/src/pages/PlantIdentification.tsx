import React, { useState, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  CardMedia,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  CircularProgress,
  Chip,
  Alert,
  List,
  ListItem,
  ListItemText,
  LinearProgress,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Stepper,
  Step,
  StepLabel,
} from '@mui/material';
import {
  PhotoCamera,
  CloudUpload,
  CheckCircle,
  Warning,
  ExpandMore,
  LocalFlorist,
  HealthAndSafety,
  Info,
  Close,
} from '@mui/icons-material';
import axios from 'axios';
import CameraCapture from '../components/CameraCapture';

interface IdentificationResult {
  plant_name: string;
  probability: number;
  scientific_name: string;
  common_names: string[];
  wiki_description?: string;
  similar_images?: Array<{
    url: string;
    similarity: number;
  }>;
}

interface HealthAssessment {
  is_healthy: boolean;
  health_probability: number;
  diseases: Array<{
    name: string;
    probability: number;
    description: string;
    treatment: {
      chemical: string[];
      biological: string[];
      prevention: string[];
    };
  }>;
}

export default function PlantIdentification() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [identificationResults, setIdentificationResults] = useState<IdentificationResult[]>([]);
  const [healthResults, setHealthResults] = useState<HealthAssessment | null>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [showCareInfo, setShowCareInfo] = useState(false);
  const [selectedPlant, setSelectedPlant] = useState<IdentificationResult | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const steps = ['Upload Image', 'Identify Plant', 'Health Check', 'Care Instructions'];

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  const processSelectedFile = (file: File) => {
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setSelectedImage(e.target?.result as string);
      setActiveStep(1);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedImage(e.target?.result as string);
        setActiveStep(1);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const identifyPlant = async () => {
    if (!selectedFile) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('image', selectedFile);
    formData.append('includeHealth', 'true');

    try {
      const response = await axios.post('/api/plant-identification/identify', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.suggestions) {
        setIdentificationResults(response.data.suggestions);
        setSelectedPlant(response.data.suggestions[0]);
      }

      if (response.data.health_assessment) {
        setHealthResults(response.data.health_assessment);
      }

      setActiveStep(2);
    } catch (error) {
      console.error('Identification error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPlantCareInfo = async (scientificName: string) => {
    try {
      const response = await axios.get(`/api/plant-identification/plant-care/${scientificName}`);
      // Handle care info display
      setShowCareInfo(true);
      setActiveStep(3);
    } catch (error) {
      console.error('Error fetching care info:', error);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        AI Plant Identification
      </Typography>

      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper
            sx={{
              p: 3,
              minHeight: 400,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: selectedImage ? 'transparent' : '#f5f5f5',
              border: '2px dashed #ccc',
              cursor: 'pointer',
              position: 'relative',
            }}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => fileInputRef.current?.click()}
          >
            {selectedImage ? (
              <>
                <img
                  src={selectedImage}
                  alt="Selected plant"
                  style={{
                    maxWidth: '100%',
                    maxHeight: 400,
                    objectFit: 'contain',
                  }}
                />
                <IconButton
                  sx={{ position: 'absolute', top: 8, right: 8 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedImage(null);
                    setSelectedFile(null);
                    setIdentificationResults([]);
                    setHealthResults(null);
                    setActiveStep(0);
                  }}
                >
                  <Close />
                </IconButton>
              </>
            ) : (
              <>
                <CloudUpload sx={{ fontSize: 64, color: '#ccc', mb: 2 }} />
                <Typography variant="h6" color="textSecondary">
                  Drag and drop an image here
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  or click to select
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                  <Button
                    variant="contained"
                    startIcon={<PhotoCamera />}
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                  >
                    Choose Image
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<PhotoCamera />}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCameraOpen(true);
                    }}
                  >
                    Take Photo
                  </Button>
                </Box>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              style={{ display: 'none' }}
            />
          </Paper>

          {selectedImage && !loading && identificationResults.length === 0 && (
            <Button
              variant="contained"
              fullWidth
              size="large"
              startIcon={<LocalFlorist />}
              onClick={identifyPlant}
              sx={{ mt: 2 }}
            >
              Identify Plant
            </Button>
          )}

          {loading && (
            <Box display="flex" justifyContent="center" mt={2}>
              <CircularProgress />
            </Box>
          )}
        </Grid>

        <Grid item xs={12} md={6}>
          {identificationResults.length > 0 && (
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Identification Results
              </Typography>
              <List>
                {identificationResults.slice(0, 3).map((result, index) => (
                  <Card key={index} sx={{ mb: 2 }}>
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="start">
                        <Box>
                          <Typography variant="h6">
                            {result.common_names?.[0] || result.plant_name}
                          </Typography>
                          <Typography variant="body2" color="textSecondary" gutterBottom>
                            {result.scientific_name}
                          </Typography>
                          {result.common_names && result.common_names.length > 1 && (
                            <Box mt={1}>
                              {result.common_names.slice(1, 4).map((name, i) => (
                                <Chip
                                  key={i}
                                  label={name}
                                  size="small"
                                  sx={{ mr: 0.5, mb: 0.5 }}
                                />
                              ))}
                            </Box>
                          )}
                        </Box>
                        <Box>
                          <CircularProgress
                            variant="determinate"
                            value={result.probability * 100}
                            size={60}
                          />
                          <Typography
                            variant="caption"
                            component="div"
                            color="textSecondary"
                            align="center"
                          >
                            {`${Math.round(result.probability * 100)}%`}
                          </Typography>
                        </Box>
                      </Box>
                      {index === 0 && (
                        <Button
                          size="small"
                          onClick={() => getPlantCareInfo(result.scientific_name)}
                          sx={{ mt: 2 }}
                        >
                          View Care Instructions
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </List>
            </Paper>
          )}

          {healthResults && (
            <Paper sx={{ p: 3, mt: 2 }}>
              <Typography variant="h6" gutterBottom>
                <HealthAndSafety sx={{ mr: 1, verticalAlign: 'middle' }} />
                Plant Health Assessment
              </Typography>
              
              <Alert
                severity={healthResults.is_healthy ? 'success' : 'warning'}
                sx={{ mb: 2 }}
              >
                {healthResults.is_healthy
                  ? `Plant appears healthy (${Math.round(healthResults.health_probability * 100)}% confidence)`
                  : `Health issues detected (${Math.round((1 - healthResults.health_probability) * 100)}% confidence)`}
              </Alert>

              {healthResults.diseases && healthResults.diseases.length > 0 && (
                <Box>
                  <Typography variant="subtitle1" gutterBottom>
                    Detected Issues:
                  </Typography>
                  {healthResults.diseases.map((disease, index) => (
                    <Accordion key={index}>
                      <AccordionSummary expandIcon={<ExpandMore />}>
                        <Typography>
                          {disease.name} ({Math.round(disease.probability * 100)}%)
                        </Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Typography variant="body2" paragraph>
                          {disease.description}
                        </Typography>
                        <Typography variant="subtitle2">Treatment Options:</Typography>
                        <Box ml={2}>
                          <Typography variant="body2">
                            <strong>Chemical:</strong> {disease.treatment.chemical.join(', ')}
                          </Typography>
                          <Typography variant="body2">
                            <strong>Biological:</strong> {disease.treatment.biological.join(', ')}
                          </Typography>
                          <Typography variant="body2">
                            <strong>Prevention:</strong> {disease.treatment.prevention.join(', ')}
                          </Typography>
                        </Box>
                      </AccordionDetails>
                    </Accordion>
                  ))}
                </Box>
              )}
            </Paper>
          )}
        </Grid>
      </Grid>

      <CameraCapture
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onImageCapture={processSelectedFile}
      />
    </Box>
  );
}