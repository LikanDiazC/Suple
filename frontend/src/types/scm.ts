// WorkOrder status flow: PENDING → OPTIMIZING → CUTTING → COMPLETED | CANCELLED
export type WorkOrderStatus = 'PENDING' | 'OPTIMIZING' | 'CUTTING' | 'COMPLETED' | 'CANCELLED';
export type BoardStatus = 'AVAILABLE' | 'RESERVED' | 'CONSUMED' | 'SCRAPPED';
export type OffcutStatus = 'AVAILABLE' | 'RESERVED' | 'CONSUMED';

export interface CuttingRequirement {
  pieceId: string;
  materialSku: string;
  widthMm: number;
  heightMm: number;
  thicknessMm: number;
  quantity: number;
  label?: string;
  allowRotation: boolean;
}

export interface PiecePlacement {
  pieceId: string;
  stockId: string;
  x: number;
  y: number;
  widthMm: number;
  heightMm: number;
  rotated: boolean;
  label?: string;
}

export interface PlannedOffcut {
  x: number;
  y: number;
  widthMm: number;
  heightMm: number;
  materialSku: string;
  thicknessMm: number;
}

export interface BoardAllocation {
  stockId: string;
  stockType: 'BOARD' | 'OFFCUT';
  widthMm: number;
  heightMm: number;
  placements: PiecePlacement[];
  offcuts: PlannedOffcut[];
}

export interface CuttingPlan {
  workOrderId: string;
  boardAllocations: BoardAllocation[];
  unplacedPieceIds: string[];
  totalEfficiencyPct: number;
  svgLayouts: Record<string, string>; // stockId → SVG string
}

export interface WorkOrder {
  id: string;
  tenantId: string;
  status: WorkOrderStatus;
  requirements: CuttingRequirement[];
  cuttingPlan: CuttingPlan | null;
  createdAt: string;
  updatedAt: string;
}

export interface Board {
  id: string;
  tenantId: string;
  materialSku: string;
  widthMm: number;
  heightMm: number;
  thicknessMm: number;
  status: BoardStatus;
  reservedByWorkOrderId?: string;
  supplierId?: string;
  purchasedAt?: string;
}

export interface Offcut {
  id: string;
  tenantId: string;
  materialSku: string;
  widthMm: number;
  heightMm: number;
  thicknessMm: number;
  status: OffcutStatus;
  sourceBoardId: string;
  sourceWorkOrderId: string;
  reservedByWorkOrderId?: string;
}

export interface WorkOrderListResponse {
  items: WorkOrder[];
  total: number;
  page: number;
  limit: number;
}

export interface InventoryResponse {
  boards: Board[];
  offcuts: Offcut[];
}
