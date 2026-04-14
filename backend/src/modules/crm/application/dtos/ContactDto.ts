import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsOptional,
  MaxLength,
  Matches,
} from 'class-validator';
import { DuplicateVerdict } from '../../domain/services/EntityResolutionService';

/**
 * ==========================================================================
 * Contact DTOs — Validated with class-validator
 * ==========================================================================
 *
 * AUDIT FIX #1: Converted from plain interfaces to decorated classes.
 * Interfaces cannot carry runtime metadata (decorators), so class-validator
 * requires concrete classes for input DTOs.
 *
 * Response DTOs remain as interfaces (outbound, no validation needed).
 * ==========================================================================
 */

// --- Request DTO (input — validated by pipe) ---

export class CreateContactDto {
  @IsString()
  @IsNotEmpty({ message: '"firstName" es requerido.' })
  @MaxLength(100)
  firstName!: string;

  @IsString()
  @IsNotEmpty({ message: '"lastName" es requerido.' })
  @MaxLength(100)
  lastName!: string;

  @IsEmail({}, { message: '"email" debe ser un correo válido.' })
  @IsNotEmpty()
  @MaxLength(254)
  email!: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+?\d{1,4}$/, { message: '"phoneCountryCode" inválido (ej: +56).' })
  phoneCountryCode?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{7,15}$/, { message: '"phoneNumber" debe contener solo dígitos (7-15).' })
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  companyName?: string;

  @IsString()
  @IsNotEmpty({ message: '"source" es requerido.' })
  @MaxLength(50)
  source!: string;
}

// --- Response DTOs (outbound — no validation needed) ---

export interface ContactResponseDto {
  id: string;
  tenantId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  companyName?: string;
  status: string;
}

export interface DuplicateWarningDto {
  matchedContactId: string;
  confidence: number;
  verdict: DuplicateVerdict;
  nameScore: number;
  emailScore: number;
  phoneScore: number;
  companyScore: number;
}

export interface CreateContactResultDto {
  contact?: ContactResponseDto;
  duplicates: DuplicateWarningDto[];
  blocked: boolean;
}
