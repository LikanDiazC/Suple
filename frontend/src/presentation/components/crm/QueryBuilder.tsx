'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCrmTable } from '../../../application/context/crm-table';
import type { FilterCondition, FilterOperator, PropertyType, OPERATORS_BY_TYPE } from '../../../application/context/crm-table/types';
import { OPERATORS_BY_TYPE as OPS_MAP } from '../../../application/context/crm-table/types';

/**
 * ==========================================================================
 * Query Builder — Filtros Avanzados
 * ==========================================================================
 *
 * Visual query builder that:
 *   1. Lets users add multiple filter conditions
 *   2. Each condition = Property + Operator + Value
 *   3. Operators are resolved by PropertyType
 *   4. Value inputs adapt to type (text, date picker, enum multi-select)
 *   5. Conditions combine with AND/OR logic
 *   6. Active filters shown as removable chips
 *   7. Parses to a FilterQuery JSON for the backend
 *
 * Debounce: Value changes are debounced 400ms before triggering API.
 * ==========================================================================
 */

export default function QueryBuilder() {
  const { state, dispatch, addFilter, removeFilter, updateFilter, clearFilters, allProperties } = useCrmTable();
  const panelRef = useRef<HTMLDivElement>(null);

  // Click-outside dismissal
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        dispatch({ type: 'TOGGLE_FILTER_BUILDER' });
      }
    }
    if (state.showFilterBuilder) {
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [state.showFilterBuilder, dispatch]);

  const activeConditions = useMemo(() =>
    state.filters.groups.flatMap((g) => g.conditions),
  [state.filters]);

  return (
    <AnimatePresence>
      {state.showFilterBuilder && (
        <motion.div
          ref={panelRef}
          initial={{ opacity: 0, y: -8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.98 }}
          transition={{ duration: 0.15 }}
          className="absolute right-4 top-2 z-50 w-[560px] rounded-lg border border-neutral-200 bg-white shadow-xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-primary-500">
                <path d="M1 2h12M3 5h8M5 8h4M6 11h2"/>
              </svg>
              <h3 className="text-sm font-semibold text-neutral-800">Filtros avanzados</h3>
              {activeConditions.length > 0 && (
                <span className="rounded-full bg-primary-100 px-1.5 py-0.5 text-[10px] font-bold text-primary-700">
                  {activeConditions.length}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {activeConditions.length > 0 && (
                <button onClick={clearFilters} className="text-xs text-danger-600 hover:text-danger-700 font-medium">
                  Limpiar todo
                </button>
              )}
              <button
                onClick={() => dispatch({ type: 'TOGGLE_FILTER_BUILDER' })}
                className="text-neutral-400 hover:text-neutral-600"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M3 3l8 8M11 3l-8 8"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Logic selector */}
          {activeConditions.length > 1 && (
            <div className="px-4 py-2 border-b border-neutral-100 bg-neutral-50">
              <div className="flex items-center gap-2 text-xs text-neutral-600">
                <span>Los registros deben cumplir</span>
                <select
                  value={state.filters.groups[0]?.logic ?? 'AND'}
                  onChange={(e) => {
                    const logic = e.target.value as 'AND' | 'OR';
                    if (state.filters.groups[0]) {
                      dispatch({ type: 'SET_FILTER_GROUP_LOGIC', payload: { groupId: state.filters.groups[0].id, logic } });
                    }
                  }}
                  className="rounded border border-neutral-200 bg-white px-2 py-1 text-xs font-semibold text-primary-600 outline-none focus:ring-1 focus:ring-primary-200"
                >
                  <option value="AND">TODAS</option>
                  <option value="OR">ALGUNA</option>
                </select>
                <span>las condiciones</span>
              </div>
            </div>
          )}

          {/* Active conditions */}
          <div className="max-h-[300px] overflow-y-auto px-4 py-3">
            {activeConditions.length === 0 ? (
              <div className="flex flex-col items-center py-6 text-center">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.2" className="text-neutral-300 mb-2">
                  <path d="M4 6h24M8 12h16M12 18h8M14 24h4"/>
                </svg>
                <p className="text-sm text-neutral-500">Sin filtros activos</p>
                <p className="text-xs text-neutral-400 mt-1">Agrega condiciones para filtrar registros</p>
              </div>
            ) : (
              <div className="space-y-2">
                {activeConditions.map((condition, idx) => (
                  <FilterRow
                    key={condition.id}
                    condition={condition}
                    allProperties={allProperties}
                    onUpdate={(updates) => updateFilter(condition.id, updates)}
                    onRemove={() => removeFilter(condition.id)}
                    showLogic={idx > 0}
                    logic={state.filters.groups[0]?.logic ?? 'AND'}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Add condition button */}
          <div className="border-t border-neutral-100 px-4 py-3">
            <button
              onClick={() => {
                const firstProp = allProperties[0];
                const propType = (firstProp?.type ?? 'TEXT') as PropertyType;
                const ops = OPS_MAP[propType] ?? OPS_MAP.TEXT;
                const newCondition: FilterCondition = {
                  id: crypto.randomUUID(),
                  property: firstProp?.key ?? 'first_name',
                  operator: ops[0]?.value ?? 'contains',
                  value: '',
                  propertyType: propType,
                };
                addFilter(newCondition);
              }}
              className="flex items-center gap-1.5 text-sm text-primary-600 font-medium hover:text-primary-700 transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 2v8M2 6h8"/>
              </svg>
              Agregar condicion
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------------------
// FilterRow — Single condition editor
// ---------------------------------------------------------------------------

interface FilterRowProps {
  condition: FilterCondition;
  allProperties: { key: string; label: string; type: string; options?: { value: string; label: string }[] }[];
  onUpdate: (updates: Partial<FilterCondition>) => void;
  onRemove: () => void;
  showLogic: boolean;
  logic: 'AND' | 'OR';
}

function FilterRow({ condition, allProperties, onUpdate, onRemove, showLogic, logic }: FilterRowProps) {
  const [localValue, setLocalValue] = useState(String(condition.value ?? ''));
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced value update (400ms)
  const handleValueChange = (val: string) => {
    setLocalValue(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onUpdate({ value: val });
    }, 400);
  };

  // Get operators for current property type
  const propType = (condition.propertyType ?? 'TEXT') as PropertyType;
  const operators = OPS_MAP[propType] ?? OPS_MAP.TEXT;

  // Get options for enum types
  const currentProp = allProperties.find((p) => p.key === condition.property);
  const enumOptions = currentProp?.options ?? [];

  // Check if operator needs no value input
  const noValueOperators: FilterOperator[] = ['is_empty', 'is_not_empty', 'is_true', 'is_false'];
  const needsValue = !noValueOperators.includes(condition.operator);

  return (
    <div className="flex items-center gap-2">
      {/* Logic badge */}
      {showLogic && (
        <span className="flex-shrink-0 rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-bold text-neutral-500 uppercase w-6 text-center">
          {logic === 'AND' ? 'Y' : 'O'}
        </span>
      )}
      {!showLogic && <span className="w-6" />}

      {/* Property selector */}
      <select
        value={condition.property}
        onChange={(e) => {
          const prop = allProperties.find((p) => p.key === e.target.value);
          const newType = (prop?.type ?? 'TEXT') as PropertyType;
          const newOps = OPS_MAP[newType] ?? OPS_MAP.TEXT;
          onUpdate({
            property: e.target.value,
            propertyType: newType,
            operator: newOps[0]?.value ?? 'contains',
            value: '',
          });
          setLocalValue('');
        }}
        className="h-8 rounded-md border border-neutral-200 bg-white px-2 text-xs outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-100 min-w-[130px]"
      >
        {allProperties.map((p) => (
          <option key={p.key} value={p.key}>{p.label}</option>
        ))}
      </select>

      {/* Operator selector */}
      <select
        value={condition.operator}
        onChange={(e) => onUpdate({ operator: e.target.value as FilterOperator })}
        className="h-8 rounded-md border border-neutral-200 bg-white px-2 text-xs outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-100 min-w-[120px]"
      >
        {operators.map((op) => (
          <option key={op.value} value={op.value}>{op.label}</option>
        ))}
      </select>

      {/* Value input (type-aware) */}
      {needsValue && (
        <>
          {(propType === 'ENUM' || propType === 'MULTI_ENUM') && enumOptions.length > 0 ? (
            <select
              value={localValue}
              onChange={(e) => handleValueChange(e.target.value)}
              className="h-8 flex-1 rounded-md border border-neutral-200 bg-white px-2 text-xs outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-100"
            >
              <option value="">Seleccionar...</option>
              {enumOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          ) : propType === 'DATE' || propType === 'DATETIME' ? (
            condition.operator === 'in_last_days' ? (
              <input
                type="number"
                min="1"
                placeholder="N dias"
                value={localValue}
                onChange={(e) => handleValueChange(e.target.value)}
                className="h-8 w-20 rounded-md border border-neutral-200 bg-white px-2 text-xs outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-100"
              />
            ) : (
              <input
                type="date"
                value={localValue}
                onChange={(e) => handleValueChange(e.target.value)}
                className="h-8 flex-1 rounded-md border border-neutral-200 bg-white px-2 text-xs outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-100"
              />
            )
          ) : propType === 'NUMBER' || propType === 'CURRENCY' ? (
            <input
              type="number"
              placeholder="Valor"
              value={localValue}
              onChange={(e) => handleValueChange(e.target.value)}
              className="h-8 flex-1 rounded-md border border-neutral-200 bg-white px-2 text-xs outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-100"
            />
          ) : (
            <input
              type="text"
              placeholder="Valor..."
              value={localValue}
              onChange={(e) => handleValueChange(e.target.value)}
              className="h-8 flex-1 rounded-md border border-neutral-200 bg-white px-2 text-xs outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-100"
            />
          )}
        </>
      )}

      {/* Remove button */}
      <button
        onClick={onRemove}
        className="flex-shrink-0 rounded p-1 text-neutral-400 hover:bg-red-50 hover:text-red-500 transition-colors"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M3 3l6 6M9 3l-6 6"/>
        </svg>
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Filter Chips — shown in the table toolbar
// ---------------------------------------------------------------------------

export function ActiveFilterChips() {
  const { state, removeFilter, clearFilters, allProperties, dispatch } = useCrmTable();

  const activeConditions = useMemo(() =>
    state.filters.groups.flatMap((g) => g.conditions),
  [state.filters]);

  if (activeConditions.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {activeConditions.map((c) => {
        const prop = allProperties.find((p) => p.key === c.property);
        return (
          <span
            key={c.id}
            className="inline-flex items-center gap-1 rounded-full bg-primary-50 border border-primary-200 px-2.5 py-0.5 text-[11px] font-medium text-primary-700"
          >
            {prop?.label ?? c.property}: {String(c.value || c.operator)}
            <button
              onClick={() => removeFilter(c.id)}
              className="ml-0.5 rounded-full p-0.5 hover:bg-primary-200 transition-colors"
            >
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M2 2l4 4M6 2l-4 4"/>
              </svg>
            </button>
          </span>
        );
      })}
      <button
        onClick={clearFilters}
        className="text-[11px] text-neutral-500 hover:text-neutral-700 font-medium ml-1"
      >
        Limpiar
      </button>
    </div>
  );
}
