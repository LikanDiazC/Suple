import { Injectable, Inject } from '@nestjs/common';
import { Result } from '../../../../shared/kernel';
import {
  ICrmRecordRepository,
  CRM_RECORD_REPOSITORY,
} from '../../domain/repositories/ICrmRecordRepository';

/**
 * ==========================================================================
 * Delete (Archive) CRM Record Use Case
 * ==========================================================================
 *
 * Soft-deletes a record by setting archived=true.
 * The record remains in the database for audit trail.
 * ==========================================================================
 */
@Injectable()
export class DeleteCrmRecordUseCase {
  constructor(
    @Inject(CRM_RECORD_REPOSITORY)
    private readonly repo: ICrmRecordRepository,
  ) {}

  async execute(tenantId: string, recordId: string): Promise<Result<void>> {
    const record = await this.repo.findById(tenantId, recordId);
    if (!record) {
      return Result.fail(`Record ${recordId} not found`);
    }

    await this.repo.archive(tenantId, recordId);
    return Result.ok(undefined);
  }
}
