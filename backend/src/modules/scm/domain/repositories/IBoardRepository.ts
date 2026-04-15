import { Board } from '../entities/Board';
import { MaterialSku } from '../value-objects/MaterialSku';
import { Thickness } from '../value-objects/Thickness';

export interface BoardQuery {
  tenantId:      string;
  materialSku?:  MaterialSku;
  thickness?:    Thickness;
  availableOnly: boolean;
}

export interface IBoardRepository {
  findById(tenantId: string, id: string): Promise<Board | null>;
  findAvailable(query: BoardQuery): Promise<Board[]>;
  findByIds(tenantId: string, ids: string[]): Promise<Board[]>;
  save(board: Board): Promise<void>;
  saveMany(boards: Board[]): Promise<void>;
}

export const BOARD_REPOSITORY = Symbol('IBoardRepository');
