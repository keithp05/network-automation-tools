import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Button,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  LinearProgress,
  Fab,
  Badge,
} from '@mui/material';
import {
  Add,
  CameraAlt,
  LocalFlorist,
  HealthAndSafety,
  TrendingUp,
  Warning,
  CheckCircle,
  Edit,
  Delete,
  Visibility,
} from '@mui/icons-material';
import { format } from 'date-fns';
import CameraCapture from '../components/CameraCapture';
import axios from 'axios';

interface Plant {
  id: string;
  name: string;
  scientificName: string;
  type: string;
  growthStage: string;
  plantedDate: Date;
  expectedHarvestDate: Date;
  zone: string;
  health: 'healthy' | 'warning' | 'critical';
  image?: string;
  companionPlants?: string[];
  requirements: {
    temperature: { min: number; max: number; optimal: number };
    humidity: { min: number; max: number; optimal: number };
    ph: { min: number; max: number; optimal: number };
    light: { intensity: number; hoursPerDay: number };
  };
}

export default function PlantManagement() {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStage, setFilterStage] = useState<string>('all');

  useEffect(() => {
    // Mock data for demo
    const mockPlants: Plant[] = [
      {
        id: '1',
        name: 'Cherry Tomato',
        scientificName: 'Solanum lycopersicum',
        type: 'vegetable',
        growthStage: 'flowering',
        plantedDate: new Date('2024-06-01'),
        expectedHarvestDate: new Date('2024-08-15'),
        zone: 'Zone A',
        health: 'healthy',
        companionPlants: ['basil', 'oregano'],
        requirements: {
          temperature: { min: 18, max: 28, optimal: 23 },
          humidity: { min: 50, max: 80, optimal: 65 },
          ph: { min: 6.0, max: 7.0, optimal: 6.5 },
          light: { intensity: 400, hoursPerDay: 14 },
        },
      },
      {
        id: '2',
        name: 'Lettuce',
        scientificName: 'Lactuca sativa',
        type: 'vegetable',
        growthStage: 'vegetative',
        plantedDate: new Date('2024-06-15'),
        expectedHarvestDate: new Date('2024-07-30'),
        zone: 'Zone B',
        health: 'warning',
        requirements: {
          temperature: { min: 15, max: 25, optimal: 20 },
          humidity: { min: 60, max: 85, optimal: 70 },
          ph: { min: 5.5, max: 6.5, optimal: 6.0 },
          light: { intensity: 300, hoursPerDay: 12 },
        },
      },
      {
        id: '3',
        name: 'Basil',
        scientificName: 'Ocimum basilicum',
        type: 'herb',
        growthStage: 'harvest',
        plantedDate: new Date('2024-05-01'),
        expectedHarvestDate: new Date('2024-07-01'),
        zone: 'Zone A',
        health: 'healthy',
        companionPlants: ['tomato'],
        requirements: {
          temperature: { min: 20, max: 30, optimal: 25 },
          humidity: { min: 40, max: 70, optimal: 55 },
          ph: { min: 6.0, max: 7.5, optimal: 6.8 },
          light: { intensity: 350, hoursPerDay: 16 },
        },
      },
    ];
    setPlants(mockPlants);
  }, []);

  const handleIdentifyPlant = async (imageFile: File) => {
    try {
      const formData = new FormData();
      formData.append('image', imageFile);
      formData.append('includeHealth', 'true');
      formData.append('zoneId', 'default-zone');

      const response = await axios.post('/api/plant-identification/identify', formData);
      
      if (response.data.created_plant) {
        setPlants(prev => [...prev, response.data.created_plant]);
      }
      
      setCameraOpen(false);
    } catch (error) {
      console.error('Plant identification error:', error);
    }
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'success';
      case 'warning': return 'warning';
      case 'critical': return 'error';
      default: return 'default';
    }
  };

  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'healthy': return <CheckCircle color="success" />;
      case 'warning': return <Warning color="warning" />;
      case 'critical': return <Warning color="error" />;
      default: return null;
    }
  };

  const getGrowthProgress = (stage: string) => {
    const stages = ['seed', 'germination', 'seedling', 'vegetative', 'flowering', 'harvest'];
    const index = stages.indexOf(stage);
    return ((index + 1) / stages.length) * 100;
  };

  const filteredPlants = plants.filter(plant => {
    return (filterType === 'all' || plant.type === filterType) &&
           (filterStage === 'all' || plant.growthStage === filterStage);
  });

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Plant Management</Typography>
        <Box display="flex" gap={2}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Type</InputLabel>
            <Select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              label="Type"
            >
              <MenuItem value="all">All Types</MenuItem>
              <MenuItem value="vegetable">Vegetables</MenuItem>
              <MenuItem value="herb">Herbs</MenuItem>
              <MenuItem value="fruit">Fruits</MenuItem>
              <MenuItem value="flower">Flowers</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Stage</InputLabel>
            <Select
              value={filterStage}
              onChange={(e) => setFilterStage(e.target.value)}
              label="Stage"
            >
              <MenuItem value="all">All Stages</MenuItem>
              <MenuItem value="seedling">Seedling</MenuItem>
              <MenuItem value="vegetative">Vegetative</MenuItem>
              <MenuItem value="flowering">Flowering</MenuItem>
              <MenuItem value="harvest">Ready to Harvest</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="outlined"
            onClick={() => setViewMode(viewMode === 'grid' ? 'table' : 'grid')}
          >
            {viewMode === 'grid' ? 'Table View' : 'Grid View'}
          </Button>
        </Box>
      </Box>

      {/* Stats Overview */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4">{plants.length}</Typography>
              <Typography color="textSecondary">Total Plants</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="success.main">
                {plants.filter(p => p.health === 'healthy').length}
              </Typography>
              <Typography color="textSecondary">Healthy</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="warning.main">
                {plants.filter(p => p.health === 'warning').length}
              </Typography>
              <Typography color="textSecondary">Need Attention</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="primary.main">
                {plants.filter(p => p.growthStage === 'harvest').length}
              </Typography>
              <Typography color="textSecondary">Ready to Harvest</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {viewMode === 'grid' ? (
        <Grid container spacing={3}>
          {filteredPlants.map((plant) => (
            <Grid item xs={12} sm={6} md={4} key={plant.id}>
              <Card>
                {plant.image && (
                  <CardMedia
                    component="img"
                    height="200"
                    image={plant.image}
                    alt={plant.name}
                  />
                )}
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                    <Box>
                      <Typography variant="h6">{plant.name}</Typography>
                      <Typography variant="body2" color="textSecondary">
                        {plant.scientificName}
                      </Typography>
                    </Box>
                    {getHealthIcon(plant.health)}
                  </Box>
                  
                  <Box mb={2}>
                    <Chip
                      label={plant.type}
                      size="small"
                      sx={{ mr: 1, mb: 1 }}
                    />
                    <Chip
                      label={plant.zone}
                      size="small"
                      variant="outlined"
                      sx={{ mr: 1, mb: 1 }}
                    />
                  </Box>

                  <Box mb={2}>
                    <Typography variant="body2" gutterBottom>
                      Growth Stage: {plant.growthStage}
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={getGrowthProgress(plant.growthStage)}
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  </Box>

                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    Planted: {format(plant.plantedDate, 'MMM dd, yyyy')}
                  </Typography>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    Expected Harvest: {format(plant.expectedHarvestDate, 'MMM dd, yyyy')}
                  </Typography>

                  {plant.companionPlants && plant.companionPlants.length > 0 && (
                    <Box mt={2}>
                      <Typography variant="caption" display="block" gutterBottom>
                        Companion Plants:
                      </Typography>
                      {plant.companionPlants.map((companion, index) => (
                        <Chip
                          key={index}
                          label={companion}
                          size="small"
                          variant="outlined"
                          sx={{ mr: 0.5, mb: 0.5 }}
                        />
                      ))}
                    </Box>
                  )}

                  <Box display="flex" justifyContent="flex-end" mt={2}>
                    <IconButton size="small">
                      <Visibility />
                    </IconButton>
                    <IconButton size="small">
                      <Edit />
                    </IconButton>
                    <IconButton size="small" color="error">
                      <Delete />
                    </IconButton>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Zone</TableCell>
                <TableCell>Growth Stage</TableCell>
                <TableCell>Health</TableCell>
                <TableCell>Planted Date</TableCell>
                <TableCell>Expected Harvest</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredPlants.map((plant) => (
                <TableRow key={plant.id}>
                  <TableCell>
                    <Box>
                      <Typography variant="body1">{plant.name}</Typography>
                      <Typography variant="caption" color="textSecondary">
                        {plant.scientificName}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip label={plant.type} size="small" />
                  </TableCell>
                  <TableCell>{plant.zone}</TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2">{plant.growthStage}</Typography>
                      <LinearProgress
                        variant="determinate"
                        value={getGrowthProgress(plant.growthStage)}
                        sx={{ height: 4, mt: 0.5 }}
                      />
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={plant.health}
                      color={getHealthColor(plant.health) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{format(plant.plantedDate, 'MMM dd, yyyy')}</TableCell>
                  <TableCell>{format(plant.expectedHarvestDate, 'MMM dd, yyyy')}</TableCell>
                  <TableCell>
                    <IconButton size="small">
                      <Visibility />
                    </IconButton>
                    <IconButton size="small">
                      <Edit />
                    </IconButton>
                    <IconButton size="small" color="error">
                      <Delete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Floating Action Button for Adding Plants */}
      <Fab
        color="primary"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={() => setCameraOpen(true)}
      >
        <Badge badgeContent="AI" color="secondary">
          <CameraAlt />
        </Badge>
      </Fab>

      <CameraCapture
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onImageCapture={handleIdentifyPlant}
      />
    </Box>
  );
}