import { GreenhouseDimensions, GrowBedConfig, BedLayout, GrowBedType, SelectedCrop } from './greenhouse-planning.types';
import { validateBedTypeForPlant } from './plant-categories';

export class BedLayoutService {
  private static readonly STANDARD_BED_LENGTH = 8; // feet
  private static readonly STANDARD_BED_WIDTH = 4; // feet
  private static readonly WALKWAY_WIDTH = 3; // feet - minimum walkway width
  private static readonly PERIMETER_SPACE = 2; // feet - space from walls

  static calculateBedLayout(
    greenhouseDimensions: GreenhouseDimensions,
    selectedCrops: SelectedCrop[]
  ): { layout: BedLayout; bedConfigs: GrowBedConfig[] } {
    
    // Calculate available growing space (minus perimeter space)
    const availableLength = greenhouseDimensions.length - (2 * this.PERIMETER_SPACE);
    const availableWidth = greenhouseDimensions.width - (2 * this.PERIMETER_SPACE);
    
    // Calculate total beds needed
    const totalBedsNeeded = selectedCrops.reduce((sum, crop) => sum + crop.bedsAllocated, 0);
    
    // Determine optimal layout configuration
    const layoutOptions = this.calculateLayoutOptions(availableLength, availableWidth);
    const bestLayout = this.selectBestLayout(layoutOptions, totalBedsNeeded);
    
    // Create bed configurations for each crop
    const bedConfigs = this.createBedConfigurations(selectedCrops, bestLayout);
    
    // Calculate total footprint including walkways
    const totalFootprint = {
      length: bestLayout.bedsPerRow * this.STANDARD_BED_LENGTH + 
              (bestLayout.bedsPerRow - 1) * this.WALKWAY_WIDTH + 
              (2 * this.PERIMETER_SPACE),
      width: bestLayout.rows * this.STANDARD_BED_WIDTH + 
             (bestLayout.rows - 1) * this.WALKWAY_WIDTH + 
             (2 * this.PERIMETER_SPACE)
    };
    
    const layout: BedLayout = {
      totalBeds: bestLayout.totalBeds,
      bedsPerRow: bestLayout.bedsPerRow,
      rows: bestLayout.rows,
      walkwayWidth: this.WALKWAY_WIDTH,
      totalFootprint
    };
    
    return { layout, bedConfigs };
  }

  private static calculateLayoutOptions(availableLength: number, availableWidth: number): any[] {
    const options = [];
    
    // Calculate maximum beds that can fit in each direction
    const maxBedsLengthwise = Math.floor(
      (availableLength + this.WALKWAY_WIDTH) / (this.STANDARD_BED_LENGTH + this.WALKWAY_WIDTH)
    );
    const maxBedsWidthwise = Math.floor(
      (availableWidth + this.WALKWAY_WIDTH) / (this.STANDARD_BED_WIDTH + this.WALKWAY_WIDTH)
    );
    
    // Generate different layout configurations
    for (let bedsPerRow = 1; bedsPerRow <= maxBedsLengthwise; bedsPerRow++) {
      for (let rows = 1; rows <= maxBedsWidthwise; rows++) {
        const totalBeds = bedsPerRow * rows;
        const lengthNeeded = bedsPerRow * this.STANDARD_BED_LENGTH + 
                           (bedsPerRow - 1) * this.WALKWAY_WIDTH;
        const widthNeeded = rows * this.STANDARD_BED_WIDTH + 
                          (rows - 1) * this.WALKWAY_WIDTH;
        
        if (lengthNeeded <= availableLength && widthNeeded <= availableWidth) {
          options.push({
            bedsPerRow,
            rows,
            totalBeds,
            lengthNeeded,
            widthNeeded,
            efficiency: totalBeds / ((lengthNeeded + 2 * this.PERIMETER_SPACE) * 
                                   (widthNeeded + 2 * this.PERIMETER_SPACE))
          });
        }
      }
    }
    
    return options.sort((a, b) => b.efficiency - a.efficiency);
  }

  private static selectBestLayout(layoutOptions: any[], bedsNeeded: number): any {
    // First, try to find a layout that accommodates exactly the beds needed
    let bestLayout = layoutOptions.find(option => option.totalBeds >= bedsNeeded);
    
    // If no layout can accommodate all beds, use the most efficient one
    if (!bestLayout && layoutOptions.length > 0) {
      bestLayout = layoutOptions[0];
    }
    
    // If still no layout, create a minimal single-row layout
    if (!bestLayout) {
      bestLayout = {
        bedsPerRow: Math.min(bedsNeeded, 4),
        rows: Math.ceil(bedsNeeded / 4),
        totalBeds: bedsNeeded,
        lengthNeeded: Math.min(bedsNeeded, 4) * this.STANDARD_BED_LENGTH + 
                     (Math.min(bedsNeeded, 4) - 1) * this.WALKWAY_WIDTH,
        widthNeeded: Math.ceil(bedsNeeded / 4) * this.STANDARD_BED_WIDTH + 
                    (Math.ceil(bedsNeeded / 4) - 1) * this.WALKWAY_WIDTH
      };
    }
    
    return bestLayout;
  }

  private static createBedConfigurations(selectedCrops: SelectedCrop[], layout: any): GrowBedConfig[] {
    const bedConfigs: GrowBedConfig[] = [];
    
    selectedCrops.forEach(crop => {
      // Validate bed type for the crop
      const validation = validateBedTypeForPlant(crop.name, crop.recommendedBedType);
      
      if (!validation.isValid) {
        console.warn(`Invalid bed type for ${crop.name}: ${validation.reason}`);
        // You could throw an error here or handle it differently
        // For now, we'll log a warning but still create the configuration
      }
      
      // Get standard depth for the recommended bed type
      const depth = this.getStandardDepth(crop.recommendedBedType);
      
      const bedConfig: GrowBedConfig = {
        type: crop.recommendedBedType,
        count: crop.bedsAllocated,
        dimensions: {
          length: this.STANDARD_BED_LENGTH,
          width: this.STANDARD_BED_WIDTH,
          depth: depth
        },
        cropAssignment: crop.name,
        layout: {
          totalBeds: layout.totalBeds,
          bedsPerRow: layout.bedsPerRow,
          rows: layout.rows,
          walkwayWidth: this.WALKWAY_WIDTH,
          totalFootprint: {
            length: layout.lengthNeeded + (2 * this.PERIMETER_SPACE),
            width: layout.widthNeeded + (2 * this.PERIMETER_SPACE)
          }
        }
      };
      
      bedConfigs.push(bedConfig);
    });
    
    return bedConfigs;
  }

  private static getStandardDepth(bedType: GrowBedType): number {
    switch (bedType) {
      case GrowBedType.FILL_AND_DRAIN:
        return 12;
      case GrowBedType.STANDING_SOIL:
        return 18;
      case GrowBedType.WICKING:
        return 14;
      case GrowBedType.NFT:
        return 4;
      case GrowBedType.DWC:
        return 10;
      case GrowBedType.MEDIA_BED:
        return 12;
      default:
        return 12;
    }
  }

  static generateLayoutVisualization(layout: BedLayout): string {
    let visualization = '';
    const bedChar = '▓';
    const walkwayChar = '░';
    const spaceChar = ' ';
    
    // Create a simple ASCII representation
    for (let row = 0; row < layout.rows; row++) {
      // Bed row
      visualization += spaceChar.repeat(this.PERIMETER_SPACE);
      for (let bedInRow = 0; bedInRow < layout.bedsPerRow; bedInRow++) {
        visualization += bedChar.repeat(8); // 8 chars for 8 feet
        if (bedInRow < layout.bedsPerRow - 1) {
          visualization += walkwayChar.repeat(3); // 3 chars for 3 feet walkway
        }
      }
      visualization += spaceChar.repeat(this.PERIMETER_SPACE) + '\n';
      
      // Walkway row (except after last row)
      if (row < layout.rows - 1) {
        visualization += walkwayChar.repeat(layout.totalFootprint.length) + '\n';
      }
    }
    
    return visualization;
  }

  static calculateSpaceUtilization(
    greenhouseDimensions: GreenhouseDimensions,
    layout: BedLayout
  ): {
    totalGreenhouseArea: number;
    totalBedArea: number;
    walkwayArea: number;
    utilizationPercentage: number;
  } {
    const totalGreenhouseArea = greenhouseDimensions.length * greenhouseDimensions.width;
    const totalBedArea = layout.totalBeds * this.STANDARD_BED_LENGTH * this.STANDARD_BED_WIDTH;
    const walkwayArea = totalGreenhouseArea - totalBedArea;
    const utilizationPercentage = (totalBedArea / totalGreenhouseArea) * 100;
    
    return {
      totalGreenhouseArea,
      totalBedArea,
      walkwayArea,
      utilizationPercentage
    };
  }
}