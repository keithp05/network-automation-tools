const express = require('express');
const app = express();
app.use(express.json());

// Import the climate battery service directly
const { ClimateBatteryService } = require('./src/modules/climate-battery/climate-battery.service');

// Test endpoint
app.post('/test-climate-battery', (req, res) => {
  try {
    const testDesign = {
      greenhouseGeometry: {
        boxSection: {
          width: 30,
          length: 96,
          height: 14
        },
        roofSection: {
          width: 30,
          length: 96,
          peakHeight: 8
        }
      },
      fanSpecs: {
        numberOfFans: 2,
        cfmPerFan: 2000,
        voltage: 120,
        amperage: 2,
        wattage: 240,
        dailyHours: 8
      },
      tubingDiameter: 4,
      numberOfRisers: 2,
      numberOfManifolds: 2,
      costParameters: {
        perFootTubingCost: 0.65,
        riserCost: 250,
        manifoldCost: 200,
        fanCost: 150,
        controlsPackageCost: 1000,
        electricityRate: 0.103,
        gasRate: 1.47
      },
      climateData: {
        heatingDegreeDays: 8619,
        coolingDegreeDays: 415,
        averageYearlyLow: 7,
        averageYearlyHigh: 77
      },
      insulationData: {
        glazedRoofArea: 3400,
        insulatedRoofArea: 0,
        glazedWallsArea: 1200,
        insulatedWallsArea: 600,
        glazedRoofRValue: 1.43,
        insulatedRoofRValue: 15,
        glazedWallRValue: 1.63,
        insulatedWallRValue: 15,
        interiorDesignTemp: 40,
        glazingSolarHeatGainCoeff: 0.82
      }
    };

    const results = ClimateBatteryService.calculate(testDesign);
    
    res.json({
      success: true,
      summary: {
        totalAirVolume: results.totalAirVolume,
        totalCFM: results.totalCFM,
        airChangesPerHour: results.airChangesPerHour.toFixed(2),
        totalHardwareCost: `$${results.totalHardwareCost.toFixed(2)}`,
        paybackYears: results.paybackYears.toFixed(2),
        yearlyNetSavings: `$${results.yearlyNetSavings.toFixed(2)}`
      },
      partsList: results.partsList.map(part => ({
        name: part.name,
        quantity: part.quantity,
        totalCost: `$${part.totalCost.toFixed(2)}`
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Climate Battery Test Server running on http://localhost:${PORT}`);
  console.log(`Test the API with: curl -X POST http://localhost:${PORT}/test-climate-battery`);
});