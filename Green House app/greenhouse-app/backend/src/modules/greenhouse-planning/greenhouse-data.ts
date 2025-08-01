import { GreenhouseTypeSpecs, GreenhouseType, GrowBedType } from './greenhouse-planning.types';

export const GREENHOUSE_TYPES: GreenhouseTypeSpecs[] = [
  {
    type: GreenhouseType.HOOP_HOUSE,
    name: 'Hoop House (High Tunnel)',
    description: 'Simple arched structure covered with polyethylene plastic',
    advantages: [
      'Low cost',
      'Easy to construct',
      'Good for season extension',
      'Minimal foundation required'
    ],
    disadvantages: [
      'Limited snow load capacity',
      'Plastic needs replacement every 3-5 years',
      'Less insulation than rigid structures'
    ],
    bestFor: ['Season extension', 'Row crops', 'Budget-conscious growers'],
    typicalDimensions: {
      minWidth: 12,
      maxWidth: 30,
      minLength: 20,
      maxLength: 200,
      typicalHeight: 12
    },
    structuralRequirements: [
      'Ground posts every 4-6 feet',
      'End wall framing',
      'Roll-up sides for ventilation'
    ],
    estimatedCostRange: {
      min: 3,
      max: 8,
      unit: 'per sq ft'
    }
  },
  {
    type: GreenhouseType.GEODESIC_DOME,
    name: 'Geodesic Dome',
    description: 'Spherical structure made of triangular elements',
    advantages: [
      'Excellent strength-to-weight ratio',
      'Superior wind and snow resistance',
      'Even light distribution',
      'Energy efficient shape'
    ],
    disadvantages: [
      'Complex construction',
      'Inefficient use of growing space',
      'Difficult to install equipment'
    ],
    bestFor: ['Extreme weather areas', 'Aesthetic appeal', 'Educational facilities'],
    typicalDimensions: {
      minWidth: 15,
      maxWidth: 50,
      minLength: 15,
      maxLength: 50,
      typicalHeight: 15
    },
    structuralRequirements: [
      'Precision-cut struts',
      'Hub connectors',
      'Foundation ring',
      'Triangular panels'
    ],
    estimatedCostRange: {
      min: 10,
      max: 25,
      unit: 'per sq ft'
    }
  },
  {
    type: GreenhouseType.TRADITIONAL_GABLE,
    name: 'Traditional Gable (A-Frame)',
    description: 'Classic peaked roof design with straight sidewalls',
    advantages: [
      'Maximum headroom',
      'Easy to install equipment',
      'Good snow shedding',
      'Traditional appearance'
    ],
    disadvantages: [
      'Higher construction cost',
      'More materials required',
      'Complex roof framing'
    ],
    bestFor: ['Permanent installations', 'Mixed crop production', 'Retail operations'],
    typicalDimensions: {
      minWidth: 12,
      maxWidth: 40,
      minLength: 20,
      maxLength: 150,
      typicalHeight: 14
    },
    structuralRequirements: [
      'Foundation (concrete or treated lumber)',
      'Sidewall posts',
      'Roof trusses',
      'Purlins and glazing bars'
    ],
    estimatedCostRange: {
      min: 8,
      max: 20,
      unit: 'per sq ft'
    }
  },
  {
    type: GreenhouseType.QUONSET,
    name: 'Quonset Hut',
    description: 'Semi-circular arch structure, similar to hoop house but more robust',
    advantages: [
      'Simple construction',
      'Good structural strength',
      'Efficient material use',
      'Easy to expand'
    ],
    disadvantages: [
      'Limited headroom at sides',
      'Curved walls limit equipment placement',
      'Can have condensation issues'
    ],
    bestFor: ['Commercial production', 'Nurseries', 'Storage combined with growing'],
    typicalDimensions: {
      minWidth: 16,
      maxWidth: 40,
      minLength: 30,
      maxLength: 200,
      typicalHeight: 14
    },
    structuralRequirements: [
      'Arched steel ribs',
      'Foundation rails',
      'End wall framing',
      'Ventilation system'
    ],
    estimatedCostRange: {
      min: 6,
      max: 15,
      unit: 'per sq ft'
    }
  },
  {
    type: GreenhouseType.GOTHIC_ARCH,
    name: 'Gothic Arch',
    description: 'Pointed arch design combining hoop house simplicity with better snow shedding',
    advantages: [
      'Excellent snow shedding',
      'More headroom than quonset',
      'Strong structure',
      'Good for heavy snow areas'
    ],
    disadvantages: [
      'Slightly more complex than hoop house',
      'Custom bend required for arches',
      'Limited suppliers'
    ],
    bestFor: ['Snow-prone regions', 'Year-round production', 'Commercial growers'],
    typicalDimensions: {
      minWidth: 20,
      maxWidth: 30,
      minLength: 40,
      maxLength: 150,
      typicalHeight: 15
    },
    structuralRequirements: [
      'Gothic-bent steel arches',
      'Ground posts',
      'Ridge ventilation',
      'Snow bracing'
    ],
    estimatedCostRange: {
      min: 7,
      max: 16,
      unit: 'per sq ft'
    }
  },
  {
    type: GreenhouseType.LEAN_TO,
    name: 'Lean-To (Attached)',
    description: 'Half greenhouse structure attached to existing building',
    advantages: [
      'Lower construction cost',
      'Shares heat with building',
      'Easy access from building',
      'Protected from prevailing winds'
    ],
    disadvantages: [
      'Limited size options',
      'Orientation dependent on building',
      'Potential shading from building',
      'Less light than freestanding'
    ],
    bestFor: ['Home gardens', 'Limited space', 'Propagation houses'],
    typicalDimensions: {
      minWidth: 8,
      maxWidth: 20,
      minLength: 10,
      maxLength: 50,
      typicalHeight: 12
    },
    structuralRequirements: [
      'Wall attachment system',
      'Sloped rafters',
      'Foundation along outer edge',
      'Gutter system'
    ],
    estimatedCostRange: {
      min: 5,
      max: 15,
      unit: 'per sq ft'
    }
  },
  {
    type: GreenhouseType.PIT_GREENHOUSE,
    name: 'Pit Greenhouse (Walipini)',
    description: 'Earth-sheltered greenhouse built below grade',
    advantages: [
      'Excellent thermal mass',
      'Natural temperature regulation',
      'Protection from wind',
      'Year-round growing in cold climates'
    ],
    disadvantages: [
      'Excavation required',
      'Drainage considerations',
      'Limited natural light',
      'Higher initial construction cost'
    ],
    bestFor: ['Cold climates', 'Year-round production', 'Sustainable design'],
    typicalDimensions: {
      minWidth: 12,
      maxWidth: 20,
      minLength: 20,
      maxLength: 80,
      typicalHeight: 8
    },
    structuralRequirements: [
      'Excavation 6-8 feet deep',
      'Retaining walls',
      'Drainage system',
      'Angled roof for solar gain'
    ],
    estimatedCostRange: {
      min: 10,
      max: 30,
      unit: 'per sq ft'
    }
  }
];

export const GROW_BED_SPECIFICATIONS = {
  [GrowBedType.FILL_AND_DRAIN]: {
    name: 'Fill and Drain (Ebb and Flow)',
    description: 'Periodic flooding and draining of grow beds',
    idealDepth: { min: 12, max: 16 },
    bestCrops: ['Leafy greens', 'Herbs', 'Tomatoes', 'Peppers'],
    materials: ['Expanded clay', 'Perlite', 'Lava rock'],
    pros: ['Good oxygenation', 'Versatile', 'Easy automation'],
    cons: ['Requires reliable pump', 'Power dependent']
  },
  [GrowBedType.STANDING_SOIL]: {
    name: 'Standing Soil Beds',
    description: 'Traditional raised beds with soil mix',
    idealDepth: { min: 8, max: 24 },
    bestCrops: ['Root vegetables', 'Large plants', 'Perennials'],
    materials: ['Compost', 'Topsoil', 'Peat/Coir', 'Amendments'],
    pros: ['Familiar method', 'No power needed', 'Good for all crops'],
    cons: ['Heavy', 'Requires more water', 'Soil-borne disease risk']
  },
  [GrowBedType.WICKING]: {
    name: 'Wicking Beds',
    description: 'Self-watering beds with water reservoir below soil',
    idealDepth: { min: 12, max: 18 },
    bestCrops: ['Vegetables', 'Herbs', 'Small fruits'],
    materials: ['Soil mix', 'Gravel reservoir', 'Geotextile'],
    pros: ['Water efficient', 'Low maintenance', 'Consistent moisture'],
    cons: ['Initial setup complexity', 'Limited to smaller plants']
  },
  [GrowBedType.NFT]: {
    name: 'Nutrient Film Technique',
    description: 'Thin film of nutrient solution flows through channels',
    idealDepth: { min: 3, max: 4 },
    bestCrops: ['Lettuce', 'Herbs', 'Strawberries'],
    materials: ['NFT channels', 'Pump', 'Reservoir'],
    pros: ['Water efficient', 'No growing medium', 'Fast growth'],
    cons: ['Power dependent', 'Limited to small plants', 'Vulnerable to pump failure']
  },
  [GrowBedType.DWC]: {
    name: 'Deep Water Culture',
    description: 'Roots suspended in oxygenated nutrient solution',
    idealDepth: { min: 8, max: 12 },
    bestCrops: ['Lettuce', 'Herbs', 'Bok choy'],
    materials: ['Reservoir', 'Air pump', 'Net pots', 'Growing medium'],
    pros: ['Fast growth', 'High yields', 'Simple design'],
    cons: ['Requires constant aeration', 'Temperature sensitive', 'Power dependent']
  },
  [GrowBedType.MEDIA_BED]: {
    name: 'Media Bed (Constant Flow)',
    description: 'Continuous flow through inert growing medium',
    idealDepth: { min: 10, max: 14 },
    bestCrops: ['Tomatoes', 'Cucumbers', 'Peppers', 'Herbs'],
    materials: ['Hydroton', 'Perlite', 'Coconut coir'],
    pros: ['Good support for plants', 'Flexible', 'Good filtration'],
    cons: ['Medium replacement needed', 'Can clog over time']
  }
};

export const COMPANION_PLANTING_DATA = {
  'Tomatoes': {
    companions: [
      { plant: 'Basil', benefit: 'Repels aphids and whiteflies, improves flavor' },
      { plant: 'Carrots', benefit: 'Loosens soil' },
      { plant: 'Marigolds', benefit: 'Deters pests' },
      { plant: 'Nasturtiums', benefit: 'Trap crop for aphids' }
    ],
    antagonists: [
      { plant: 'Brassicas', reason: 'Stunts growth' },
      { plant: 'Fennel', reason: 'Inhibits growth' }
    ]
  },
  'Lettuce': {
    companions: [
      { plant: 'Radishes', benefit: 'Breaks up soil, fast harvest' },
      { plant: 'Carrots', benefit: 'Different root depths' },
      { plant: 'Chives', benefit: 'Deters aphids' },
      { plant: 'Strawberries', benefit: 'Mutual benefit' }
    ],
    antagonists: [
      { plant: 'Parsley', reason: 'Competes for nutrients' }
    ]
  },
  'Peppers': {
    companions: [
      { plant: 'Basil', benefit: 'Improves growth and flavor' },
      { plant: 'Onions', benefit: 'Deters pests' },
      { plant: 'Spinach', benefit: 'Different nutrient needs' },
      { plant: 'Tomatoes', benefit: 'Similar growing conditions' }
    ],
    antagonists: [
      { plant: 'Beans', reason: 'Can stunt pepper growth' },
      { plant: 'Brassicas', reason: 'Different soil pH needs' }
    ]
  },
  'Cucumbers': {
    companions: [
      { plant: 'Beans', benefit: 'Nitrogen fixation' },
      { plant: 'Radishes', benefit: 'Deters cucumber beetles' },
      { plant: 'Peas', benefit: 'Nitrogen fixation' },
      { plant: 'Sunflowers', benefit: 'Provides trellis' }
    ],
    antagonists: [
      { plant: 'Aromatic herbs', reason: 'Can affect flavor' },
      { plant: 'Potatoes', reason: 'Increases disease risk' }
    ]
  },
  'Beans': {
    companions: [
      { plant: 'Corn', benefit: 'Natural trellis' },
      { plant: 'Squash', benefit: 'Three sisters planting' },
      { plant: 'Carrots', benefit: 'Different nutrient needs' },
      { plant: 'Cucumbers', benefit: 'Mutual benefit' }
    ],
    antagonists: [
      { plant: 'Onions', reason: 'Inhibits growth' },
      { plant: 'Garlic', reason: 'Inhibits growth' }
    ]
  }
};