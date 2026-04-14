import {
  IsString,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsArray,
  ValidateNested,
  IsNumber,
  IsIn,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * ==========================================================================
 * CRM Record DTOs — Validated with class-validator
 * ==========================================================================
 *
 * AUDIT FIX #1: All input DTOs are decorated with validation constraints.
 *
 * The global ValidationPipe (whitelist: true, forbidNonWhitelisted: true)
 * ensures that:
 *   1. Only declared + decorated properties pass through.
 *   2. Unknown properties (e.g. $gt, __proto__) throw 400 immediately.
 *   3. Type coercion (string→number for query params) is automatic.
 *
 * This closes the mass-assignment vector identified in the audit.
 * ==========================================================================
 */

// --- Nested Types ---

class AssociationDto {
  @IsString()
  @IsNotEmpty()
  toObjectType!: string;

  @IsString()
  @IsNotEmpty()
  toRecordId!: string;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  labelIds?: number[];
}

// --- Request DTOs ---

export class CreateCrmRecordDto {
  /** Overridden by the :objectType URL param in the controller */
  @IsOptional()
  @IsString()
  @IsIn(['contacts', 'companies', 'deals', 'tickets'], {
    message: 'objectType debe ser: contacts, companies, deals, tickets',
  })
  objectType!: string;

  @IsObject({ message: '"properties" debe ser un objeto.' })
  @IsNotEmpty({ message: '"properties" no puede estar vacío.' })
  properties!: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssociationDto)
  associations?: AssociationDto[];
}

export class UpdateCrmRecordDto {
  @IsObject({ message: '"properties" debe ser un objeto.' })
  @IsNotEmpty({ message: '"properties" no puede estar vacío.' })
  properties!: Record<string, unknown>;
}

export class ListCrmRecordsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(200, { message: '"limit" no puede exceder 200 registros.' })
  limit?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  sort?: string;

  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc';

  @IsOptional()
  @IsString()
  @MaxLength(200, { message: 'Búsqueda excede largo máximo.' })
  search?: string;

  // NOTE: dynamic filters ([key: string]) removed intentionally.
  // The ValidationPipe with forbidNonWhitelisted will reject any
  // extra query params, preventing NoSQL injection via query strings.
  // Filters should be passed via the 'search' param or a dedicated
  // 'filters' JSON string param if needed in the future.
}

// --- Response DTOs (outbound — no validation needed) ---

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
