import { Injectable } from '@nestjs/common';
import { Board, BoardStatus } from '../../domain/entities/Board';
import { IBoardRepository, BoardQuery } from '../../domain/repositories/IBoardRepository';

@Injectable()
export class InMemoryBoardRepository implements IBoardRepository {
  private readonly store = new Map<string, Board>();

  async findById(tenantId: string, id: string): Promise<Board | null> {
    const board = this.store.get(id);
    return board?.tenantId === tenantId ? board : null;
  }

  async findAvailable(query: BoardQuery): Promise<Board[]> {
    return [...this.store.values()].filter(b => {
      if (b.tenantId !== query.tenantId) return false;
      if (query.availableOnly && b.status !== BoardStatus.AVAILABLE) return false;
      if (query.materialSku && !b.materialSku.equals(query.materialSku)) return false;
      if (query.thickness   && !b.thickness.equals(query.thickness))     return false;
      return true;
    });
  }

  async findByIds(tenantId: string, ids: string[]): Promise<Board[]> {
    return ids
      .map(id => this.store.get(id))
      .filter((b): b is Board => !!b && b.tenantId === tenantId);
  }

  async save(board: Board): Promise<void> {
    this.store.set(board.id.toString(), board);
  }

  async saveMany(boards: Board[]): Promise<void> {
    boards.forEach(b => this.store.set(b.id.toString(), b));
  }
}
