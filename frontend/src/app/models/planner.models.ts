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
export type CellDemandGrid = Record<DayId, number[]>;
export type BlockMap = Record<DayId, TrainingBlock[]>;

export interface PlannerState {
  selectedDay: DayId;
  sport: Sport;
  template: TemplateId;
  days: PlannerDay[];
  rowLabels: string[];
  grid: DemandGrid;
  cellDemands: CellDemandGrid;
  blocks: BlockMap;
  blockLabelPresets: BlockLabelPreset[];
  blockDialogOpen: boolean;
  labelConfigOpen: boolean;
  inspectorOpen: boolean;
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
  lockVersion?: number;
  state: PlannerState;
}

export interface PlanVersion {
  id: string;
  planId: string;
  name: string;
  updatedAt: string;
  lockVersion: number;
  state: PlannerState;
}

export interface PlanShare {
  id: string;
  planId: string;
  token: string;
  url: string;
  createdAt: string;
}

export interface ApiUser {
  id: string;
  email: string;
  created_at: string;
}

export interface Organization {
  id: string;
  name: string;
  role: 'owner' | 'member';
  created_at: string;
}

export interface ApiPlan {
  id: string;
  name: string;
  sport: Sport;
  template: TemplateId;
  plan_json: PlannerState;
  lock_version: number;
  created_at: string;
  updated_at: string;
}

export interface ApiPlanVersion {
  id: string;
  plan_id: string;
  name: string;
  sport: Sport;
  template: TemplateId;
  plan_json: PlannerState;
  lock_version: number;
  created_at: string;
}

export interface ApiPlanShare {
  id: string;
  plan_id: string;
  token: string;
  created_at: string;
}
