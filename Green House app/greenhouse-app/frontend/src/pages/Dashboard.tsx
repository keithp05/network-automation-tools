import React, { useEffect, useState } from 'react';
import {
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  Box,
  Alert,
  Chip,
} from '@mui/material';
import {
  WaterDrop,
  Thermostat,
  Opacity,
  Air,
  Warning,
  CheckCircle,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useGreenhouseStore } from '../stores/greenhouseStore';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export default function Dashboard() {
  const { greenhouses, currentReadings, alerts } = useGreenhouseStore();
  const [sensorData, setSensorData] = useState<any[]>([]);

  useEffect(() => {
    const generateMockData = () => {
      const data = [];
      for (let i = 0; i < 24; i++) {
        data.push({
          time: `${i}:00`,
          temperature: 20 + Math.random() * 10,
          humidity: 60 + Math.random() * 20,
          ph: 6 + Math.random() * 1.5,
          oxygen: 6 + Math.random() * 2,
        });
      }
      setSensorData(data);
    };

    generateMockData();
  }, []);

  const statusCards = [
    {
      title: 'Water Temperature',
      value: '22.5°C',
      icon: <Thermostat />,
      color: '#2196f3',
      status: 'normal',
    },
    {
      title: 'pH Level',
      value: '6.8',
      icon: <WaterDrop />,
      color: '#4caf50',
      status: 'normal',
    },
    {
      title: 'Dissolved Oxygen',
      value: '7.2 mg/L',
      icon: <Opacity />,
      color: '#ff9800',
      status: 'normal',
    },
    {
      title: 'Air Quality',
      value: '85%',
      icon: <Air />,
      color: '#9c27b0',
      status: 'good',
    },
  ];

  const plantDistribution = [
    { name: 'Tomatoes', value: 35 },
    { name: 'Lettuce', value: 25 },
    { name: 'Herbs', value: 20 },
    { name: 'Peppers', value: 20 },
  ];

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>

      <Grid container spacing={3}>
        {statusCards.map((card, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography color="textSecondary" gutterBottom>
                      {card.title}
                    </Typography>
                    <Typography variant="h5" component="h2">
                      {card.value}
                    </Typography>
                  </Box>
                  <Box sx={{ color: card.color }}>{card.icon}</Box>
                </Box>
                <Box mt={2}>
                  <Chip
                    label={card.status}
                    color={card.status === 'normal' || card.status === 'good' ? 'success' : 'warning'}
                    size="small"
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}

        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              24-Hour Sensor Readings
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={sensorData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="temperature" stroke="#ff7300" name="Temp (°C)" />
                <Line type="monotone" dataKey="humidity" stroke="#387908" name="Humidity (%)" />
                <Line type="monotone" dataKey="ph" stroke="#8884d8" name="pH" />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Plant Distribution
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={plantDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {plantDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Recent Alerts
            </Typography>
            <Box>
              <Alert severity="warning" sx={{ mb: 1 }}>
                <Box display="flex" alignItems="center">
                  <Warning sx={{ mr: 1 }} />
                  pH level in Zone A is approaching upper limit (7.8)
                </Box>
              </Alert>
              <Alert severity="info" sx={{ mb: 1 }}>
                <Box display="flex" alignItems="center">
                  <CheckCircle sx={{ mr: 1 }} />
                  Nutrient solution replenished in Zone B
                </Box>
              </Alert>
              <Alert severity="success">
                <Box display="flex" alignItems="center">
                  <CheckCircle sx={{ mr: 1 }} />
                  All systems operating normally
                </Box>
              </Alert>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}