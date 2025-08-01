import { 
  GrowthMeasurement, 
  GrowthTimeline, 
  GrowthMilestone, 
  GrowthRateAnalysis,
  GrowthPrediction,
  GrowthComparisonData,
  GrowthStatistics,
  GrowthReport,
  ReportType,
  MilestoneType,
  PlantCondition,
  BulkMeasurementRequest,
  Alert,
  AlertType,
  AlertSeverity,
  BulkAlertAction,
  AlertFilter,
  AlertSummary
} from './growth-tracking.types';

export class GrowthTrackingService {
  // In-memory storage for demo - in production, use a database
  private static measurements: Map<string, GrowthMeasurement> = new Map();
  private static timelines: Map<string, GrowthTimeline> = new Map();
  private static alerts: Map<string, Alert> = new Map();
  private static statistics: Map<string, GrowthStatistics> = new Map();

  // Growth Measurement Methods
  static async recordMeasurement(measurement: Omit<GrowthMeasurement, 'id' | 'createdAt' | 'updatedAt'>): Promise<GrowthMeasurement> {
    const id = this.generateId();
    const newMeasurement: GrowthMeasurement = {
      ...measurement,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.measurements.set(id, newMeasurement);
    
    // Update timeline
    await this.updateTimeline(measurement.bedId, measurement.cropId);
    
    // Check for milestones and alerts
    await this.checkMilestones(newMeasurement);
    await this.generateGrowthAlerts(newMeasurement);
    
    return newMeasurement;
  }

  static async bulkRecordMeasurements(request: BulkMeasurementRequest, userId: string): Promise<GrowthMeasurement[]> {
    const measurements: GrowthMeasurement[] = [];
    
    for (const bedId of request.bedIds) {
      // Get crop info for this bed (would come from database)
      const cropId = await this.getCropIdForBed(bedId);
      
      if (cropId) {
        const measurement = await this.recordMeasurement({
          bedId,
          cropId,
          userId,
          measurementDate: new Date(),
          plantAge: await this.calculatePlantAge(bedId, cropId),
          measurements: request.measurements,
          photos: [], // Photos would be processed separately
          notes: request.notes
        });
        
        measurements.push(measurement);
      }
    }
    
    return measurements;
  }

  static async getMeasurement(id: string): Promise<GrowthMeasurement | null> {
    return this.measurements.get(id) || null;
  }

  static async getMeasurementsByBed(bedId: string, limit = 50): Promise<GrowthMeasurement[]> {
    return Array.from(this.measurements.values())
      .filter(m => m.bedId === bedId)
      .sort((a, b) => b.measurementDate.getTime() - a.measurementDate.getTime())
      .slice(0, limit);
  }

  static async getMeasurementsByCrop(cropId: string, limit = 50): Promise<GrowthMeasurement[]> {
    return Array.from(this.measurements.values())
      .filter(m => m.cropId === cropId)
      .sort((a, b) => b.measurementDate.getTime() - a.measurementDate.getTime())
      .slice(0, limit);
  }

  static async deleteMeasurement(id: string): Promise<boolean> {
    return this.measurements.delete(id);
  }

  // Timeline Methods
  static async getTimeline(bedId: string, cropId: string): Promise<GrowthTimeline | null> {
    const key = `${bedId}-${cropId}`;
    return this.timelines.get(key) || null;
  }

  static async updateTimeline(bedId: string, cropId: string): Promise<GrowthTimeline> {
    const key = `${bedId}-${cropId}`;
    const measurements = await this.getMeasurementsByBed(bedId);
    const cropMeasurements = measurements.filter(m => m.cropId === cropId);
    
    // Get milestones
    const milestones = await this.getMilestones(bedId, cropId);
    
    // Calculate growth rate
    const growthRate = this.calculateGrowthRate(cropMeasurements);
    
    // Generate predictions
    const predictions = await this.generatePredictions(cropMeasurements, growthRate);
    
    const timeline: GrowthTimeline = {
      cropId,
      bedId,
      plantingDate: await this.getPlantingDate(bedId, cropId),
      expectedHarvestDate: predictions.expectedHarvestDate,
      measurements: cropMeasurements,
      milestones,
      growthRate,
      predictions
    };
    
    this.timelines.set(key, timeline);
    return timeline;
  }

  // Milestone Methods
  static async createMilestone(milestone: Omit<GrowthMilestone, 'id'>): Promise<GrowthMilestone> {
    const newMilestone: GrowthMilestone = {
      ...milestone,
      id: this.generateId()
    };
    
    // Store milestone (in database in production)
    return newMilestone;
  }

  static async getMilestones(bedId: string, cropId: string): Promise<GrowthMilestone[]> {
    // Mock milestones - in production, fetch from database
    const plantingDate = await this.getPlantingDate(bedId, cropId);
    
    return [
      {
        id: this.generateId(),
        name: 'Germination',
        description: 'Seeds have sprouted',
        expectedDate: new Date(plantingDate.getTime() + 7 * 24 * 60 * 60 * 1000),
        achieved: true,
        milestone: MilestoneType.GERMINATION,
        actualDate: new Date(plantingDate.getTime() + 5 * 24 * 60 * 60 * 1000)
      },
      {
        id: this.generateId(),
        name: 'First True Leaves',
        description: 'First set of true leaves have appeared',
        expectedDate: new Date(plantingDate.getTime() + 14 * 24 * 60 * 60 * 1000),
        achieved: true,
        milestone: MilestoneType.FIRST_LEAVES,
        actualDate: new Date(plantingDate.getTime() + 12 * 24 * 60 * 60 * 1000)
      },
      {
        id: this.generateId(),
        name: 'Flowering',
        description: 'First flowers have appeared',
        expectedDate: new Date(plantingDate.getTime() + 45 * 24 * 60 * 60 * 1000),
        achieved: false,
        milestone: MilestoneType.FLOWERING
      }
    ];
  }

  static async updateMilestone(id: string, achieved: boolean, actualDate?: Date): Promise<boolean> {
    // In production, update in database
    if (achieved) {
      await this.createAlert({
        type: AlertType.GROWTH_MILESTONE,
        severity: AlertSeverity.INFO,
        title: 'Growth Milestone Achieved',
        message: 'Your plant has reached a new growth milestone!',
        userId: 'current-user-id', // Would get from context
        isRead: false,
        isArchived: false,
        actionTaken: false,
        metadata: {
          autoGenerated: true,
          source: 'growth_tracking'
        }
      });
    }
    
    return true;
  }

  // Analysis Methods
  static calculateGrowthRate(measurements: GrowthMeasurement[]): GrowthRateAnalysis {
    if (measurements.length < 2) {
      return {
        heightGrowthRate: { current: 0, average: 0, trend: 'stable' },
        leafDevelopmentRate: { newLeavesPerWeek: 0, averageLeafSize: 0 },
        overallHealthTrend: { direction: 'stable', score: 100, factors: [] }
      };
    }

    const sortedMeasurements = measurements.sort((a, b) => a.measurementDate.getTime() - b.measurementDate.getTime());
    
    // Calculate height growth rate
    const heightMeasurements = sortedMeasurements.filter(m => m.measurements.height);
    let heightGrowthRate = { current: 0, average: 0, trend: 'stable' as const };
    
    if (heightMeasurements.length >= 2) {
      const recent = heightMeasurements.slice(-2);
      const timeDiff = (recent[1].measurementDate.getTime() - recent[0].measurementDate.getTime()) / (1000 * 60 * 60 * 24);
      const heightDiff = (recent[1].measurements.height?.value || 0) - (recent[0].measurements.height?.value || 0);
      
      heightGrowthRate.current = heightDiff / timeDiff;
      
      // Calculate average
      const totalHeightChange = (heightMeasurements[heightMeasurements.length - 1].measurements.height?.value || 0) - 
                               (heightMeasurements[0].measurements.height?.value || 0);
      const totalTimeDiff = (heightMeasurements[heightMeasurements.length - 1].measurementDate.getTime() - 
                            heightMeasurements[0].measurementDate.getTime()) / (1000 * 60 * 60 * 24);
      
      heightGrowthRate.average = totalHeightChange / totalTimeDiff;
      heightGrowthRate.trend = heightGrowthRate.current > heightGrowthRate.average ? 'increasing' : 
                              heightGrowthRate.current < heightGrowthRate.average ? 'decreasing' : 'stable';
    }

    // Calculate leaf development
    const leafMeasurements = sortedMeasurements.filter(m => m.measurements.leafCount);
    let leafDevelopmentRate = { newLeavesPerWeek: 0, averageLeafSize: 0 };
    
    if (leafMeasurements.length >= 2) {
      const recent = leafMeasurements.slice(-2);
      const timeDiff = (recent[1].measurementDate.getTime() - recent[0].measurementDate.getTime()) / (1000 * 60 * 60 * 24 * 7);
      const leafDiff = (recent[1].measurements.leafCount?.total || 0) - (recent[0].measurements.leafCount?.total || 0);
      leafDevelopmentRate.newLeavesPerWeek = leafDiff / timeDiff;
    }

    // Calculate health trend
    const healthScores = sortedMeasurements.map(m => m.measurements.healthScore);
    const recentHealthScore = healthScores[healthScores.length - 1];
    const averageHealth = healthScores.reduce((sum, score) => sum + score, 0) / healthScores.length;
    
    return {
      heightGrowthRate,
      leafDevelopmentRate,
      overallHealthTrend: {
        direction: recentHealthScore > averageHealth ? 'improving' : 
                  recentHealthScore < averageHealth ? 'declining' : 'stable',
        score: recentHealthScore,
        factors: this.identifyHealthFactors(sortedMeasurements)
      }
    };
  }

  static async generatePredictions(measurements: GrowthMeasurement[], growthRate: GrowthRateAnalysis): Promise<GrowthPrediction> {
    const now = new Date();
    
    // Mock predictions - in production, use ML models
    return {
      expectedHarvestDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      expectedYield: {
        quantity: 5,
        unit: 'lbs',
        confidence: 0.75
      },
      nextMilestone: {
        milestone: MilestoneType.FLOWERING,
        expectedDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
        confidence: 0.8
      },
      recommendedActions: [
        {
          id: this.generateId(),
          type: 'watering',
          priority: 'medium',
          title: 'Increase Watering Frequency',
          description: 'Based on growth rate, increase watering to every 2 days',
          actionRequired: true,
          dueDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
          estimatedTimeMinutes: 10
        }
      ]
    };
  }

  // Alert Management Methods
  static async createAlert(alert: Omit<Alert, 'id' | 'createdAt'>): Promise<Alert> {
    const newAlert: Alert = {
      ...alert,
      id: this.generateId(),
      createdAt: new Date()
    };
    
    this.alerts.set(newAlert.id, newAlert);
    return newAlert;
  }

  static async getAlerts(filter: AlertFilter = {}): Promise<Alert[]> {
    let alerts = Array.from(this.alerts.values());
    
    // Apply filters
    if (filter.types) {
      alerts = alerts.filter(a => filter.types!.includes(a.type));
    }
    if (filter.severities) {
      alerts = alerts.filter(a => filter.severities!.includes(a.severity));
    }
    if (filter.bedIds) {
      alerts = alerts.filter(a => filter.bedIds!.includes(a.bedId || ''));
    }
    if (filter.cropIds) {
      alerts = alerts.filter(a => filter.cropIds!.includes(a.cropId || ''));
    }
    if (typeof filter.isRead === 'boolean') {
      alerts = alerts.filter(a => a.isRead === filter.isRead);
    }
    if (typeof filter.isArchived === 'boolean') {
      alerts = alerts.filter(a => a.isArchived === filter.isArchived);
    }
    if (filter.dateRange) {
      alerts = alerts.filter(a => 
        a.createdAt >= filter.dateRange!.start && 
        a.createdAt <= filter.dateRange!.end
      );
    }
    
    // Sort by creation date (newest first)
    alerts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    // Apply pagination
    const offset = filter.offset || 0;
    const limit = filter.limit || 50;
    
    return alerts.slice(offset, offset + limit);
  }

  static async getAlertSummary(userId: string): Promise<AlertSummary> {
    const userAlerts = Array.from(this.alerts.values()).filter(a => a.userId === userId);
    
    const summary: AlertSummary = {
      total: userAlerts.length,
      unread: userAlerts.filter(a => !a.isRead).length,
      critical: userAlerts.filter(a => a.severity === AlertSeverity.CRITICAL || a.severity === AlertSeverity.URGENT).length,
      warnings: userAlerts.filter(a => a.severity === AlertSeverity.WARNING).length,
      byType: {} as Record<AlertType, number>,
      bySeverity: {} as Record<AlertSeverity, number>,
      recentCount: userAlerts.filter(a => 
        a.createdAt.getTime() > Date.now() - 24 * 60 * 60 * 1000
      ).length
    };
    
    // Count by type
    Object.values(AlertType).forEach(type => {
      summary.byType[type] = userAlerts.filter(a => a.type === type).length;
    });
    
    // Count by severity
    Object.values(AlertSeverity).forEach(severity => {
      summary.bySeverity[severity] = userAlerts.filter(a => a.severity === severity).length;
    });
    
    return summary;
  }

  static async performBulkAlertAction(action: BulkAlertAction): Promise<boolean> {
    try {
      for (const alertId of action.alertIds) {
        const alert = this.alerts.get(alertId);
        if (alert && alert.userId === action.userId) {
          switch (action.action) {
            case 'mark_read':
              alert.isRead = true;
              alert.readAt = new Date();
              break;
            case 'archive':
              alert.isArchived = true;
              alert.archivedAt = new Date();
              break;
            case 'delete':
              this.alerts.delete(alertId);
              continue;
            case 'mark_action_taken':
              alert.actionTaken = true;
              break;
          }
          this.alerts.set(alertId, alert);
        }
      }
      return true;
    } catch (error) {
      console.error('Bulk alert action error:', error);
      return false;
    }
  }

  static async clearAllAlerts(userId: string): Promise<boolean> {
    try {
      const userAlerts = Array.from(this.alerts.values())
        .filter(a => a.userId === userId)
        .map(a => a.id);
      
      const bulkAction: BulkAlertAction = {
        alertIds: userAlerts,
        action: 'archive',
        userId
      };
      
      return await this.performBulkAlertAction(bulkAction);
    } catch (error) {
      console.error('Clear all alerts error:', error);
      return false;
    }
  }

  // Private helper methods
  private static async checkMilestones(measurement: GrowthMeasurement): Promise<void> {
    const milestones = await this.getMilestones(measurement.bedId, measurement.cropId);
    
    for (const milestone of milestones) {
      if (!milestone.achieved && this.isMilestoneAchieved(milestone, measurement)) {
        await this.updateMilestone(milestone.id, true, measurement.measurementDate);
      }
    }
  }

  private static isMilestoneAchieved(milestone: GrowthMilestone, measurement: GrowthMeasurement): boolean {
    // Simple milestone detection logic
    switch (milestone.milestone) {
      case MilestoneType.GERMINATION:
        return (measurement.measurements.height?.value || 0) > 0.5;
      case MilestoneType.FIRST_LEAVES:
        return (measurement.measurements.leafCount?.total || 0) >= 2;
      case MilestoneType.FLOWERING:
        return (measurement.measurements.fruitCount?.flowering || 0) > 0;
      default:
        return false;
    }
  }

  private static async generateGrowthAlerts(measurement: GrowthMeasurement): Promise<void> {
    // Generate alerts based on measurement data
    if (measurement.measurements.healthScore < 60) {
      await this.createAlert({
        type: AlertType.GROWTH_CONCERN,
        severity: measurement.measurements.healthScore < 30 ? AlertSeverity.CRITICAL : AlertSeverity.WARNING,
        title: 'Plant Health Concern',
        message: `Plant health score is ${measurement.measurements.healthScore}%. Consider investigating.`,
        bedId: measurement.bedId,
        cropId: measurement.cropId,
        userId: measurement.userId,
        isRead: false,
        isArchived: false,
        actionTaken: false,
        metadata: {
          autoGenerated: true,
          source: 'growth_tracking',
          confidence: 0.8,
          relatedMeasurementId: measurement.id
        }
      });
    }
    
    if (measurement.measurements.overallCondition === PlantCondition.POOR || 
        measurement.measurements.overallCondition === PlantCondition.CRITICAL) {
      await this.createAlert({
        type: AlertType.GROWTH_CONCERN,
        severity: AlertSeverity.URGENT,
        title: 'Plant Condition Critical',
        message: `Plant condition is ${measurement.measurements.overallCondition}. Immediate attention required.`,
        bedId: measurement.bedId,
        cropId: measurement.cropId,
        userId: measurement.userId,
        isRead: false,
        isArchived: false,
        actionTaken: false,
        metadata: {
          autoGenerated: true,
          source: 'growth_tracking',
          confidence: 0.9,
          relatedMeasurementId: measurement.id,
          suggestedActions: ['Check water levels', 'Inspect for pests', 'Review nutrient levels']
        }
      });
    }
  }

  private static identifyHealthFactors(measurements: GrowthMeasurement[]): string[] {
    const factors: string[] = [];
    const latest = measurements[measurements.length - 1];
    
    if (latest.measurements.healthScore < 70) {
      factors.push('Below optimal health score');
    }
    
    if (latest.measurements.overallCondition === PlantCondition.POOR) {
      factors.push('Poor overall condition');
    }
    
    // Add more factor identification logic
    
    return factors;
  }

  private static async getCropIdForBed(bedId: string): Promise<string | null> {
    // Mock implementation - would query database
    return 'tomato-crop-id';
  }

  private static async calculatePlantAge(bedId: string, cropId: string): Promise<number> {
    const plantingDate = await this.getPlantingDate(bedId, cropId);
    const now = new Date();
    return Math.floor((now.getTime() - plantingDate.getTime()) / (1000 * 60 * 60 * 24));
  }

  private static async getPlantingDate(bedId: string, cropId: string): Promise<Date> {
    // Mock implementation - would query database
    return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
  }

  private static generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}