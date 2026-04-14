'use client';

import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef, useMemo } from 'react';
import type {
  ColumnDef, FilterQuery, FilterGroup, FilterCondition, FilterGroupLogic,
  SortState, PaginationState, CrmRecord, CrmListResponse,
  ExportJob, ExportFormat, ColumnPreferences,
} from './types';

/**
 * ==========================================================================
 * CRM Table Context (React Context + useReducer)
 * ==========================================================================
 *
 * Single source of truth for the entire CRM table view:
 *   - Columns (visibility, order, persistence)
 *   - Filters (query builder conditions)
 *   - Sort, pagination, search
 *   - Record data + loading states
 *   - Selection (checkbox state)
 *   - Export jobs
 *
 * Uses useReducer for predictable state transitions.
 * Debounces search/filter changes before hitting the API.
 * ==========================================================================
 */

// ---------------------------------------------------------------------------
// State Shape
// ---------------------------------------------------------------------------

interface CrmTableState {
  objectType: string;
  columns: ColumnDef[];
  search: string;
  debouncedSearch: string;
  sort: SortState;
  pagination: PaginationState;
  filters: FilterQuery;
  activeFilterCount: number;

  records: CrmRecord[];
  loading: boolean;
  error: string | null;

  selectedIds: Set<string>;

  // UI panels
  showColumnEditor: boolean;
  showFilterBuilder: boolean;
  showExportPanel: boolean;
  showSortPanel: boolean;

  // View
  activeTabIndex: number;
  viewType: 'table' | 'board';

  // My records (user's own tracked records)
  myRecordIds: Set<string>;

  // Record detail
  selectedRecordId: string | null;

  // Export
  exportJobs: ExportJob[];
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

type Action =
  | { type: 'SET_SEARCH'; payload: string }
  | { type: 'SET_DEBOUNCED_SEARCH'; payload: string }
  | { type: 'SET_SORT'; payload: SortState }
  | { type: 'SET_PAGE'; payload: number }
  | { type: 'SET_COLUMNS'; payload: ColumnDef[] }
  | { type: 'TOGGLE_COLUMN'; payload: string }
  | { type: 'REORDER_COLUMNS'; payload: { fromIndex: number; toIndex: number } }
  | { type: 'SET_FILTERS'; payload: FilterQuery }
  | { type: 'ADD_FILTER_CONDITION'; payload: FilterCondition }
  | { type: 'UPDATE_FILTER_CONDITION'; payload: { id: string; updates: Partial<FilterCondition> } }
  | { type: 'REMOVE_FILTER_CONDITION'; payload: string }
  | { type: 'CLEAR_FILTERS' }
  | { type: 'SET_FILTER_GROUP_LOGIC'; payload: { groupId: string; logic: FilterGroupLogic } }
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; payload: CrmListResponse }
  | { type: 'FETCH_ERROR'; payload: string }
  | { type: 'TOGGLE_SELECT'; payload: string }
  | { type: 'TOGGLE_SELECT_ALL' }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'TOGGLE_COLUMN_EDITOR' }
  | { type: 'TOGGLE_FILTER_BUILDER' }
  | { type: 'TOGGLE_EXPORT_PANEL' }
  | { type: 'CLOSE_ALL_PANELS' }
  | { type: 'TOGGLE_SORT_PANEL' }
  | { type: 'SET_ACTIVE_TAB'; payload: number }
  | { type: 'SET_VIEW_TYPE'; payload: 'table' | 'board' }
  | { type: 'ADD_TO_MY_RECORDS'; payload: string }
  | { type: 'REMOVE_FROM_MY_RECORDS'; payload: string }
  | { type: 'TOGGLE_MY_RECORD'; payload: string }
  | { type: 'SELECT_RECORD'; payload: string | null }
  | { type: 'ADD_EXPORT_JOB'; payload: ExportJob }
  | { type: 'UPDATE_EXPORT_JOB'; payload: { id: string; updates: Partial<ExportJob> } };

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

function countActiveFilters(filters: FilterQuery): number {
  return filters.groups.reduce((acc, g) => acc + g.conditions.length, 0);
}

function reducer(state: CrmTableState, action: Action): CrmTableState {
  switch (action.type) {
    case 'SET_SEARCH':
      return { ...state, search: action.payload };

    case 'SET_DEBOUNCED_SEARCH':
      return {
        ...state,
        debouncedSearch: action.payload,
        pagination: { ...state.pagination, page: 1 },
      };

    case 'SET_SORT':
      return {
        ...state,
        sort: action.payload,
        pagination: { ...state.pagination, page: 1 },
      };

    case 'SET_PAGE':
      return { ...state, pagination: { ...state.pagination, page: action.payload } };

    case 'SET_COLUMNS':
      return { ...state, columns: action.payload };

    case 'TOGGLE_COLUMN': {
      const columns = state.columns.map((c) =>
        c.key === action.payload ? { ...c, visible: !c.visible } : c,
      );
      return { ...state, columns };
    }

    case 'REORDER_COLUMNS': {
      const cols = [...state.columns];
      const [moved] = cols.splice(action.payload.fromIndex, 1);
      cols.splice(action.payload.toIndex, 0, moved);
      return { ...state, columns: cols };
    }

    case 'SET_FILTERS': {
      return {
        ...state,
        filters: action.payload,
        activeFilterCount: countActiveFilters(action.payload),
        pagination: { ...state.pagination, page: 1 },
      };
    }

    case 'ADD_FILTER_CONDITION': {
      const filters = { ...state.filters };
      if (filters.groups.length === 0) {
        filters.groups = [{ id: 'default', logic: 'AND', conditions: [] }];
      }
      filters.groups = filters.groups.map((g, i) =>
        i === 0 ? { ...g, conditions: [...g.conditions, action.payload] } : g,
      );
      return {
        ...state,
        filters,
        activeFilterCount: countActiveFilters(filters),
        pagination: { ...state.pagination, page: 1 },
      };
    }

    case 'UPDATE_FILTER_CONDITION': {
      const filters = {
        ...state.filters,
        groups: state.filters.groups.map((g) => ({
          ...g,
          conditions: g.conditions.map((c) =>
            c.id === action.payload.id ? { ...c, ...action.payload.updates } : c,
          ),
        })),
      };
      return {
        ...state,
        filters,
        activeFilterCount: countActiveFilters(filters),
        pagination: { ...state.pagination, page: 1 },
      };
    }

    case 'REMOVE_FILTER_CONDITION': {
      const filters = {
        ...state.filters,
        groups: state.filters.groups.map((g) => ({
          ...g,
          conditions: g.conditions.filter((c) => c.id !== action.payload),
        })).filter((g) => g.conditions.length > 0),
      };
      return {
        ...state,
        filters,
        activeFilterCount: countActiveFilters(filters),
        pagination: { ...state.pagination, page: 1 },
      };
    }

    case 'CLEAR_FILTERS':
      return {
        ...state,
        filters: { groups: [], rootLogic: 'AND' },
        activeFilterCount: 0,
        pagination: { ...state.pagination, page: 1 },
      };

    case 'SET_FILTER_GROUP_LOGIC': {
      const filters = {
        ...state.filters,
        groups: state.filters.groups.map((g) =>
          g.id === action.payload.groupId ? { ...g, logic: action.payload.logic } : g,
        ),
      };
      return { ...state, filters };
    }

    case 'FETCH_START':
      return { ...state, loading: true, error: null };

    case 'FETCH_SUCCESS':
      return {
        ...state,
        records: action.payload.results,
        pagination: {
          ...state.pagination,
          total: action.payload.total,
          totalPages: action.payload.totalPages,
          page: action.payload.page,
        },
        loading: false,
        error: null,
      };

    case 'FETCH_ERROR':
      return { ...state, loading: false, error: action.payload, records: [] };

    case 'TOGGLE_SELECT': {
      const next = new Set(state.selectedIds);
      if (next.has(action.payload)) next.delete(action.payload);
      else next.add(action.payload);
      return { ...state, selectedIds: next };
    }

    case 'TOGGLE_SELECT_ALL': {
      if (state.selectedIds.size === state.records.length) {
        return { ...state, selectedIds: new Set() };
      }
      return { ...state, selectedIds: new Set(state.records.map((r) => r.id)) };
    }

    case 'CLEAR_SELECTION':
      return { ...state, selectedIds: new Set() };

    case 'TOGGLE_COLUMN_EDITOR':
      return { ...state, showColumnEditor: !state.showColumnEditor, showFilterBuilder: false, showExportPanel: false, showSortPanel: false };

    case 'TOGGLE_FILTER_BUILDER':
      return { ...state, showFilterBuilder: !state.showFilterBuilder, showColumnEditor: false, showExportPanel: false, showSortPanel: false };

    case 'TOGGLE_EXPORT_PANEL':
      return { ...state, showExportPanel: !state.showExportPanel, showColumnEditor: false, showFilterBuilder: false, showSortPanel: false };

    case 'TOGGLE_SORT_PANEL':
      return { ...state, showSortPanel: !state.showSortPanel, showColumnEditor: false, showFilterBuilder: false, showExportPanel: false };

    case 'SET_ACTIVE_TAB':
      return { ...state, activeTabIndex: action.payload, pagination: { ...state.pagination, page: 1 } };

    case 'SET_VIEW_TYPE':
      return { ...state, viewType: action.payload };

    case 'CLOSE_ALL_PANELS':
      return { ...state, showColumnEditor: false, showFilterBuilder: false, showExportPanel: false, showSortPanel: false };

    case 'ADD_TO_MY_RECORDS': {
      const next = new Set(state.myRecordIds);
      next.add(action.payload);
      return { ...state, myRecordIds: next };
    }

    case 'REMOVE_FROM_MY_RECORDS': {
      const next = new Set(state.myRecordIds);
      next.delete(action.payload);
      return { ...state, myRecordIds: next };
    }

    case 'TOGGLE_MY_RECORD': {
      const next = new Set(state.myRecordIds);
      if (next.has(action.payload)) next.delete(action.payload);
      else next.add(action.payload);
      return { ...state, myRecordIds: next };
    }

    case 'SELECT_RECORD':
      return { ...state, selectedRecordId: action.payload };

    case 'ADD_EXPORT_JOB':
      return { ...state, exportJobs: [action.payload, ...state.exportJobs] };

    case 'UPDATE_EXPORT_JOB':
      return {
        ...state,
        exportJobs: state.exportJobs.map((j) =>
          j.id === action.payload.id ? { ...j, ...action.payload.updates } : j,
        ),
      };

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface CrmTableContextValue {
  state: CrmTableState;
  dispatch: React.Dispatch<Action>;
  // Convenience actions
  setSearch: (q: string) => void;
  setSort: (field: string) => void;
  setPage: (page: number) => void;
  toggleColumn: (key: string) => void;
  addFilter: (condition: FilterCondition) => void;
  removeFilter: (id: string) => void;
  updateFilter: (id: string, updates: Partial<FilterCondition>) => void;
  clearFilters: () => void;
  toggleSelect: (id: string) => void;
  toggleSelectAll: () => void;
  refreshData: () => void;
  requestExport: (format: ExportFormat) => void;
  saveColumnPreferences: () => Promise<void>;
  setActiveTab: (index: number) => void;
  setViewType: (viewType: 'table' | 'board') => void;
  addToMyRecords: (id: string) => void;
  removeFromMyRecords: (id: string) => void;
  toggleMyRecord: (id: string) => void;
  selectRecord: (id: string | null) => void;
  // Derived
  visibleColumns: ColumnDef[];
  allProperties: PropertyDef[];
  displayRecords: CrmRecord[];
  selectedRecord: CrmRecord | null;
  isMyRecord: (id: string) => boolean;
}

interface PropertyDef {
  key: string;
  label: string;
  type: string;
  group: string;
  options?: { value: string; label: string }[];
}

const CrmTableCtx = createContext<CrmTableContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface CrmTableProviderProps {
  objectType: string;
  initialColumns: ColumnDef[];
  properties?: PropertyDef[];
  children: React.ReactNode;
}

export function CrmTableProvider({ objectType, initialColumns, properties = [], children }: CrmTableProviderProps) {
  const initialState: CrmTableState = {
    objectType,
    columns: initialColumns,
    search: '',
    debouncedSearch: '',
    sort: { field: 'create_date', order: 'desc' },
    pagination: { page: 1, limit: 25, total: 0, totalPages: 0 },
    filters: { groups: [], rootLogic: 'AND' },
    activeFilterCount: 0,
    records: [],
    loading: true,
    error: null,
    selectedIds: new Set(),
    showColumnEditor: false,
    showFilterBuilder: false,
    showExportPanel: false,
    showSortPanel: false,
    activeTabIndex: 0,
    viewType: 'table',
    myRecordIds: new Set(),
    selectedRecordId: null,
    exportJobs: [],
  };

  const [state, dispatch] = useReducer(reducer, initialState);
  const abortRef = useRef<AbortController | null>(null);

  // --- Debounced search (300ms) ---
  useEffect(() => {
    const timer = setTimeout(() => {
      dispatch({ type: 'SET_DEBOUNCED_SEARCH', payload: state.search });
    }, 300);
    return () => clearTimeout(timer);
  }, [state.search]);

  // --- Build query params from filters ---
  const buildFilterParams = useCallback((): Record<string, string> => {
    const params: Record<string, string> = {};
    if (state.filters.groups.length > 0) {
      params['_filters'] = JSON.stringify(state.filters);
    }
    return params;
  }, [state.filters]);

  // --- Fetch data ---
  const fetchData = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    dispatch({ type: 'FETCH_START' });

    try {
      const params = new URLSearchParams({
        page: state.pagination.page.toString(),
        limit: state.pagination.limit.toString(),
        sort: state.sort.field,
        order: state.sort.order,
        ...(state.debouncedSearch && { search: state.debouncedSearch }),
        ...buildFilterParams(),
      });

      const res = await fetch(`/api/crm/${objectType}?${params}`, { signal: controller.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: CrmListResponse = await res.json();
      dispatch({ type: 'FETCH_SUCCESS', payload: data });
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      dispatch({ type: 'FETCH_ERROR', payload: (err as Error).message });
    }
  }, [objectType, state.pagination.page, state.pagination.limit, state.sort, state.debouncedSearch, buildFilterParams]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- Convenience actions ---
  const setSearch = useCallback((q: string) => dispatch({ type: 'SET_SEARCH', payload: q }), []);

  const setSort = useCallback((field: string) => {
    dispatch({
      type: 'SET_SORT',
      payload: state.sort.field === field
        ? { field, order: state.sort.order === 'asc' ? 'desc' : 'asc' }
        : { field, order: 'desc' },
    });
  }, [state.sort]);

  const setPage = useCallback((page: number) => dispatch({ type: 'SET_PAGE', payload: page }), []);
  const toggleColumn = useCallback((key: string) => dispatch({ type: 'TOGGLE_COLUMN', payload: key }), []);
  const addFilter = useCallback((c: FilterCondition) => dispatch({ type: 'ADD_FILTER_CONDITION', payload: c }), []);
  const removeFilter = useCallback((id: string) => dispatch({ type: 'REMOVE_FILTER_CONDITION', payload: id }), []);
  const updateFilter = useCallback((id: string, u: Partial<FilterCondition>) => dispatch({ type: 'UPDATE_FILTER_CONDITION', payload: { id, updates: u } }), []);
  const clearFilters = useCallback(() => dispatch({ type: 'CLEAR_FILTERS' }), []);
  const toggleSelect = useCallback((id: string) => dispatch({ type: 'TOGGLE_SELECT', payload: id }), []);
  const toggleSelectAll = useCallback(() => dispatch({ type: 'TOGGLE_SELECT_ALL' }), []);
  const refreshData = useCallback(() => fetchData(), [fetchData]);
  const setActiveTab = useCallback((index: number) => dispatch({ type: 'SET_ACTIVE_TAB', payload: index }), []);
  const setViewType = useCallback((vt: 'table' | 'board') => dispatch({ type: 'SET_VIEW_TYPE', payload: vt }), []);
  const addToMyRecords = useCallback((id: string) => dispatch({ type: 'ADD_TO_MY_RECORDS', payload: id }), []);
  const removeFromMyRecords = useCallback((id: string) => dispatch({ type: 'REMOVE_FROM_MY_RECORDS', payload: id }), []);
  const toggleMyRecord = useCallback((id: string) => dispatch({ type: 'TOGGLE_MY_RECORD', payload: id }), []);
  const selectRecord = useCallback((id: string | null) => dispatch({ type: 'SELECT_RECORD', payload: id }), []);

  // --- Column persistence ---
  const saveColumnPreferences = useCallback(async () => {
    const prefs: ColumnPreferences = {
      userId: 'current_user',
      objectType,
      columns: state.columns.map((c, i) => ({ key: c.key, visible: c.visible, order: i, width: c.width })),
      updatedAt: new Date().toISOString(),
    };
    try {
      await fetch('/api/crm/preferences/columns', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prefs),
      });
    } catch { /* silently fail for now */ }
  }, [objectType, state.columns]);

  // --- Export ---
  const requestExport = useCallback(async (format: ExportFormat) => {
    const jobId = crypto.randomUUID();
    const job: ExportJob = {
      id: jobId,
      objectType,
      format,
      status: 'pending',
      filters: state.filters,
      sort: state.sort,
      columns: state.columns.filter((c) => c.visible).map((c) => c.key),
      totalRecords: state.pagination.total,
      processedRecords: 0,
      createdAt: new Date().toISOString(),
    };

    dispatch({ type: 'ADD_EXPORT_JOB', payload: job });
    dispatch({ type: 'TOGGLE_EXPORT_PANEL' });

    // Simulate async export processing
    try {
      const res = await fetch('/api/crm/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(job),
      });
      const data = await res.json();
      dispatch({
        type: 'UPDATE_EXPORT_JOB',
        payload: { id: jobId, updates: { status: 'completed', downloadUrl: data.downloadUrl, completedAt: new Date().toISOString() } },
      });
    } catch {
      dispatch({
        type: 'UPDATE_EXPORT_JOB',
        payload: { id: jobId, updates: { status: 'failed', error: 'Export failed' } },
      });
    }
  }, [objectType, state.filters, state.sort, state.columns, state.pagination.total]);

  // --- Derived ---
  const visibleColumns = state.columns.filter((c) => c.visible);

  // Tab 0 = All, Tab 1 = My Records only
  const displayRecords = useMemo(() => {
    if (state.activeTabIndex === 1) {
      return state.records.filter((r) => state.myRecordIds.has(r.id));
    }
    return state.records;
  }, [state.records, state.activeTabIndex, state.myRecordIds]);

  const selectedRecord = useMemo(() => {
    if (!state.selectedRecordId) return null;
    return state.records.find((r) => r.id === state.selectedRecordId) ?? null;
  }, [state.records, state.selectedRecordId]);

  const isMyRecord = useCallback((id: string) => state.myRecordIds.has(id), [state.myRecordIds]);

  const value: CrmTableContextValue = {
    state,
    dispatch,
    setSearch,
    setSort,
    setPage,
    toggleColumn,
    addFilter,
    removeFilter,
    updateFilter,
    clearFilters,
    toggleSelect,
    toggleSelectAll,
    refreshData,
    requestExport,
    saveColumnPreferences,
    setActiveTab,
    setViewType,
    addToMyRecords,
    removeFromMyRecords,
    toggleMyRecord,
    selectRecord,
    visibleColumns,
    allProperties: properties,
    displayRecords,
    selectedRecord,
    isMyRecord,
  };

  return <CrmTableCtx.Provider value={value}>{children}</CrmTableCtx.Provider>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useCrmTable(): CrmTableContextValue {
  const ctx = useContext(CrmTableCtx);
  if (!ctx) throw new Error('useCrmTable must be used within <CrmTableProvider>');
  return ctx;
}
