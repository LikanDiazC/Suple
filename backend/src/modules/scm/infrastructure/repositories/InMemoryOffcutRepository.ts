import { Injectable } from '@nestjs/common';
import { Offcut, OffcutStatus } from '../../domain/entities/Offcut';
import { IOffcutRepository, OffcutQuery } from '../../domain/repositories/IOffcutRepository';
import { BaseInMemoryRepository } from '../../../../shared/infrastructure/BaseInMemoryRepository';

@Injectable()
export class InMemoryOffcutRepository
  extends BaseInMemoryRepository<Offcut>
  implements IOffcutRepository
{
  async findAvailable(query: OffcutQuery): Promise<Offcut[]> {
    return this.allForTenant(query.tenantId).filter((o) => {
      if (query.availableOnly && o.status !== OffcutStatus.AVAILABLE) return false;
      if (query.materialSku && !o.materialSku.equals(query.materialSku)) return false;
      if (query.thickness && !o.thickness.equals(query.thickness)) return false;
      if (query.minWidthMm && o.dimensions.widthMm < query.minWidthMm) return false;
      if (query.minHeightMm && o.dimensions.heightMm < query.minHeightMm) return false;
      return true;
    });
  }
}
