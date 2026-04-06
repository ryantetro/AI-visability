import type { DimensionKey, WebHealthPillarKey, AuditCategory, EffortBand } from './score';

export type ActionType = 'fix' | 'keep_doing';
export type ManualStatus = 'pending' | 'done';
export type ScanStatus = 'pass' | 'fail' | 'unknown';

/** Row shape returned from the API after sync */
export interface ActionChecklistItem {
  checkId: string;
  actionType: ActionType;
  manualStatus: ManualStatus;
  scanStatus: ScanStatus;
  label: string;
  detail: string;
  dimension: DimensionKey | WebHealthPillarKey | null;
  category: AuditCategory | null;
  estimatedLift: number;
  effortBand: EffortBand | null;
  copyPrompt: string | null;
  isComplete: boolean;
  isRegression: boolean;
}

export interface ActionChecklistSummary {
  total: number;
  complete: number;
  remaining: number;
  potentialLift: number;
}

export interface SyncResponse {
  items: ActionChecklistItem[];
  summary: ActionChecklistSummary;
}

export interface ToggleResponse {
  checkId: string;
  manualStatus: ManualStatus;
  scanStatus: ScanStatus;
  isComplete: boolean;
  isRegression: boolean;
  updatedAt: string;
}

export interface CountResponse {
  remaining: number;
}

/** Payload shape sent to sync endpoint */
export interface SyncItemPayload {
  checkId: string;
  actionType: ActionType;
  scanStatus: ScanStatus;
  label: string;
  detail: string;
  dimension: DimensionKey | WebHealthPillarKey | null;
  category: AuditCategory | null;
  estimatedLift: number;
  effortBand: EffortBand | null;
  copyPrompt: string | null;
}

export type ActionViewMode = 'priority' | 'category' | 'effort';
export type ActionStatusFilter = 'all' | 'todo' | 'done';
