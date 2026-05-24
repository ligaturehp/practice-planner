export type DayId = 'sat' | 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri';

export type WorkloadBand = 'low' | 'medium' | 'high' | 'max' | 'neutral';
export type WorkloadLabel = 'Low' | 'Medium' | 'High';
export type Sport = 'football' | 'rugby';
export type TemplateId = 'gameFriday' | 'gameSaturday';

export interface PlannerDay {
  id: DayId;
  label: string;
  title: string;
}

export interface TrainingBlock {
  id: string;
  name: string;
  category: string;
  level: WorkloadLabel;
  minutes: number;
  demand: number;
  tags: string[];
  exposures: string[];
  notes: string;
}

export interface BlockLabelPreset {
  id: string;
  label: string;
  category: string;
  level: WorkloadLabel;
  minutes: number;
  demand: number;
  tags: string[];
  exposures: string[];
  notes: string;
}

export type DemandGrid = Record<DayId, string[]>;
export type BlockMap = Record<DayId, TrainingBlock[]>;

export interface PlannerState {
  selectedDay: DayId;
  sport: Sport;
  template: TemplateId;
  days: PlannerDay[];
  rowLabels: string[];
  grid: DemandGrid;
  blocks: BlockMap;
  blockLabelPresets: BlockLabelPreset[];
  blockDialogOpen: boolean;
  labelConfigOpen: boolean;
  savedPlansOpen: boolean;
}

export interface DaySummary {
  day: PlannerDay;
  au: number;
  level: WorkloadLabel;
  blockCount: number;
  exposureCount: number;
}

export interface WeekSummary {
  totalAu: number;
  peakDay: string;
  exposureWatch: string;
}

export interface SavedPlan {
  id: string;
  name: string;
  updatedAt: string;
  state: PlannerState;
}

export interface ApiUser {
  id: string;
  email: string;
  created_at: string;
}

export interface ApiPlan {
  id: string;
  name: string;
  sport: Sport;
  template: TemplateId;
  plan_json: PlannerState;
  created_at: string;
  updated_at: string;
}
