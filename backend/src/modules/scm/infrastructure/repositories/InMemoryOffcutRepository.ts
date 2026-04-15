import { Injectable } from '@nestjs/common';
import { Offcut, OffcutStatus } from '../../domain/entities/Offcut';
import { IOffcutRepository, OffcutQuery } from '../../domain/repositories/IOffcutRepository';

@Injectable()
export class InMemoryOffcutRepository implements IOffcutRepository {
  private readonly store = new Map<string, Offcut>();

  async findById(tenantId: string, id: string): Promise<Offcut | null> {
    const o = this.store.get(id);
    return o?.tenantId === tenantId ? o : null;
  }

  async findAvailable(query: OffcutQuery): Promise<Offcut[]> {
    return [...this.store.values()].filter(o => {
      if (o.tenantId !== query.tenantId) return false;
      if (query.availableOnly && o.status !== OffcutStatus.AVAILABLE) return false;
      if (query.materialSku && !o.materialSku.equals(query.materialSku)) return false;
      if (query.thickness   && !o.thickness.equals(query.thickness))     return false;
      if (query.minWidthMm  && o.dimensions.widthMm  < query.minWidthMm)  return false;
      if (query.minHeightMm && o.dimensions.heightMm < query.minHeightMm) return false;
      return true;
    });
  }

  async findByIds(tenantId: string, ids: string[]): Promise<Offcut[]> {
    return ids
      .map(id => this.store.get(id))
      .filter((o): o is Offcut => !!o && o.tenantId === tenantId);
  }

  async save(offcut: Offcut): Promise<void> {
    this.store.set(offcut.id.toString(), offcut);
  }

  async saveMany(offcuts: Offcut[]): Promise<void> {
    offcuts.forEach(o => this.store.set(o.id.toString(), o));
  }
}
