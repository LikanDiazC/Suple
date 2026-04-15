import { Offcut } from '../entities/Offcut';
import { MaterialSku } from '../value-objects/MaterialSku';
import { Thickness } from '../value-objects/Thickness';

export interface OffcutQuery {
  tenantId:      string;
  materialSku?:  MaterialSku;
  thickness?:    Thickness;
  minWidthMm?:   number;
  minHeightMm?:  number;
  availableOnly: boolean;
}

export interface IOffcutRepository {
  findById(tenantId: string, id: string): Promise<Offcut | null>;
  findAvailable(query: OffcutQuery): Promise<Offcut[]>;
  findByIds(tenantId: string, ids: string[]): Promise<Offcut[]>;
  save(offcut: Offcut): Promise<void>;
  saveMany(offcuts: Offcut[]): Promise<void>;
}

export const OFFCUT_REPOSITORY = Symbol('IOffcutRepository');
