import { Request, Response } from 'express';
import { GrowthTrackingService } from './growth-tracking.service';
import { 
  BulkMeasurementRequest, 
  AlertFilter, 
  BulkAlertAction,
  ReportType 
} from './growth-tracking.types';

export class GrowthTrackingController {

  // Growth Measurement Endpoints
  static async recordMeasurement(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }

      const measurementData = {
        ...req.body,
        userId: req.user.userId,
        measurementDate: new Date(),
        plantAge: req.body.plantAge || 0
      };

      const measurement = await GrowthTrackingService.recordMeasurement(measurementData);
      
      res.status(201).json({
        success: true,
        measurement,
        message: 'Measurement recorded successfully'
      });
    } catch (error) {
      console.error('Record measurement error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to record measurement'
      });
    }
  }

  static async bulkRecordMeasurements(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }

      const request: BulkMeasurementRequest = req.body;
      const measurements = await GrowthTrackingService.bulkRecordMeasurements(request, req.user.userId);
      
      res.status(201).json({
        success: true,
        measurements,
        count: measurements.length,
        message: `${measurements.length} measurements recorded successfully`
      });
    } catch (error) {
      console.error('Bulk record measurements error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to record bulk measurements'
      });
    }
  }

  static async getMeasurement(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const measurement = await GrowthTrackingService.getMeasurement(id);
      
      if (!measurement) {
        res.status(404).json({
          success: false,
          message: 'Measurement not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        measurement
      });
    } catch (error) {
      console.error('Get measurement error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve measurement'
      });
    }
  }

  static async getMeasurementsByBed(req: Request, res: Response): Promise<void> {
    try {
      const { bedId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      
      const measurements = await GrowthTrackingService.getMeasurementsByBed(bedId, limit);
      
      res.status(200).json({
        success: true,
        measurements,
        count: measurements.length
      });
    } catch (error) {
      console.error('Get measurements by bed error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve measurements'
      });
    }
  }

  static async getMeasurementsByCrop(req: Request, res: Response): Promise<void> {
    try {
      const { cropId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      
      const measurements = await GrowthTrackingService.getMeasurementsByCrop(cropId, limit);
      
      res.status(200).json({
        success: true,
        measurements,
        count: measurements.length
      });
    } catch (error) {
      console.error('Get measurements by crop error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve measurements'
      });
    }
  }

  static async deleteMeasurement(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const deleted = await GrowthTrackingService.deleteMeasurement(id);
      
      if (!deleted) {
        res.status(404).json({
          success: false,
          message: 'Measurement not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Measurement deleted successfully'
      });
    } catch (error) {
      console.error('Delete measurement error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete measurement'
      });
    }
  }

  // Timeline Endpoints
  static async getTimeline(req: Request, res: Response): Promise<void> {
    try {
      const { bedId, cropId } = req.params;
      const timeline = await GrowthTrackingService.getTimeline(bedId, cropId);
      
      if (!timeline) {
        res.status(404).json({
          success: false,
          message: 'Timeline not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        timeline
      });
    } catch (error) {
      console.error('Get timeline error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve timeline'
      });
    }
  }

  static async updateTimeline(req: Request, res: Response): Promise<void> {
    try {
      const { bedId, cropId } = req.params;
      const timeline = await GrowthTrackingService.updateTimeline(bedId, cropId);
      
      res.status(200).json({
        success: true,
        timeline,
        message: 'Timeline updated successfully'
      });
    } catch (error) {
      console.error('Update timeline error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update timeline'
      });
    }
  }

  // Milestone Endpoints
  static async createMilestone(req: Request, res: Response): Promise<void> {
    try {
      const milestone = await GrowthTrackingService.createMilestone(req.body);
      
      res.status(201).json({
        success: true,
        milestone,
        message: 'Milestone created successfully'
      });
    } catch (error) {
      console.error('Create milestone error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create milestone'
      });
    }
  }

  static async getMilestones(req: Request, res: Response): Promise<void> {
    try {
      const { bedId, cropId } = req.params;
      const milestones = await GrowthTrackingService.getMilestones(bedId, cropId);
      
      res.status(200).json({
        success: true,
        milestones,
        count: milestones.length
      });
    } catch (error) {
      console.error('Get milestones error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve milestones'
      });
    }
  }

  static async updateMilestone(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { achieved, actualDate } = req.body;
      
      const updated = await GrowthTrackingService.updateMilestone(
        id, 
        achieved, 
        actualDate ? new Date(actualDate) : undefined
      );
      
      if (!updated) {
        res.status(404).json({
          success: false,
          message: 'Milestone not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Milestone updated successfully'
      });
    } catch (error) {
      console.error('Update milestone error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update milestone'
      });
    }
  }

  // Alert Management Endpoints
  static async getAlerts(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }

      const filter: AlertFilter = {
        ...req.query,
        types: req.query.types ? (req.query.types as string).split(',') as any : undefined,
        severities: req.query.severities ? (req.query.severities as string).split(',') as any : undefined,
        bedIds: req.query.bedIds ? (req.query.bedIds as string).split(',') : undefined,
        cropIds: req.query.cropIds ? (req.query.cropIds as string).split(',') : undefined,
        isRead: req.query.isRead === 'true' ? true : req.query.isRead === 'false' ? false : undefined,
        isArchived: req.query.isArchived === 'true' ? true : req.query.isArchived === 'false' ? false : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string) : undefined
      };

      const alerts = await GrowthTrackingService.getAlerts(filter);
      
      res.status(200).json({
        success: true,
        alerts,
        count: alerts.length
      });
    } catch (error) {
      console.error('Get alerts error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve alerts'
      });
    }
  }

  static async getAlertSummary(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }

      const summary = await GrowthTrackingService.getAlertSummary(req.user.userId);
      
      res.status(200).json({
        success: true,
        summary
      });
    } catch (error) {
      console.error('Get alert summary error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve alert summary'
      });
    }
  }

  static async performBulkAlertAction(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }

      const action: BulkAlertAction = {
        ...req.body,
        userId: req.user.userId
      };

      const success = await GrowthTrackingService.performBulkAlertAction(action);
      
      if (!success) {
        res.status(400).json({
          success: false,
          message: 'Failed to perform bulk action'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: `Bulk ${action.action} completed successfully`,
        affectedCount: action.alertIds.length
      });
    } catch (error) {
      console.error('Bulk alert action error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to perform bulk action'
      });
    }
  }

  static async clearAllAlerts(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }

      const success = await GrowthTrackingService.clearAllAlerts(req.user.userId);
      
      if (!success) {
        res.status(400).json({
          success: false,
          message: 'Failed to clear alerts'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'All alerts cleared successfully'
      });
    } catch (error) {
      console.error('Clear all alerts error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to clear alerts'
      });
    }
  }

  // Growth Analysis Endpoints
  static async getGrowthAnalysis(req: Request, res: Response): Promise<void> {
    try {
      const { bedId, cropId } = req.params;
      const timeline = await GrowthTrackingService.getTimeline(bedId, cropId);
      
      if (!timeline) {
        res.status(404).json({
          success: false,
          message: 'Growth data not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        analysis: {
          growthRate: timeline.growthRate,
          predictions: timeline.predictions,
          milestones: timeline.milestones,
          measurementCount: timeline.measurements.length,
          healthTrend: timeline.growthRate.overallHealthTrend
        }
      });
    } catch (error) {
      console.error('Get growth analysis error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve growth analysis'
      });
    }
  }

  static async getGrowthComparison(req: Request, res: Response): Promise<void> {
    try {
      const { bedId, cropId } = req.params;
      
      // Mock comparison data - in production, would compare with database averages
      res.status(200).json({
        success: true,
        comparison: {
          currentGrowthRate: 0.5, // inches per day
          averageGrowthRate: 0.4,
          performanceRanking: 75, // 75th percentile
          healthScore: 85,
          averageHealthScore: 78,
          daysToHarvest: 25,
          averageDaysToHarvest: 30,
          recommendation: 'Your plant is performing above average! Consider sharing your growing techniques.'
        }
      });
    } catch (error) {
      console.error('Get growth comparison error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve growth comparison'
      });
    }
  }

  // Photo Management
  static async uploadGrowthPhoto(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }

      // Mock photo upload - in production, would handle file upload
      const photoData = {
        id: Math.random().toString(36).substr(2, 9),
        url: `/uploads/growth-photos/${Date.now()}.jpg`,
        type: req.body.type || 'overview',
        angle: req.body.angle || 'front',
        timestamp: new Date(),
        metadata: {
          camera: req.body.camera || 'mobile',
          lighting: req.body.lighting || 'natural',
          distance: req.body.distance || 30
        }
      };

      res.status(201).json({
        success: true,
        photo: photoData,
        message: 'Photo uploaded successfully'
      });
    } catch (error) {
      console.error('Upload growth photo error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upload photo'
      });
    }
  }

  // Dashboard Data
  static async getDashboardData(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }

      const summary = await GrowthTrackingService.getAlertSummary(req.user.userId);
      
      // Mock dashboard data
      const dashboardData = {
        summary: {
          activePlants: 12,
          healthyPlants: 10,
          plantsNeedingAttention: 2,
          upcomingHarvests: 3,
          measurementsThisWeek: 25,
          milestonesAchieved: 8
        },
        alerts: summary,
        recentActivity: [
          {
            id: '1',
            type: 'measurement',
            message: 'New measurement recorded for Tomato Bed A',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000)
          },
          {
            id: '2',
            type: 'milestone',
            message: 'Flowering milestone achieved for Pepper Bed B',
            timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000)
          },
          {
            id: '3',
            type: 'alert',
            message: 'Low health score detected in Lettuce Bed C',
            timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000)
          }
        ],
        quickActions: [
          {
            id: 'record_measurement',
            title: 'Record Measurement',
            description: 'Add new growth measurements',
            icon: '📏',
            url: '/growth-tracker'
          },
          {
            id: 'view_alerts',
            title: 'View Alerts',
            description: `${summary.unread} unread alerts`,
            icon: '🔔',
            url: '/alerts'
          },
          {
            id: 'check_timeline',
            title: 'Check Timeline',
            description: 'View growth progress',
            icon: '📈',
            url: '/timeline'
          }
        ]
      };

      res.status(200).json({
        success: true,
        dashboard: dashboardData
      });
    } catch (error) {
      console.error('Get dashboard data error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve dashboard data'
      });
    }
  }
}