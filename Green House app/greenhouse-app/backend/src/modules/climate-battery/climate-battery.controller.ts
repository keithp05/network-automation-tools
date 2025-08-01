import { Request, Response } from 'express';
import { ClimateBatteryService } from './climate-battery.service';
import { ClimateBatteryDesign } from './climate-battery.types';

export class ClimateBatteryController {
  static async calculateDesign(req: Request, res: Response) {
    try {
      const design: ClimateBatteryDesign = req.body;
      
      // Validate required fields
      if (!design.greenhouseGeometry || !design.fanSpecs || !design.costParameters) {
        return res.status(400).json({
          error: 'Missing required fields: greenhouseGeometry, fanSpecs, and costParameters are required'
        });
      }

      const results = ClimateBatteryService.calculate(design);
      
      res.json({
        success: true,
        data: results
      });
    } catch (error) {
      console.error('Climate battery calculation error:', error);
      res.status(500).json({
        error: 'Failed to calculate climate battery design',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  static async getPartsList(req: Request, res: Response) {
    try {
      const design: ClimateBatteryDesign = req.body;
      const results = ClimateBatteryService.calculate(design);
      
      res.json({
        success: true,
        data: {
          partsList: results.partsList,
          totalCost: results.totalHardwareCost,
          summary: {
            tubingLength: results.totalTubingLength,
            airVolume: results.totalAirVolume,
            airChangesPerHour: results.airChangesPerHour,
            paybackYears: results.paybackYears
          }
        }
      });
    } catch (error) {
      console.error('Parts list generation error:', error);
      res.status(500).json({
        error: 'Failed to generate parts list',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  static async exportPartsList(req: Request, res: Response) {
    try {
      const { design, format = 'json' } = req.body;
      const results = ClimateBatteryService.calculate(design);
      
      if (format === 'csv') {
        let csv = 'Category,Name,Description,Quantity,Unit Cost,Total Cost,Specifications\n';
        results.partsList.forEach(part => {
          csv += `"${part.category}","${part.name}","${part.description}",${part.quantity},${part.unitCost},${part.totalCost},"${JSON.stringify(part.specifications || {})}"\n`;
        });
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=climate-battery-parts.csv');
        res.send(csv);
      } else {
        res.json({
          success: true,
          data: results.partsList
        });
      }
    } catch (error) {
      console.error('Export error:', error);
      res.status(500).json({
        error: 'Failed to export parts list',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}