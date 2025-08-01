import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box } from '@mui/material';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Greenhouses from './pages/Greenhouses';
import SensorMonitoring from './pages/SensorMonitoring';
import ClimateControl from './pages/ClimateControl';
import NutrientManagement from './pages/NutrientManagement';
import PlantManagement from './pages/PlantManagement';
import FloorPlanDesigner from './pages/FloorPlanDesigner';
import GrowbedDesigner from './pages/GrowbedDesigner';
import Marketplace from './pages/Marketplace';
import GeothermalCalculator from './pages/GeothermalCalculator';
import PlantIdentification from './pages/PlantIdentification';

function App() {
  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/greenhouses" element={<Greenhouses />} />
          <Route path="/sensors" element={<SensorMonitoring />} />
          <Route path="/climate" element={<ClimateControl />} />
          <Route path="/nutrients" element={<NutrientManagement />} />
          <Route path="/plants" element={<PlantManagement />} />
          <Route path="/floor-plan" element={<FloorPlanDesigner />} />
          <Route path="/growbed-design" element={<GrowbedDesigner />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/geothermal" element={<GeothermalCalculator />} />
          <Route path="/plant-id" element={<PlantIdentification />} />
        </Routes>
      </Layout>
    </Box>
  );
}

export default App;