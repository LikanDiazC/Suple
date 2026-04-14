/**
 * ==========================================================================
 * CRM Record DTOs
 * ==========================================================================
 */

// --- Request DTOs ---

export class CreateCrmRecordDto {
  objectType!: string;          // "contacts" | "companies" | "deals" | "tickets"
  properties!: Record<string, unknown>;
  associations?: {
    toObjectType: string;
    toRecordId: string;
    labelIds?: number[];
  }[];
}

export class UpdateCrmRecordDto {
  properties!: Record<string, unknown>;
}

export class ListCrmRecordsQueryDto {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  search?: string;
  [key: string]: unknown;      // Dynamic filters
}

// --- Response DTOs ---

export class CrmRecordResponseDto {
  id!: string;
  objectType!: string;
  displayName!: string;
  properties!: Record<string, unknown>;
  createdAt!: string;
  updatedAt!: string;
}

export class DuplicateWarningResponseDto {
  recordId!: string;
  displayName!: string;
  confidence!: number;
  verdict!: string;
  matchReasons!: string[];
}

export class CreateCrmRecordResultDto {
  record?: CrmRecordResponseDto;
  duplicates!: DuplicateWarningResponseDto[];
  autoAssociations!: { companyId: string; companyName: string; domain: string; reason: string }[];
  blocked!: boolean;
}

export class ListCrmRecordsResultDto {
  results!: CrmRecordResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;
}

// --- Mappers ---

export function mapRecordToDto(record: {
  id: { toString(): string };
  objectType: string;
  displayName: string;
  properties: ReadonlyMap<string, { value: unknown }>;
  createDate: Date;
}): CrmRecordResponseDto {
  const props: Record<string, unknown> = {};
  record.properties.forEach((pv, key) => {
    props[key] = pv.value;
  });

  return {
    id: record.id.toString(),
    objectType: record.objectType,
    displayName: record.displayName,
    properties: props,
    createdAt: record.createDate.toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
