import { Injectable } from '@nestjs/common';
import { Board, BoardStatus } from '../../domain/entities/Board';
import { IBoardRepository, BoardQuery } from '../../domain/repositories/IBoardRepository';
import { BaseInMemoryRepository } from '../../../../shared/infrastructure/BaseInMemoryRepository';

@Injectable()
export class InMemoryBoardRepository
  extends BaseInMemoryRepository<Board>
  implements IBoardRepository
{
  async findAvailable(query: BoardQuery): Promise<Board[]> {
    return this.allForTenant(query.tenantId).filter((b) => {
      if (query.availableOnly && b.status !== BoardStatus.AVAILABLE) return false;
      if (query.materialSku && !b.materialSku.equals(query.materialSku)) return false;
      if (query.thickness && !b.thickness.equals(query.thickness)) return false;
      return true;
    });
  }
}
