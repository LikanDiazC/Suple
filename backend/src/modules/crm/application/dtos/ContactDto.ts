import { DuplicateVerdict } from '../../domain/services/EntityResolutionService';

export interface CreateContactDto {
  firstName: string;
  lastName: string;
  email: string;
  phoneCountryCode?: string;
  phoneNumber?: string;
  companyName?: string;
  source: string;
}

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
