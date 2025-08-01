import { create } from 'zustand';
import { Greenhouse, SensorReading, Alert, Plant, Controller } from '../../../shared/types';

interface GreenhouseState {
  greenhouses: Greenhouse[];
  selectedGreenhouse: Greenhouse | null;
  currentReadings: Record<string, SensorReading>;
  alerts: Alert[];
  plants: Plant[];
  controllers: Controller[];
  
  setSelectedGreenhouse: (greenhouse: Greenhouse | null) => void;
  updateSensorReading: (reading: SensorReading) => void;
  addAlert: (alert: Alert) => void;
  acknowledgeAlert: (alertId: string) => void;
  updateController: (controller: Controller) => void;
}

export const useGreenhouseStore = create<GreenhouseState>((set) => ({
  greenhouses: [],
  selectedGreenhouse: null,
  currentReadings: {},
  alerts: [],
  plants: [],
  controllers: [],
  
  setSelectedGreenhouse: (greenhouse) => set({ selectedGreenhouse: greenhouse }),
  
  updateSensorReading: (reading) => set((state) => ({
    currentReadings: {
      ...state.currentReadings,
      [reading.sensorId]: reading,
    },
  })),
  
  addAlert: (alert) => set((state) => ({
    alerts: [alert, ...state.alerts].slice(0, 100),
  })),
  
  acknowledgeAlert: (alertId) => set((state) => ({
    alerts: state.alerts.map((alert) =>
      alert.id === alertId
        ? { ...alert, acknowledged: true, resolvedAt: new Date() }
        : alert
    ),
  })),
  
  updateController: (controller) => set((state) => ({
    controllers: state.controllers.map((c) =>
      c.id === controller.id ? controller : c
    ),
  })),
}));