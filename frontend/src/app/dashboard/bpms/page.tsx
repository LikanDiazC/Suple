'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import TopBar from '../../../presentation/components/layout/TopBar';
import { pageTransition, staggerContainer, staggerItem } from '../../../presentation/animations/variants';
import { tokens } from '../../../presentation/theme/tokens';

interface ProcessNode {
  id: string;
  label: string;
  type: 'start' | 'task' | 'gateway' | 'end';
  status: 'completed' | 'active' | 'pending';
  x: number;
  y: number;
}

interface ProcessEdge {
  from: string;
  to: string;
  label?: string;
}

const APPROVAL_NODES: ProcessNode[] = [
  { id: 'start',    label: 'Request Submitted', type: 'start',   status: 'completed', x: 60,  y: 150 },
  { id: 'review',   label: 'Manager Review',    type: 'task',    status: 'completed', x: 220, y: 150 },
  { id: 'gateway',  label: 'Amount > $10K?',    type: 'gateway', status: 'active',    x: 400, y: 150 },
  { id: 'vp',       label: 'VP Approval',       type: 'task',    status: 'pending',   x: 560, y: 80 },
  { id: 'finance',  label: 'Finance Review',    type: 'task',    status: 'pending',   x: 560, y: 220 },
  { id: 'end',      label: 'Approved',          type: 'end',     status: 'pending',   x: 720, y: 150 },
];

const APPROVAL_EDGES: ProcessEdge[] = [
  { from: 'start', to: 'review' },
  { from: 'review', to: 'gateway' },
  { from: 'gateway', to: 'vp', label: 'Yes' },
  { from: 'gateway', to: 'finance', label: 'No' },
  { from: 'vp', to: 'end' },
  { from: 'finance', to: 'end' },
];

interface ProcessInstance {
  id: string;
  name: string;
  startedBy: string;
  startedAt: string;
  currentStep: string;
  status: 'Running' | 'Completed' | 'Suspended';
  priority: 'High' | 'Medium' | 'Low';
}

const MOCK_INSTANCES: ProcessInstance[] = [
  { id: 'PI-001', name: 'Purchase Order Approval',  startedBy: 'Sarah Mitchell', startedAt: '2026-04-12 08:30', currentStep: 'VP Approval',    status: 'Running',   priority: 'High' },
  { id: 'PI-002', name: 'Vendor Onboarding',        startedBy: 'James Rodriguez',startedAt: '2026-04-11 14:20', currentStep: 'Finance Review',  status: 'Running',   priority: 'Medium' },
  { id: 'PI-003', name: 'Budget Reallocation',       startedBy: 'Emily Chen',     startedAt: '2026-04-10 09:15', currentStep: 'Completed',       status: 'Completed', priority: 'Low' },
  { id: 'PI-004', name: 'Contract Renewal',          startedBy: 'Michael Thompson',startedAt: '2026-04-09 16:45',currentStep: 'Manager Review',  status: 'Running',   priority: 'High' },
  { id: 'PI-005', name: 'Employee Access Request',   startedBy: 'Lisa Park',      startedAt: '2026-04-09 11:00', currentStep: 'Suspended',       status: 'Suspended', priority: 'Medium' },
];

export default function BPMSPage() {
  const [selectedProcess, setSelectedProcess] = useState<string | null>('PI-001');

  const nodeColors: Record<string, { bg: string; border: string; text: string }> = {
    completed: { bg: tokens.colors.success.light, border: tokens.colors.success.base, text: tokens.colors.success.dark },
    active:    { bg: tokens.colors.info.light,    border: tokens.colors.info.base,    text: tokens.colors.info.dark },
    pending:   { bg: tokens.colors.neutral[100],  border: tokens.colors.neutral[300], text: tokens.colors.neutral[500] },
  };

  return (
    <>
      <TopBar title="BPMS" subtitle="Business Process Management - Workflow Engine" />
      <motion.div variants={pageTransition} initial="initial" animate="animate" className="p-8">

        {/* DAG Visualizer */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-neutral-800">Purchase Order Approval</h3>
              <p className="text-xs text-neutral-400 mt-0.5">BPMN Process Definition - DAG Execution View</p>
            </div>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              Exclusive Gateway (XOR)
            </span>
          </div>

          <svg width="100%" height="300" viewBox="0 0 800 300" className="overflow-visible">
            {/* Edges */}
            {APPROVAL_EDGES.map((edge) => {
              const from = APPROVAL_NODES.find((n) => n.id === edge.from)!;
              const to = APPROVAL_NODES.find((n) => n.id === edge.to)!;
              const midX = (from.x + to.x) / 2;
              return (
                <g key={`${edge.from}-${edge.to}`}>
                  <motion.path
                    d={`M ${from.x + 40} ${from.y} C ${midX} ${from.y}, ${midX} ${to.y}, ${to.x - 40} ${to.y}`}
                    fill="none"
                    stroke={tokens.colors.neutral[300]}
                    strokeWidth="2"
                    strokeDasharray="6 3"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1, delay: 0.3 }}
                  />
                  {edge.label && (
                    <text x={midX} y={(from.y + to.y) / 2 - 8} textAnchor="middle" className="text-[10px] font-medium fill-neutral-400">
                      {edge.label}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Nodes */}
            {APPROVAL_NODES.map((node, i) => {
              const c = nodeColors[node.status];
              const isGateway = node.type === 'gateway';
              const isCircle = node.type === 'start' || node.type === 'end';
              return (
                <motion.g
                  key={node.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 + i * 0.12 }}
                >
                  {isCircle ? (
                    <circle cx={node.x} cy={node.y} r="22" fill={c.bg} stroke={c.border} strokeWidth="2" />
                  ) : isGateway ? (
                    <rect x={node.x - 28} y={node.y - 28} width="56" height="56" rx="6"
                      fill={c.bg} stroke={c.border} strokeWidth="2"
                      transform={`rotate(45 ${node.x} ${node.y})`}
                    />
                  ) : (
                    <rect x={node.x - 55} y={node.y - 22} width="110" height="44" rx="8"
                      fill={c.bg} stroke={c.border} strokeWidth="2"
                    />
                  )}
                  <text x={node.x} y={node.y + 4} textAnchor="middle" className="text-[11px] font-medium" fill={c.text}>
                    {node.label.length > 16 ? node.label.slice(0, 14) + '...' : node.label}
                  </text>
                  {node.status === 'active' && (
                    <motion.circle
                      cx={node.x} cy={node.y} r="32"
                      fill="none" stroke={tokens.colors.info.base} strokeWidth="1.5"
                      initial={{ opacity: 0.6, scale: 1 }}
                      animate={{ opacity: 0, scale: 1.5 }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  )}
                </motion.g>
              );
            })}
          </svg>
        </motion.div>

        {/* Process Instances Table */}
        <motion.div variants={staggerContainer} initial="initial" animate="animate" className="rounded-xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-neutral-100">
            <h3 className="text-sm font-semibold text-neutral-800">Active Process Instances</h3>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-100 bg-neutral-50">
                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-500">ID</th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Process</th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Started By</th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Current Step</th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Priority</th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Status</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_INSTANCES.map((inst) => (
                <motion.tr
                  key={inst.id}
                  variants={staggerItem}
                  className={`border-b border-neutral-50 cursor-pointer transition-colors ${
                    selectedProcess === inst.id ? 'bg-primary-50' : 'hover:bg-neutral-50'
                  }`}
                  onClick={() => setSelectedProcess(inst.id)}
                >
                  <td className="px-6 py-4 text-sm font-mono font-medium text-primary-600">{inst.id}</td>
                  <td className="px-6 py-4 text-sm text-neutral-800">{inst.name}</td>
                  <td className="px-6 py-4 text-sm text-neutral-600">{inst.startedBy}</td>
                  <td className="px-6 py-4 text-sm text-neutral-600">{inst.currentStep}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                      inst.priority === 'High' ? 'bg-red-50 text-red-700' :
                      inst.priority === 'Medium' ? 'bg-amber-50 text-amber-700' :
                      'bg-neutral-100 text-neutral-600'
                    }`}>
                      {inst.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                      inst.status === 'Running' ? 'bg-blue-50 text-blue-700' :
                      inst.status === 'Completed' ? 'bg-green-50 text-green-700' :
                      'bg-amber-50 text-amber-700'
                    }`}>
                      {inst.status === 'Running' && <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />}
                      {inst.status}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      </motion.div>
    </>
  );
}
