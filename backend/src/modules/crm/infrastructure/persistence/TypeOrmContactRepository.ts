import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { Contact, ContactSource, ContactStatus } from '../../domain/entities/Contact';
import { Email } from '../../domain/value-objects/Email';
import { IContactRepository } from '../../domain/repositories/IContactRepository';
import { EntityCandidate } from '../../domain/services/EntityResolutionService';
import { CrmRecordOrmEntity } from './CrmRecordOrmEntity';
import { UniqueId } from '../../../../shared/kernel';

/**
 * Contacts are stored in the `crm_records` table with object_type='contacts'.
 * Reuses the JSONB property bag for arbitrary contact attributes.
 */
@Injectable()
export class TypeOrmContactRepository implements IContactRepository {
  constructor(
    @InjectRepository(CrmRecordOrmEntity)
    private readonly repo: Repository<CrmRecordOrmEntity>,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async findById(_tenantId: string, id: string): Promise<Contact | null> {
    const row = await this.dataSource.transaction((mgr) =>
      mgr.findOne(CrmRecordOrmEntity, { where: { id, objectType: 'contacts' } }),
    );
    return row ? this.toDomain(row) : null;
  }

  async findByEmail(_tenantId: string, email: string): Promise<Contact | null> {
    const row = await this.dataSource.transaction((mgr) =>
      mgr.findOne(CrmRecordOrmEntity, {
        where: { email: email.toLowerCase(), objectType: 'contacts' },
      }),
    );
    return row ? this.toDomain(row) : null;
  }

  async save(contact: Contact): Promise<void> {
    const props = {
      first_name: contact.firstName,
      last_name: contact.lastName,
      email: contact.email.toString(),
      phone: contact.phone?.toString(),
      company_name: contact.companyName,
      source: (contact as unknown as { props: { source: ContactSource } }).props.source,
      status: contact.status,
    };

    await this.dataSource.transaction((mgr) =>
      mgr.upsert(
        CrmRecordOrmEntity,
        {
          id: contact.id.toString(),
          tenantId: contact.tenantId,
          objectType: 'contacts',
          properties: props,
          email: contact.email.toString().toLowerCase(),
          displayName: contact.fullName,
          archived: contact.status === ContactStatus.ARCHIVED,
          createdBy: 'system',
          updatedAt: new Date(),
        },
        ['id'],
      ),
    );
  }

  async findCandidatesForResolution(
    _tenantId: string,
    firstName: string,
    lastName: string,
    emailDomain: string,
  ): Promise<EntityCandidate[]> {
    const fullName = `${firstName} ${lastName}`.trim();
    return this.dataSource.transaction(async (mgr) => {
      const qb = mgr.createQueryBuilder(CrmRecordOrmEntity, 'r')
        .where(`r.object_type = 'contacts' AND r.archived = FALSE`)
        .andWhere(`(similarity(r.display_name, :n) > 0.3 OR r.email LIKE :ed)`, {
          n: fullName,
          ed: `%@${emailDomain.toLowerCase()}`,
        })
        .limit(50);

      const rows = await qb.getMany();
      return rows.map((r) => ({
        id: r.id,
        firstName: (r.properties?.first_name as string) ?? '',
        lastName: (r.properties?.last_name as string) ?? '',
        email: r.email ?? '',
        phone: (r.properties?.phone as string) ?? undefined,
      }));
    });
  }

  private toDomain(row: CrmRecordOrmEntity): Contact {
    const p = row.properties as Record<string, unknown>;
    const email = Email.create(String(p.email ?? row.email ?? ''));
    if (email.isFail()) throw new Error(email.error);
    const result = Contact.create(
      row.tenantId,
      String(p.first_name ?? ''),
      String(p.last_name ?? ''),
      email.value,
      (p.source as ContactSource) ?? ContactSource.MANUAL,
    );
    if (result.isFail()) throw new Error(result.error);
    // Override id (since rehydrate doesn't exist)
    Object.defineProperty(result.value, 'id', { value: UniqueId.from(row.id), writable: false });
    return result.value;
  }
}
