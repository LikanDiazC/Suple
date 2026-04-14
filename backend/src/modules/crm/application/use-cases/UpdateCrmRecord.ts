import { Injectable, Inject } from '@nestjs/common';
import { Result } from '../../../../shared/kernel';
import {
  ICrmRecordRepository,
  CRM_RECORD_REPOSITORY,
} from '../../domain/repositories/ICrmRecordRepository';
import { PropertySource } from '../../domain/entities/CrmRecord';
import { UpdateCrmRecordDto, CrmRecordResponseDto, mapRecordToDto } from '../dtos/CrmRecordDto';

/**
 * ==========================================================================
 * Update CRM Record Use Case
 * ==========================================================================
 *
 * Partial property update on a CRM record.
 * Syncs hot-path columns automatically via CrmRecord.setProperties().
 * ==========================================================================
 */
@Injectable()
export class UpdateCrmRecordUseCase {
  constructor(
    @Inject(CRM_RECORD_REPOSITORY)
    private readonly repo: ICrmRecordRepository,
  ) {}

  async execute(
    tenantId: string,
    recordId: string,
    dto: UpdateCrmRecordDto,
    updatedBy: string,
  ): Promise<Result<CrmRecordResponseDto>> {
    const record = await this.repo.findById(tenantId, recordId);
    if (!record) {
      return Result.fail(`Record ${recordId} not found`);
    }

    record.setProperties(dto.properties, updatedBy, PropertySource.API);
    await this.repo.save(record);

    return Result.ok(mapRecordToDto(record));
  }
}
