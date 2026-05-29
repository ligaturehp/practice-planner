import { BlockLabelPreset, BlockMap, CellDemandGrid, DayId, DemandGrid, PlannerDay, PlannerState, Sport, TemplateId } from '../models/planner.models';

export const DAYS: PlannerDay[] = [
  { id: 'sat', label: 'SAT', title: 'Recovery' },
  { id: 'sun', label: 'SUN', title: 'Active Recovery' },
  { id: 'mon', label: 'MON', title: 'Install' },
  { id: 'tue', label: 'TUE', title: 'Contact' },
  { id: 'wed', label: 'WED', title: 'Specials' },
  { id: 'thu', label: 'THU', title: 'Execution + Speed' },
  { id: 'fri', label: 'FRI', title: 'Game' },
];

export const DAY_IDS: DayId[] = DAYS.map((day) => day.id);

export const FOOTBALL_ROW_LABELS = [
  'Pace',
  'Work / rest',
  'Ball in play',
  'Contact',
  'Volume',
  'Tactical focus',
  'Technical skill',
  'Decision making',
  'Speed exposure',
  'S&C emphasis',
  'Recovery emphasis',
];

export const RUGBY_ROW_LABELS = [
  'Pace',
  'Work / rest',
  'Ball in play',
  'Contact',
  'Volume',
  'Attack / defense',
  'Unit skills',
  'Decision making',
  'Speed exposure',
  'S&C emphasis',
  'Recovery emphasis',
];

export const ROW_BLOCK_CATEGORIES: Record<string, string[]> = {
  'Attack / defense': ['Tactical'],
  Contact: ['Contact'],
  'Tactical focus': ['Tactical'],
  'Technical skill': ['Technical skill'],
  'Unit skills': ['Technical skill'],
  'Decision making': ['Decision making'],
  'Speed exposure': ['Speed'],
  'S&C emphasis': ['Strength', 'Conditioning'],
  'Recovery emphasis': ['Recovery'],
};

export const EXPOSURE_OPTIONS = [
  'Max sprint count',
  'High-speed running',
  'Accelerations/decelerations',
  'Jump/landing contacts',
  'Change-of-direction volume',
  'Heavy sets',
  'Near failure sets',
  'Velocity loss',
];

export const DEFAULT_BLOCK_LABEL_PRESETS: BlockLabelPreset[] = [
  {
    id: 'preset-max-velocity',
    label: 'Max velocity exposure',
    category: 'Speed',
    level: 'Medium',
    minutes: 18,
    demand: 8,
    tags: ['max speed', 'full rest', 'field space'],
    exposures: ['Max sprint count', 'High-speed running'],
    notes: 'Build full recovery between reps. Keep volume low if contact is high later in the week.',
  },
  {
    id: 'preset-contact',
    label: 'Full-contact competitive period',
    category: 'Contact',
    level: 'High',
    minutes: 28,
    demand: 9,
    tags: ['contact', 'full scheme', 'decision speed'],
    exposures: ['Accelerations/decelerations', 'Change-of-direction volume'],
    notes: 'Primary contact and decision-making stressor. Watch stacking with gym power work.',
  },
  {
    id: 'preset-strength',
    label: 'Lower-body strength emphasis',
    category: 'Strength',
    level: 'Medium',
    minutes: 40,
    demand: 7,
    tags: ['heavy sets', 'team lift', 'moderate volume'],
    exposures: ['Heavy sets'],
    notes: 'Main strength exposure for the week. Keep technical field volume controlled.',
  },
  {
    id: 'preset-walkthrough',
    label: 'Walk-through install',
    category: 'Tactical',
    level: 'Low',
    minutes: 25,
    demand: 3,
    tags: ['install', 'walk-through', 'low strain'],
    exposures: [],
    notes: 'Low physical cost period for tactical alignment and communication.',
  },
];

export const TEMPLATES: Record<TemplateId, DemandGrid> = {
  gameFriday: {
    sat: ['Rest', '-', '-', '-', '-', 'Restore', 'Mobility', '-', 'None', 'Recovery', 'High'],
    sun: ['Easy', 'Longer rest', '< 10 min', 'None', 'Low', 'Walk-thru', 'Fundamentals', 'Low', 'None', 'Recovery', 'Moderate'],
    mon: ['Moderate', 'Longer rest', '10-15 min', 'None', 'Moderate', 'Install', 'Position skill', 'Moderate', 'Build', 'Strength', 'Low'],
    tue: ['Fast', 'Short rest', '20-30 min', 'Full contact', 'High', 'Full scheme', 'Competitive', 'High', 'Accel / COD', 'Power', 'Low'],
    wed: ['Moderate', 'Moderate rest', '10-15 min', 'Limited', 'Moderate', 'Situational', 'Technique', 'Medium', 'Low sprint', 'Volume', 'Moderate'],
    thu: ['Fast', 'Short + sharp', '15-20 min', 'Limited', 'Low', 'Reps + speed', 'Sharp', 'Medium', 'Max speed', 'Power / speed', 'Low'],
    fri: ['Max', '-', 'Game', 'Game contact', 'Game', 'Game', 'Game', 'High', 'Game', 'Activate', '-'],
  },
  gameSaturday: {
    sat: ['Max', '-', 'Game', 'Game contact', 'Game', 'Game', 'Game', 'High', 'Game', 'Activate', '-'],
    sun: ['Rest', '-', '-', '-', '-', 'Restore', 'Mobility', '-', 'None', 'Recovery', 'High'],
    mon: ['Easy', 'Longer rest', '< 10 min', 'None', 'Low', 'Install', 'Fundamentals', 'Low', 'None', 'Recovery', 'Moderate'],
    tue: ['Moderate', 'Longer rest', '10-15 min', 'Controlled', 'Moderate', 'Install', 'Position skill', 'Moderate', 'Build', 'Strength', 'Low'],
    wed: ['Fast', 'Short rest', '20-30 min', 'Full contact', 'High', 'Full scheme', 'Competitive', 'High', 'Accel / COD', 'Power', 'Low'],
    thu: ['Moderate', 'Moderate rest', '10-15 min', 'Limited', 'Moderate', 'Situational', 'Technique', 'Medium', 'Low sprint', 'Volume', 'Moderate'],
    fri: ['Fast', 'Short + sharp', '15-20 min', 'Limited', 'Low', 'Reps + speed', 'Sharp', 'Medium', 'Max speed', 'Power / speed', 'Low'],
  },
};

export const CELL_INTENT_DEMANDS: Record<string, number> = {
  '-': 0,
  off: 0,
  rest: 0,
  restore: 1,
  mobility: 1,
  easy: 1,
  slow: 1,
  none: 1,
  low: 1,
  recovery: 1,
  'full rest': 1,
  'longer rest': 1,
  'long rest': 1,
  'walk-thru': 1,
  'walk-through': 1,
  fundamentals: 1,
  'position skill': 2,
  moderate: 2,
  medium: 2,
  'moderate rest': 2,
  build: 2,
  controlled: 2,
  limited: 2,
  install: 2,
  situational: 2,
  technique: 2,
  strength: 2,
  volume: 2,
  'low sprint': 2,
  fast: 3,
  high: 3,
  'short rest': 3,
  'short + sharp': 3,
  '30+ min': 3,
  '20-30 min': 3,
  '15-20 min': 2,
  '10-15 min': 2,
  '< 10 min': 1,
  'full contact': 3,
  'full scheme': 3,
  competitive: 3,
  'accel / cod': 3,
  power: 3,
  sharp: 3,
  'reps + speed': 3,
  'power / speed': 3,
  max: 4,
  game: 4,
  'game contact': 4,
  activate: 2,
};

export const SWIM_LANE_INTENT_OPTIONS: Record<string, string[]> = {
  Pace: ['Rest', 'Slow', 'Moderate', 'Fast', 'Max', 'Game'],
  'Work / rest': ['-', 'Full rest', 'Long rest', 'Longer rest', 'Moderate rest', 'Short rest', 'Short + sharp'],
  'Ball in play': ['-', '< 10 min', '10-15 min', '15-20 min', '20-30 min', '30+ min', 'Game'],
  Contact: ['-', 'None', 'Controlled', 'Limited', 'Full contact', 'Game contact'],
  Volume: ['-', 'Low', 'Moderate', 'High', 'Game'],
  'Tactical focus': ['Restore', 'Walk-thru', 'Install', 'Situational', 'Full scheme', 'Reps + speed', 'Game'],
  'Attack / defense': ['Restore', 'Walk-thru', 'Install', 'Situational', 'Full scheme', 'Reps + speed', 'Game'],
  'Technical skill': ['Mobility', 'Fundamentals', 'Position skill', 'Technique', 'Competitive', 'Sharp', 'Game'],
  'Unit skills': ['Mobility', 'Fundamentals', 'Position skill', 'Technique', 'Competitive', 'Sharp', 'Game'],
  'Decision making': ['-', 'Low', 'Medium', 'Moderate', 'High', 'Game'],
  'Speed exposure': ['None', 'Build', 'Low sprint', 'Accel / COD', 'Max speed', 'Game'],
  'S&C emphasis': ['Recovery', 'Strength', 'Power', 'Volume', 'Power / speed', 'Activate'],
  'Recovery emphasis': ['-', 'Low', 'Moderate', 'High'],
};

export function createGrid(templateId: TemplateId): DemandGrid {
  const template = TEMPLATES[templateId];

  return DAY_IDS.reduce((grid, dayId) => {
    grid[dayId] = [...template[dayId]];
    return grid;
  }, {} as DemandGrid);
}

export function demandForCellIntent(value: string, label = ''): number {
  const normalized = value.trim().toLowerCase();
  if (label === 'Recovery emphasis') {
    if (normalized === 'high') return 1;
    if (normalized === 'moderate' || normalized === 'medium') return 2;
    if (normalized === 'low') return 3;
  }
  if (CELL_INTENT_DEMANDS[normalized] !== undefined) {
    return CELL_INTENT_DEMANDS[normalized];
  }
  if (normalized.includes('game')) return 4;
  if (normalized.includes('full') || normalized.includes('high')) return 3;
  if (normalized.includes('moderate') || normalized.includes('medium')) return 2;
  if (normalized.includes('low') || normalized.includes('easy') || normalized.includes('recovery')) return 1;
  return 0;
}

export function createCellDemands(templateId: TemplateId, sport: Sport = 'football'): CellDemandGrid {
  const grid = createGrid(templateId);
  const rowLabels = rowLabelsForSport(sport);

  return DAY_IDS.reduce((demands, dayId) => {
    demands[dayId] = grid[dayId].map((value, index) => demandForCellIntent(value, rowLabels[index]));
    return demands;
  }, {} as CellDemandGrid);
}

export function createEmptyBlocks(): BlockMap {
  return DAY_IDS.reduce((blocks, dayId) => {
    blocks[dayId] = [];
    return blocks;
  }, {} as BlockMap);
}

export function createBlockLabelPresets(): BlockLabelPreset[] {
  return DEFAULT_BLOCK_LABEL_PRESETS.map((preset) => ({
    ...preset,
    tags: [...preset.tags],
    exposures: [...preset.exposures],
  }));
}

export function rowLabelsForSport(sport: Sport): string[] {
  return sport === 'rugby' ? [...RUGBY_ROW_LABELS] : [...FOOTBALL_ROW_LABELS];
}

export function cellIntentOptions(label: string): string[] {
  return SWIM_LANE_INTENT_OPTIONS[label] || ['-', 'Low', 'Moderate', 'High', 'Game'];
}

export function createInitialState(): PlannerState {
  const sport: Sport = 'football';
  const template: TemplateId = 'gameFriday';

  return {
    selectedDay: 'mon',
    sport,
    template,
    days: DAYS.map((day) => ({ ...day })),
    rowLabels: rowLabelsForSport(sport),
    grid: createGrid(template),
    cellDemands: createCellDemands(template, sport),
    blocks: createEmptyBlocks(),
    blockLabelPresets: createBlockLabelPresets(),
    blockDialogOpen: false,
    labelConfigOpen: false,
    inspectorOpen: false,
    savedPlansOpen: false,
  };
}

export function createId(prefix = 'id'): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
