import { Injectable, Inject } from '@nestjs/common';
import {
  ICrmRecordRepository,
  CRM_RECORD_REPOSITORY,
} from '../../domain/repositories/ICrmRecordRepository';
import {
  ListCrmRecordsResultDto,
  ListCrmRecordsQueryDto,
  mapRecordToDto,
} from '../dtos/CrmRecordDto';

/**
 * ==========================================================================
 * List CRM Records Use Case
 * ==========================================================================
 *
 * Server-side list with:
 *   - Pagination (page + limit)
 *   - Sort (any property, asc/desc)
 *   - Full-text search across all property values
 *   - Property-level filters
 *
 * Maps domain entities to DTOs for the presentation layer.
 * ==========================================================================
 */
@Injectable()
export class ListCrmRecordsUseCase {
  constructor(
    @Inject(CRM_RECORD_REPOSITORY)
    private readonly repo: ICrmRecordRepository,
  ) {}

  async execute(
    tenantId: string,
    objectType: string,
    query: ListCrmRecordsQueryDto,
  ): Promise<ListCrmRecordsResultDto> {
    const { page = 1, limit = 25, sort = 'create_date', order = 'desc', search, ...filters } = query;

    const cleanFilters: Record<string, string> = {};
    for (const [key, value] of Object.entries(filters)) {
      if (typeof value === 'string' && value.length > 0) {
        cleanFilters[key] = value;
      }
    }

    const result = await this.repo.list({
      tenantId,
      objectType,
      page,
      limit,
      sortBy: sort,
      sortOrder: order,
      search: search || undefined,
      filters: Object.keys(cleanFilters).length > 0 ? cleanFilters : undefined,
    });

    return {
      results: result.records.map(mapRecordToDto),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }
}
