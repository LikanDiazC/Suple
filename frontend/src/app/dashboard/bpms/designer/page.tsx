'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  MarkerType,
  ConnectionLineType,
  Handle,
  Position,
  type Node,
  type Edge,
  type Connection,
  type NodeTypes,
  type ReactFlowInstance,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useRouter, useSearchParams } from 'next/navigation';
import TopBar from '../../../../presentation/components/layout/TopBar';

// ─── Custom Node Components ───────────────────────────────────────────────────

function StartEventNode({ data, selected }: { data: any; selected?: boolean }) {
  return (
    <div
      className="relative flex items-center justify-center rounded-full"
      style={{
        width: 40, height: 40,
        background: selected ? '#15803d' : '#22c55e',
        border: `3px solid ${selected ? '#14532d' : '#16a34a'}`,
        boxShadow: selected ? '0 0 0 3px rgba(34,197,94,0.35)' : 'none',
      }}
    >
      <Handle type="source" position={Position.Right} style={{ background: '#16a34a', width: 10, height: 10, border: '2px solid white' }} />
      <Handle type="source" position={Position.Bottom} style={{ background: '#16a34a', width: 10, height: 10, border: '2px solid white' }} />
      <svg width="16" height="16" viewBox="0 0 16 16" fill="white">
        <polygon points="4,2 14,8 4,14" />
      </svg>
      {data.name && (
        <div style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: 6, whiteSpace: 'nowrap', fontSize: 11, fontWeight: 600, color: '#166534' }}>
          {data.name}
        </div>
      )}
    </div>
  );
}

function EndEventNode({ data, selected }: { data: any; selected?: boolean }) {
  return (
    <div
      className="relative flex items-center justify-center rounded-full"
      style={{
        width: 40, height: 40,
        background: selected ? '#c2410c' : '#f97316',
        border: `4px solid ${selected ? '#7c2d12' : '#ea580c'}`,
        boxShadow: selected ? '0 0 0 3px rgba(249,115,22,0.35)' : 'none',
      }}
    >
      <Handle type="target" position={Position.Left} style={{ background: '#ea580c', width: 10, height: 10, border: '2px solid white' }} />
      <Handle type="target" position={Position.Top} style={{ background: '#ea580c', width: 10, height: 10, border: '2px solid white' }} />
      <svg width="14" height="14" viewBox="0 0 14 14" fill="white">
        <rect x="2" y="2" width="10" height="10" rx="1" />
      </svg>
      {data.name && (
        <div style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: 6, whiteSpace: 'nowrap', fontSize: 11, fontWeight: 600, color: '#9a3412' }}>
          {data.name}
        </div>
      )}
    </div>
  );
}

function UserTaskNode({ data, selected }: { data: any; selected?: boolean }) {
  return (
    <div
      style={{
        width: 180, minHeight: 70, borderRadius: 10, overflow: 'hidden',
        border: selected ? '2px solid #1d4ed8' : '1.5px solid #bfdbfe',
        boxShadow: selected ? '0 0 0 3px rgba(29,78,216,0.2)' : '0 2px 8px rgba(0,0,0,0.08)',
        background: 'white',
      }}
    >
      <Handle type="target" position={Position.Left} style={{ background: '#1d4ed8', width: 10, height: 10, border: '2px solid white' }} />
      <Handle type="target" position={Position.Top} style={{ background: '#1d4ed8', width: 10, height: 10, border: '2px solid white' }} />
      <Handle type="source" position={Position.Right} style={{ background: '#1d4ed8', width: 10, height: 10, border: '2px solid white' }} />
      <Handle type="source" position={Position.Bottom} style={{ background: '#1d4ed8', width: 10, height: 10, border: '2px solid white' }} />
      <div style={{ background: '#1d4ed8', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 5 }}>
        <svg width="11" height="11" viewBox="0 0 16 16" fill="white"><path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm-5 6a5 5 0 0 1 10 0H3z" /></svg>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 130 }}>
          {data.name || 'User Task'}
        </span>
      </div>
      <div style={{ padding: '5px 8px 6px' }}>
        {data.config?.assigneeRole && (
          <span style={{ display: 'inline-block', fontSize: 10, fontWeight: 600, background: '#dbeafe', color: '#1e40af', borderRadius: 4, padding: '1px 6px', marginRight: 4 }}>
            {data.config.assigneeRole}
          </span>
        )}
        {data.config?.slaHours && (
          <span style={{ display: 'inline-block', fontSize: 10, fontWeight: 600, background: '#fef9c3', color: '#854d0e', borderRadius: 4, padding: '1px 6px' }}>
            {data.config.slaHours}h SLA
          </span>
        )}
      </div>
    </div>
  );
}

function ServiceTaskNode({ data, selected }: { data: any; selected?: boolean }) {
  return (
    <div
      style={{
        width: 180, minHeight: 70, borderRadius: 10, overflow: 'hidden',
        border: selected ? '2px solid #7e22ce' : '1.5px solid #e9d5ff',
        boxShadow: selected ? '0 0 0 3px rgba(126,34,206,0.2)' : '0 2px 8px rgba(0,0,0,0.08)',
        background: 'white',
      }}
    >
      <Handle type="target" position={Position.Left} style={{ background: '#7e22ce', width: 10, height: 10, border: '2px solid white' }} />
      <Handle type="target" position={Position.Top} style={{ background: '#7e22ce', width: 10, height: 10, border: '2px solid white' }} />
      <Handle type="source" position={Position.Right} style={{ background: '#7e22ce', width: 10, height: 10, border: '2px solid white' }} />
      <Handle type="source" position={Position.Bottom} style={{ background: '#7e22ce', width: 10, height: 10, border: '2px solid white' }} />
      <div style={{ background: '#7e22ce', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 5 }}>
        <svg width="11" height="11" viewBox="0 0 16 16" fill="white"><path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z" /><path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm0-1A7 7 0 1 1 8 1a7 7 0 0 1 0 14z" /></svg>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 130 }}>
          {data.name || 'Service Task'}
        </span>
      </div>
      <div style={{ padding: '5px 8px 6px' }}>
        {data.config?.serviceType && (
          <span style={{ display: 'inline-block', fontSize: 10, fontWeight: 600, background: '#f3e8ff', color: '#6b21a8', borderRadius: 4, padding: '1px 6px' }}>
            {data.config.serviceType}
          </span>
        )}
      </div>
    </div>
  );
}

function GatewayBase({ data, selected, color, symbol }: { data: any; selected?: boolean; color: string; symbol: string }) {
  return (
    <div style={{ position: 'relative', width: 50, height: 50 }}>
      <Handle type="target" position={Position.Left} style={{ background: color, width: 10, height: 10, border: '2px solid white', zIndex: 10 }} />
      <Handle type="target" position={Position.Top} style={{ background: color, width: 10, height: 10, border: '2px solid white', zIndex: 10 }} />
      <Handle type="source" position={Position.Right} style={{ background: color, width: 10, height: 10, border: '2px solid white', zIndex: 10 }} />
      <Handle type="source" position={Position.Bottom} style={{ background: color, width: 10, height: 10, border: '2px solid white', zIndex: 10 }} />
      <div
        style={{
          width: 50, height: 50,
          background: color,
          transform: 'rotate(45deg)',
          borderRadius: 4,
          border: selected ? '2.5px solid rgba(0,0,0,0.35)' : '2px solid rgba(0,0,0,0.15)',
          boxShadow: selected ? '0 0 0 3px rgba(0,0,0,0.12)' : '0 2px 6px rgba(0,0,0,0.1)',
        }}
      />
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18, fontWeight: 800, color: 'rgba(0,0,0,0.6)', pointerEvents: 'none',
      }}>
        {symbol}
      </div>
      {data.name && (
        <div style={{ position: 'absolute', top: '110%', left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap', fontSize: 11, fontWeight: 600, color: '#374151' }}>
          {data.name}
        </div>
      )}
    </div>
  );
}

function ExclusiveGatewayNode(props: any) { return <GatewayBase {...props} color="#fde047" symbol="X" />; }
function ParallelGatewayNode(props: any) { return <GatewayBase {...props} color="#60a5fa" symbol="+" />; }
function InclusiveGatewayNode(props: any) { return <GatewayBase {...props} color="#2dd4bf" symbol="O" />; }

// ─── nodeTypes ───────────────────────────────────────────────────────────────

const nodeTypes: NodeTypes = {
  START_EVENT: StartEventNode,
  END_EVENT: EndEventNode,
  USER_TASK: UserTaskNode,
  SERVICE_TASK: ServiceTaskNode,
  EXCLUSIVE_GATEWAY: ExclusiveGatewayNode,
  PARALLEL_GATEWAY: ParallelGatewayNode,
  INCLUSIVE_GATEWAY: InclusiveGatewayNode,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ASSIGNEE_ROLES = [
  'vendedor', 'jefe_produccion', 'finanzas', 'operario',
  'control_calidad', 'logistica', 'bodeguero', 'jefe_compras', 'jefe_bodega', 'cliente',
];

const SERVICE_TYPES = ['SCM_OPTIMIZE', 'SEND_EMAIL', 'WEBHOOK'];

const PALETTE_ITEMS = [
  { type: 'START_EVENT',        label: 'Start Event',         color: '#22c55e', shape: 'circle' },
  { type: 'END_EVENT',          label: 'End Event',           color: '#f97316', shape: 'circle' },
  { type: 'USER_TASK',          label: 'User Task',           color: '#1d4ed8', shape: 'rect' },
  { type: 'SERVICE_TASK',       label: 'Service Task',        color: '#7e22ce', shape: 'rect' },
  { type: 'EXCLUSIVE_GATEWAY',  label: 'Exclusive Gateway',   color: '#fde047', shape: 'diamond' },
  { type: 'PARALLEL_GATEWAY',   label: 'Parallel Gateway',    color: '#60a5fa', shape: 'diamond' },
  { type: 'INCLUSIVE_GATEWAY',  label: 'Inclusive Gateway',   color: '#2dd4bf', shape: 'diamond' },
];

function getDefaultName(type: string): string {
  const map: Record<string, string> = {
    START_EVENT: 'Inicio', END_EVENT: 'Fin',
    USER_TASK: 'Tarea Usuario', SERVICE_TASK: 'Servicio',
    EXCLUSIVE_GATEWAY: 'Gateway XOR', PARALLEL_GATEWAY: 'Gateway AND',
    INCLUSIVE_GATEWAY: 'Gateway OR',
  };
  return map[type] ?? type;
}

// ─── PaletteItem ──────────────────────────────────────────────────────────────

function PaletteItem({ type, label, color, shape }: { type: string; label: string; color: string; shape: string }) {
  const onDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/bpms-node-type', type);
    e.dataTransfer.effectAllowed = 'move';
  };

  const previewStyle: React.CSSProperties = shape === 'circle'
    ? { width: 28, height: 28, borderRadius: '50%', background: color, border: `3px solid ${color}`, flexShrink: 0 }
    : shape === 'diamond'
    ? { width: 22, height: 22, background: color, transform: 'rotate(45deg)', borderRadius: 3, flexShrink: 0 }
    : { width: 34, height: 22, background: color, borderRadius: 4, flexShrink: 0 };

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="flex cursor-grab items-center gap-3 rounded-lg border border-neutral-100 bg-neutral-50 px-3 py-2.5 hover:border-blue-200 hover:bg-blue-50 active:cursor-grabbing transition-colors select-none"
    >
      <div style={previewStyle} />
      <span className="text-xs font-medium text-neutral-700">{label}</span>
    </div>
  );
}

// ─── NodeConfigPanel ──────────────────────────────────────────────────────────

function NodeConfigPanel({
  node,
  onUpdate,
  onClose,
}: {
  node: Node;
  onUpdate: (id: string, data: any) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState<string>((node.data as any).name ?? '');
  const [description, setDescription] = useState<string>((node.data as any).description ?? '');
  const [config, setConfig] = useState<any>((node.data as any).config ?? {});
  const [outcomeInput, setOutcomeInput] = useState('');

  useEffect(() => {
    setName((node.data as any).name ?? '');
    setDescription((node.data as any).description ?? '');
    setConfig((node.data as any).config ?? {});
    setOutcomeInput('');
  }, [node.id]);

  const commit = (overrides?: Partial<{ name: string; description: string; config: any }>) => {
    onUpdate(node.id, {
      ...(node.data as any),
      name: overrides?.name ?? name,
      description: overrides?.description ?? description,
      config: overrides?.config ?? config,
    });
  };

  const updateConfig = (key: string, value: any) => {
    const next = { ...config, [key]: value };
    setConfig(next);
    onUpdate(node.id, { ...(node.data as any), name, description, config: next });
  };

  const addOutcome = () => {
    if (!outcomeInput.trim()) return;
    const next = { ...config, approvalOutcomes: [...(config.approvalOutcomes ?? []), outcomeInput.trim()] };
    setConfig(next);
    onUpdate(node.id, { ...(node.data as any), name, description, config: next });
    setOutcomeInput('');
  };

  const removeOutcome = (idx: number) => {
    const next = { ...config, approvalOutcomes: (config.approvalOutcomes ?? []).filter((_: any, i: number) => i !== idx) };
    setConfig(next);
    onUpdate(node.id, { ...(node.data as any), name, description, config: next });
  };

  const nodeType = (node.data as any).nodeType as string;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
        <span className="text-sm font-semibold text-neutral-800">Configurar Nodo</span>
        <button onClick={onClose} className="rounded-md p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 transition-colors">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="3" x2="13" y2="13" /><line x1="13" y1="3" x2="3" y2="13" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Type badge */}
        <div>
          <span className="inline-block rounded-full bg-neutral-100 px-2.5 py-0.5 text-[11px] font-semibold text-neutral-600">
            {nodeType?.replace(/_/g, ' ')}
          </span>
        </div>

        {/* Name */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-neutral-600">Nombre</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => commit({ name })}
            className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
          />
        </div>

        {/* USER_TASK specific */}
        {nodeType === 'USER_TASK' && (
          <>
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-neutral-600">Rol Asignado</label>
              <select
                value={config.assigneeRole ?? ''}
                onChange={(e) => updateConfig('assigneeRole', e.target.value)}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all bg-white"
              >
                <option value="">— seleccionar —</option>
                {ASSIGNEE_ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-neutral-600">SLA (horas)</label>
              <input
                type="number"
                min={0}
                value={config.slaHours ?? ''}
                onChange={(e) => updateConfig('slaHours', e.target.value ? Number(e.target.value) : undefined)}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                placeholder="e.g. 24"
              />
            </div>
          </>
        )}

        {/* SERVICE_TASK specific */}
        {nodeType === 'SERVICE_TASK' && (
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-neutral-600">Tipo de Servicio</label>
            <select
              value={config.serviceType ?? ''}
              onChange={(e) => updateConfig('serviceType', e.target.value)}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all bg-white"
            >
              <option value="">— seleccionar —</option>
              {SERVICE_TYPES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        )}

        {/* Approval Outcomes */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-neutral-600">Resultados de Aprobacion</label>
          <div className="flex gap-2">
            <input
              value={outcomeInput}
              onChange={(e) => setOutcomeInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addOutcome(); } }}
              className="flex-1 rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
              placeholder="Agregar resultado..."
            />
            <button
              onClick={addOutcome}
              className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-800 transition-colors"
            >
              +
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {(config.approvalOutcomes ?? []).map((outcome: string, i: number) => (
              <span key={i} className="flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700">
                {outcome}
                <button onClick={() => removeOutcome(i)} className="ml-0.5 text-blue-400 hover:text-blue-700 leading-none">&times;</button>
              </span>
            ))}
          </div>
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-neutral-600">Descripcion</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={() => commit({ description })}
            rows={3}
            className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all resize-none"
            placeholder="Descripcion del nodo..."
          />
        </div>
      </div>
    </div>
  );
}

// ─── Inner designer (needs ReactFlow context) ─────────────────────────────────

function DesignerInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const idParam = searchParams.get('id');

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [processName, setProcessName] = useState('Nuevo Proceso');
  const [processId, setProcessId] = useState<string | null>(idParam);
  const [isSaving, setIsSaving] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);

  // Load existing definition
  useEffect(() => {
    if (!idParam) return;
    (async () => {
      try {
        const res = await fetch(`/api/bpms/definitions/${idParam}`);
        if (!res.ok) return;
        const def = await res.json();
        setProcessName(def.name ?? 'Proceso');
        setProcessId(def.id ?? idParam);
        const loadedNodes: Node[] = (def.nodes ?? []).map((n: any) => ({
          id: n.id,
          type: n.type,
          position: n.position ?? { x: 0, y: 0 },
          data: { label: n.type, nodeType: n.type, name: n.name, description: n.description ?? '', config: n.config ?? { type: n.type } },
        }));
        const loadedEdges: Edge[] = (def.transitions ?? []).map((t: any, i: number) => ({
          id: `e-${t.fromNodeId}-${t.toNodeId}-${i}`,
          source: t.fromNodeId,
          target: t.toNodeId,
          type: 'smoothstep',
          markerEnd: { type: MarkerType.ArrowClosed },
          style: { stroke: '#6B7280', strokeWidth: 1.5 },
        }));
        setNodes(loadedNodes);
        setEdges(loadedEdges);
      } catch { /* silent */ }
    })();
  }, [idParam]);

  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((eds) =>
        addEdge({
          ...params,
          type: 'smoothstep',
          markerEnd: { type: MarkerType.ArrowClosed },
          style: { stroke: '#6B7280', strokeWidth: 1.5 },
        }, eds)
      ),
    [setEdges]
  );

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      if (!rfInstance || !reactFlowWrapper.current) return;
      const type = event.dataTransfer.getData('application/bpms-node-type');
      if (!type) return;
      const bounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = rfInstance.screenToFlowPosition({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      });
      const newNode: Node = {
        id: `node-${Date.now()}`,
        type,
        position,
        data: {
          label: type,
          nodeType: type,
          name: getDefaultName(type),
          description: '',
          config: { type },
        },
      };
      setNodes((prev) => [...prev, newNode]);
    },
    [rfInstance, setNodes]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    setRightPanelOpen(true);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const handleNodeUpdate = useCallback((id: string, data: any) => {
    setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data } : n)));
    setSelectedNode((prev) => (prev?.id === id ? { ...prev, data } : prev));
  }, [setNodes]);

  const saveProcess = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      const body = {
        name: processName,
        description: '',
        category: 'general',
        createdBy: 'user',
        nodes: nodes.map((n) => ({
          id: n.id,
          type: (n.data as any).nodeType,
          name: (n.data as any).name,
          position: n.position,
          config: (n.data as any).config,
        })),
        transitions: edges.map((e) => ({
          fromNodeId: e.source,
          toNodeId: e.target,
          conditions: [],
          priority: 0,
          isDefault: false,
        })),
      };

      let res: Response;
      if (processId) {
        res = await fetch(`/api/bpms/definitions/${processId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      } else {
        res = await fetch('/api/bpms/definitions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      }

      if (!res.ok) throw new Error(`Error ${res.status}`);
      const result = await res.json();
      if (result.id) setProcessId(result.id);
    } catch (err: any) {
      setSaveError(err.message ?? 'Error al guardar');
    } finally {
      setIsSaving(false);
    }
  };

  const publishProcess = async () => {
    if (!processId) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/bpms/definitions/${processId}/publish`, { method: 'POST' });
      if (!res.ok) throw new Error(`Error ${res.status}`);
    } catch (err: any) {
      setSaveError(err.message ?? 'Error al publicar');
    } finally {
      setIsSaving(false);
    }
  };

  const clearCanvas = () => {
    setNodes([]);
    setEdges([]);
    setSelectedNode(null);
  };

  return (
    <div className="flex h-screen flex-col bg-neutral-50">
      <TopBar title="BPMS — Diseñador de Procesos" subtitle="Editor visual de definiciones de proceso" />

      {/* Toolbar */}
      <div className="flex items-center gap-3 border-b border-neutral-200 bg-white px-6 py-2.5">
        <button
          onClick={() => router.push('/dashboard/bpms/processes')}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-neutral-600 hover:bg-neutral-100 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="10,3 4,8 10,13" />
          </svg>
          Procesos
        </button>

        <div className="mx-1 h-6 w-px bg-neutral-200" />

        <input
          value={processName}
          onChange={(e) => setProcessName(e.target.value)}
          className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm font-semibold text-neutral-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all min-w-[200px]"
          placeholder="Nombre del proceso"
        />

        <div className="ml-auto flex items-center gap-2">
          {saveError && (
            <span className="text-xs text-red-600 font-medium">{saveError}</span>
          )}
          <button
            onClick={clearCanvas}
            className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm font-medium text-neutral-600 hover:bg-neutral-50 transition-colors"
          >
            Limpiar
          </button>
          <button
            onClick={saveProcess}
            disabled={isSaving}
            className="rounded-lg bg-neutral-800 px-4 py-1.5 text-sm font-semibold text-white hover:bg-neutral-700 disabled:opacity-50 transition-colors"
          >
            {isSaving ? 'Guardando...' : 'Guardar borrador'}
          </button>
          {processId && (
            <button
              onClick={publishProcess}
              disabled={isSaving}
              className="rounded-lg px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-50 transition-colors"
              style={{ background: '#1E3A8A' }}
            >
              Publicar
            </button>
          )}
        </div>
      </div>

      {/* Three-panel layout */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left Sidebar — Palette + Settings */}
        <aside className="flex w-[280px] flex-shrink-0 flex-col border-r border-neutral-200 bg-white">
          <div className="border-b border-neutral-100 px-4 py-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500">Elementos</h3>
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
            {PALETTE_ITEMS.map((item) => (
              <PaletteItem key={item.type} {...item} />
            ))}
          </div>
          <div className="border-t border-neutral-100 px-4 py-3">
            <p className="text-[10px] text-neutral-400 leading-relaxed">
              Arrastra los elementos al canvas para construir el proceso.
            </p>
          </div>
        </aside>

        {/* Center — React Flow Canvas */}
        <div ref={reactFlowWrapper} className="relative flex-1 overflow-hidden bg-neutral-100">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={setRfInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            connectionLineType={ConnectionLineType.SmoothStep}
            defaultEdgeOptions={{
              markerEnd: { type: MarkerType.ArrowClosed },
              style: { stroke: '#6B7280', strokeWidth: 1.5 },
              type: 'smoothstep',
            }}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            deleteKeyCode="Delete"
            className="h-full w-full"
          >
            <Background color="#d1d5db" gap={20} size={1} />
            <Controls className="rounded-lg border border-neutral-200 shadow-sm" />
            <MiniMap
              nodeColor={(n) => {
                const type = (n.data as any)?.nodeType as string;
                const colors: Record<string, string> = {
                  START_EVENT: '#22c55e', END_EVENT: '#f97316',
                  USER_TASK: '#3b82f6', SERVICE_TASK: '#a855f7',
                  EXCLUSIVE_GATEWAY: '#fde047', PARALLEL_GATEWAY: '#60a5fa',
                  INCLUSIVE_GATEWAY: '#2dd4bf',
                };
                return colors[type] ?? '#94a3b8';
              }}
              className="rounded-lg border border-neutral-200 shadow-sm"
              style={{ background: 'white' }}
            />

            {/* Empty state hint */}
            {nodes.length === 0 && (
              <div
                className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3"
                style={{ zIndex: 4 }}
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-dashed border-neutral-300 bg-white">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="3" />
                    <line x1="12" y1="8" x2="12" y2="16" />
                    <line x1="8" y1="12" x2="16" y2="12" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-neutral-400">Arrastra elementos desde la barra lateral</p>
                <p className="text-xs text-neutral-300">Conecta nodos arrastrando desde los puntos de conexion</p>
              </div>
            )}
          </ReactFlow>
        </div>

        {/* Right Panel — Node Config */}
        <aside
          className="flex flex-shrink-0 flex-col border-l border-neutral-200 bg-white transition-all duration-200 overflow-hidden"
          style={{ width: rightPanelOpen && selectedNode ? 320 : 0 }}
        >
          {rightPanelOpen && selectedNode && (
            <NodeConfigPanel
              node={selectedNode}
              onUpdate={handleNodeUpdate}
              onClose={() => { setRightPanelOpen(false); setSelectedNode(null); }}
            />
          )}
        </aside>
      </div>
    </div>
  );
}

// ─── Page Export ──────────────────────────────────────────────────────────────

export default function BPMSDesignerPage() {
  return (
    <ReactFlowProvider>
      <DesignerInner />
    </ReactFlowProvider>
  );
}
