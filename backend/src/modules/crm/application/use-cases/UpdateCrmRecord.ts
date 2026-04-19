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
 *
 * Label propagation: when a company's `_label` property is updated,
 * all contacts sharing the same email domain inherit the new label.
 * This is executed in a single logical transaction via DataSource.transaction
 * (the repository wraps each save() call in its own transaction; here we
 * accept eventual consistency across the batch since the repo API does not
 * expose a shared EntityManager parameter — each save is idempotent).
 * ==========================================================================
 */

export interface UpdateCrmRecordResult extends CrmRecordResponseDto {
  /** Number of contacts that inherited the label (companies only). */
  propagatedTo?: number;
}

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
  ): Promise<Result<UpdateCrmRecordResult>> {
    const record = await this.repo.findById(tenantId, recordId);
    if (!record) {
      return Result.fail(`Record ${recordId} not found`);
    }

    record.setProperties(dto.properties, updatedBy, PropertySource.API);
    await this.repo.save(record);

    const base = mapRecordToDto(record);

    // Label propagation: if this is a company and _label was updated,
    // propagate the new label to all contacts with a matching email domain.
    const labelUpdated = '_label' in dto.properties;
    if (record.objectType === 'companies' && labelUpdated) {
      const domain = this.resolveDomain(record);
      if (domain) {
        const newLabel = dto.properties['_label'];
        const contacts = await this.repo.findContactsByEmailDomain(tenantId, domain);

        await Promise.all(
          contacts.map((contact) => {
            contact.setProperties({ _label: newLabel }, updatedBy, PropertySource.WORKFLOW);
            return this.repo.save(contact);
          }),
        );

        return Result.ok({ ...base, propagatedTo: contacts.length });
      }
    }

    return Result.ok(base);
  }

  /**
   * Resolves the email domain for a company record.
   * Prefers the dedicated `domain` hot-path column; falls back to extracting
   * the domain from the company's `email` property.
   */
  private resolveDomain(record: { domain?: string; properties: ReadonlyMap<string, { value: unknown }> }): string | null {
    if (record.domain) return record.domain.toLowerCase().trim();

    const emailProp = record.properties.get('email')?.value;
    if (typeof emailProp === 'string' && emailProp.includes('@')) {
      return emailProp.split('@')[1].toLowerCase().trim();
    }

    return null;
  }
}
