/**
 * ==========================================================================
 * CRM Table Types — Shared Data Schema
 * ==========================================================================
 *
 * Central type definitions that drive:
 *   - ColumnManager (visibility, order, persistence)
 *   - QueryBuilder  (filter conditions, operators, parsing)
 *   - ExportEngine  (job tracking, async download)
 *   - PipelineStateMachine (stage transitions, validations)
 *
 * These types mirror the backend ObjectDefinition schema to maintain
 * a single source of truth for property metadata.
 * ==========================================================================
 */

// ---------------------------------------------------------------------------
// Property System (mirrors backend ObjectDefinition)
// ---------------------------------------------------------------------------

export type PropertyType =
  | 'TEXT' | 'NUMBER' | 'DATE' | 'DATETIME' | 'BOOLEAN'
  | 'ENUM' | 'MULTI_ENUM' | 'PHONE' | 'EMAIL' | 'URL'
  | 'CURRENCY' | 'TEXTAREA' | 'CALCULATED';

export interface PropertyOption {
  value: string;
  label: string;
  displayOrder: number;
}

export interface PropertyDefinition {
  name: string;
  label: string;
  type: PropertyType;
  groupName: string;
  required: boolean;
  indexed: boolean;
  isSystem: boolean;
  displayOrder: number;
  hidden: boolean;
  options?: PropertyOption[];
}

export interface PropertyGroup {
  name: string;
  label: string;
  displayOrder: number;
  properties: string[];
}

// ---------------------------------------------------------------------------
// Column System (ColumnManager)
// ---------------------------------------------------------------------------

export interface ColumnDef {
  key: string;
  label: string;
  type: 'text' | 'email' | 'date' | 'enum' | 'avatar' | 'number' | 'currency' | 'boolean';
  width?: string;
  sortable?: boolean;
  visible: boolean;
  pinned?: 'left' | 'right' | false;
  propertyType?: PropertyType;    // Link to schema for operator resolution
  options?: PropertyOption[];     // For enum columns
}

/** User-level column preferences (persisted per user+objectType) */
export interface ColumnPreferences {
  userId: string;
  objectType: string;
  columns: { key: string; visible: boolean; order: number; width?: string }[];
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Filter System (QueryBuilder)
// ---------------------------------------------------------------------------

export type FilterOperator =
  // Text operators
  | 'equals' | 'not_equals' | 'contains' | 'not_contains'
  | 'starts_with' | 'ends_with' | 'is_empty' | 'is_not_empty'
  // Number / Currency operators
  | 'gt' | 'gte' | 'lt' | 'lte' | 'between'
  // Date operators
  | 'before' | 'after' | 'date_between' | 'in_last_days' | 'in_next_days'
  // Enum operators
  | 'is_any_of' | 'is_none_of'
  // Boolean
  | 'is_true' | 'is_false';

export interface FilterCondition {
  id: string;                       // UUID for drag/remove
  property: string;                 // Property name (e.g., "lead_status")
  operator: FilterOperator;
  value: unknown;                   // string | number | string[] | [Date, Date]
  propertyType: PropertyType;       // For operator resolution
}

export type FilterGroupLogic = 'AND' | 'OR';

export interface FilterGroup {
  id: string;
  logic: FilterGroupLogic;
  conditions: FilterCondition[];
}

/** Serializable filter state sent to backend */
export interface FilterQuery {
  groups: FilterGroup[];
  rootLogic: FilterGroupLogic;      // How groups combine: AND / OR
}

// ---------------------------------------------------------------------------
// Sort / Pagination / Search
// ---------------------------------------------------------------------------

export interface SortState {
  field: string;
  order: 'asc' | 'desc';
}

export interface PaginationState {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ---------------------------------------------------------------------------
// Export System
// ---------------------------------------------------------------------------

export type ExportFormat = 'csv' | 'xlsx' | 'json';
export type ExportStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface ExportJob {
  id: string;
  objectType: string;
  format: ExportFormat;
  status: ExportStatus;
  filters: FilterQuery;
  sort: SortState;
  columns: string[];                // Which columns to include
  totalRecords: number;
  processedRecords: number;
  downloadUrl?: string;
  createdAt: string;
  completedAt?: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// Pipeline State Machine (Deals)
// ---------------------------------------------------------------------------

export interface PipelineStage {
  id: string;
  name: string;
  label: string;
  displayOrder: number;
  probability: number;              // Win probability % (e.g., 20, 40, 60, 80, 100)
  requiredFields: string[];         // Fields that MUST be filled to enter this stage
  color: string;
  isClosed: boolean;                // Won / Lost stages
  isWon?: boolean;
}

export interface Pipeline {
  id: string;
  name: string;
  label: string;
  stages: PipelineStage[];
  defaultStageId: string;
}

export interface StageTransitionResult {
  allowed: boolean;
  missingFields: { field: string; label: string }[];
  warnings: string[];
}

// ---------------------------------------------------------------------------
// CRM Record
// ---------------------------------------------------------------------------

export interface CrmRecord {
  id: string;
  objectType: string;
  displayName?: string;
  properties: Record<string, string>;
}

// ---------------------------------------------------------------------------
// API Response
// ---------------------------------------------------------------------------

export interface CrmListResponse {
  results: CrmRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ---------------------------------------------------------------------------
// Operator Resolution Map (PropertyType → allowed operators)
// ---------------------------------------------------------------------------

export const OPERATORS_BY_TYPE: Record<PropertyType, { value: FilterOperator; label: string }[]> = {
  TEXT: [
    { value: 'equals',        label: 'es igual a' },
    { value: 'not_equals',    label: 'no es igual a' },
    { value: 'contains',      label: 'contiene' },
    { value: 'not_contains',  label: 'no contiene' },
    { value: 'starts_with',   label: 'empieza con' },
    { value: 'ends_with',     label: 'termina con' },
    { value: 'is_empty',      label: 'esta vacio' },
    { value: 'is_not_empty',  label: 'no esta vacio' },
  ],
  TEXTAREA: [
    { value: 'contains',      label: 'contiene' },
    { value: 'not_contains',  label: 'no contiene' },
    { value: 'is_empty',      label: 'esta vacio' },
    { value: 'is_not_empty',  label: 'no esta vacio' },
  ],
  EMAIL: [
    { value: 'equals',        label: 'es igual a' },
    { value: 'contains',      label: 'contiene' },
    { value: 'ends_with',     label: 'termina con' },
    { value: 'is_empty',      label: 'esta vacio' },
    { value: 'is_not_empty',  label: 'no esta vacio' },
  ],
  PHONE: [
    { value: 'equals',        label: 'es igual a' },
    { value: 'contains',      label: 'contiene' },
    { value: 'is_empty',      label: 'esta vacio' },
    { value: 'is_not_empty',  label: 'no esta vacio' },
  ],
  URL: [
    { value: 'equals',        label: 'es igual a' },
    { value: 'contains',      label: 'contiene' },
    { value: 'is_empty',      label: 'esta vacio' },
    { value: 'is_not_empty',  label: 'no esta vacio' },
  ],
  NUMBER: [
    { value: 'equals',   label: 'es igual a' },
    { value: 'gt',       label: 'mayor que' },
    { value: 'gte',      label: 'mayor o igual que' },
    { value: 'lt',       label: 'menor que' },
    { value: 'lte',      label: 'menor o igual que' },
    { value: 'between',  label: 'esta entre' },
    { value: 'is_empty', label: 'esta vacio' },
  ],
  CURRENCY: [
    { value: 'equals',   label: 'es igual a' },
    { value: 'gt',       label: 'mayor que' },
    { value: 'lt',       label: 'menor que' },
    { value: 'between',  label: 'esta entre' },
    { value: 'is_empty', label: 'esta vacio' },
  ],
  DATE: [
    { value: 'equals',        label: 'es igual a' },
    { value: 'before',        label: 'es antes de' },
    { value: 'after',         label: 'es despues de' },
    { value: 'date_between',  label: 'esta entre' },
    { value: 'in_last_days',  label: 'en los ultimos N dias' },
    { value: 'is_empty',      label: 'esta vacio' },
  ],
  DATETIME: [
    { value: 'before',        label: 'es antes de' },
    { value: 'after',         label: 'es despues de' },
    { value: 'date_between',  label: 'esta entre' },
    { value: 'in_last_days',  label: 'en los ultimos N dias' },
    { value: 'is_empty',      label: 'esta vacio' },
  ],
  BOOLEAN: [
    { value: 'is_true',  label: 'es verdadero' },
    { value: 'is_false', label: 'es falso' },
  ],
  ENUM: [
    { value: 'is_any_of',    label: 'es cualquiera de' },
    { value: 'is_none_of',   label: 'no es ninguno de' },
    { value: 'is_empty',     label: 'esta vacio' },
    { value: 'is_not_empty', label: 'no esta vacio' },
  ],
  MULTI_ENUM: [
    { value: 'is_any_of',    label: 'contiene cualquiera de' },
    { value: 'is_none_of',   label: 'no contiene ninguno de' },
    { value: 'is_empty',     label: 'esta vacio' },
    { value: 'is_not_empty', label: 'no esta vacio' },
  ],
  CALCULATED: [
    { value: 'equals',  label: 'es igual a' },
    { value: 'gt',      label: 'mayor que' },
    { value: 'lt',      label: 'menor que' },
  ],
};
