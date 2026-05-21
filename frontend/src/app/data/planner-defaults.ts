import { BlockMap, DayId, DemandGrid, PlannerDay, PlannerState, Sport, TemplateId } from '../models/planner.models';

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

export function createGrid(templateId: TemplateId): DemandGrid {
  const template = TEMPLATES[templateId];

  return DAY_IDS.reduce((grid, dayId) => {
    grid[dayId] = [...template[dayId]];
    return grid;
  }, {} as DemandGrid);
}

export function createEmptyBlocks(): BlockMap {
  return DAY_IDS.reduce((blocks, dayId) => {
    blocks[dayId] = [];
    return blocks;
  }, {} as BlockMap);
}

export function createInitialBlocks(): BlockMap {
  return {
    ...createEmptyBlocks(),
    mon: [
      {
        id: createId('block'),
        name: 'Lower-body strength emphasis',
        category: 'Strength',
        level: 'Medium',
        minutes: 40,
        demand: 7,
        tags: ['heavy sets', 'team lift', 'moderate volume'],
        exposures: ['Heavy sets', 'Total volume load'],
        notes: 'Main strength exposure for the week. Keep technical field volume controlled.',
      },
    ],
    tue: [
      {
        id: createId('block'),
        name: 'Full-contact competitive period',
        category: 'Contact',
        level: 'High',
        minutes: 28,
        demand: 9,
        tags: ['contact', 'full scheme', 'decision speed'],
        exposures: ['Accelerations/decelerations', 'Change-of-direction volume'],
        notes: 'Primary contact and decision-making stressor. Watch stacking with gym power work.',
      },
    ],
    thu: [
      {
        id: createId('block'),
        name: 'Short max speed exposure',
        category: 'Speed',
        level: 'Medium',
        minutes: 18,
        demand: 8,
        tags: ['max speed', 'full rest', 'low volume'],
        exposures: ['Max sprint count', 'High-speed running'],
        notes: 'Sharp exposure without turning Thursday into a volume day.',
      },
    ],
  };
}

export function rowLabelsForSport(sport: Sport): string[] {
  return sport === 'rugby' ? [...RUGBY_ROW_LABELS] : [...FOOTBALL_ROW_LABELS];
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
    blocks: createInitialBlocks(),
    blockDialogOpen: false,
    authPanelOpen: false,
    savedPlansOpen: false,
  };
}

export function createId(prefix = 'id'): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
