import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  IconButton,
  Button,
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
  Chip,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Refresh,
  Timeline,
  CheckCircle,
  Error,
  Warning,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { format } from 'date-fns';

interface Sensor {
  id: string;
  name: string;
  type: string;
  zone: string;
  status: 'active' | 'inactive' | 'error';
  lastReading: {
    value: number;
    unit: string;
    timestamp: Date;
  };
  calibrationDate?: Date;
}

export default function SensorMonitoring() {
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [selectedSensor, setSelectedSensor] = useState<Sensor | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    const mockSensors: Sensor[] = [
      {
        id: '1',
        name: 'pH Sensor Zone A',
        type: 'ph',
        zone: 'Zone A',
        status: 'active',
        lastReading: { value: 6.8, unit: 'pH', timestamp: new Date() },
        calibrationDate: new Date('2024-01-15'),
      },
      {
        id: '2',
        name: 'DO Sensor Tank 1',
        type: 'dissolved_oxygen',
        zone: 'Fish Tank 1',
        status: 'active',
        lastReading: { value: 7.2, unit: 'mg/L', timestamp: new Date() },
      },
      {
        id: '3',
        name: 'Water Temp Zone B',
        type: 'water_temp',
        zone: 'Zone B',
        status: 'error',
        lastReading: { value: 0, unit: '°C', timestamp: new Date() },
      },
    ];
    setSensors(mockSensors);

    const data = [];
    for (let i = 0; i < 48; i++) {
      data.push({
        time: format(new Date(Date.now() - i * 30 * 60 * 1000), 'HH:mm'),
        ph: 6.5 + Math.random() * 0.8,
        oxygen: 6.8 + Math.random() * 1.2,
        temperature: 22 + Math.random() * 3,
      });
    }
    setChartData(data.reverse());
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle color="success" />;
      case 'error':
        return <Error color="error" />;
      case 'inactive':
        return <Warning color="warning" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'error':
        return 'error';
      case 'inactive':
        return 'warning';
      default:
        return 'default';
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Sensor Monitoring</Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            sx={{ mr: 2 }}
            onClick={() => {}}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setOpenDialog(true)}
          >
            Add Sensor
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Real-time Sensor Data
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="ph"
                  stroke="#8884d8"
                  name="pH Level"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="oxygen"
                  stroke="#82ca9d"
                  name="Dissolved Oxygen (mg/L)"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="temperature"
                  stroke="#ffc658"
                  name="Temperature (°C)"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Sensor Name</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Zone</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Last Reading</TableCell>
                  <TableCell>Last Calibration</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sensors.map((sensor) => (
                  <TableRow key={sensor.id}>
                    <TableCell>{sensor.name}</TableCell>
                    <TableCell>
                      <Chip label={sensor.type} size="small" />
                    </TableCell>
                    <TableCell>{sensor.zone}</TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center">
                        {getStatusIcon(sensor.status)}
                        <Chip
                          label={sensor.status}
                          color={getStatusColor(sensor.status) as any}
                          size="small"
                          sx={{ ml: 1 }}
                        />
                      </Box>
                    </TableCell>
                    <TableCell>
                      {sensor.lastReading.value} {sensor.lastReading.unit}
                      <Typography variant="caption" display="block" color="textSecondary">
                        {format(sensor.lastReading.timestamp, 'PPp')}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {sensor.calibrationDate
                        ? format(sensor.calibrationDate, 'PP')
                        : 'Not calibrated'}
                    </TableCell>
                    <TableCell>
                      <IconButton size="small" onClick={() => setSelectedSensor(sensor)}>
                        <Timeline />
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
        </Grid>

        {sensors.map((sensor) => (
          <Grid item xs={12} sm={6} md={4} key={sensor.id}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="start">
                  <Box>
                    <Typography variant="h6">{sensor.name}</Typography>
                    <Typography color="textSecondary" gutterBottom>
                      {sensor.zone}
                    </Typography>
                    <Typography variant="h4" component="div" sx={{ my: 2 }}>
                      {sensor.lastReading.value}
                      <Typography variant="subtitle1" component="span" sx={{ ml: 1 }}>
                        {sensor.lastReading.unit}
                      </Typography>
                    </Typography>
                  </Box>
                  {getStatusIcon(sensor.status)}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Sensor</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField fullWidth label="Sensor Name" sx={{ mb: 2 }} />
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Sensor Type</InputLabel>
              <Select label="Sensor Type">
                <MenuItem value="ph">pH Sensor</MenuItem>
                <MenuItem value="dissolved_oxygen">Dissolved Oxygen</MenuItem>
                <MenuItem value="water_temp">Water Temperature</MenuItem>
                <MenuItem value="air_temp">Air Temperature</MenuItem>
                <MenuItem value="humidity">Humidity</MenuItem>
                <MenuItem value="co2">CO2 Level</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Zone</InputLabel>
              <Select label="Zone">
                <MenuItem value="zone_a">Zone A</MenuItem>
                <MenuItem value="zone_b">Zone B</MenuItem>
                <MenuItem value="fish_tank_1">Fish Tank 1</MenuItem>
                <MenuItem value="nursery">Nursery</MenuItem>
              </Select>
            </FormControl>
            <TextField fullWidth label="Model" sx={{ mb: 2 }} />
            <Box display="flex" justifyContent="flex-end" gap={2}>
              <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
              <Button variant="contained">Add Sensor</Button>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
}