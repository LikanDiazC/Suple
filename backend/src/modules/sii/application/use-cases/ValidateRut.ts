import { Injectable } from '@nestjs/common';
import { Rut } from '../../domain/value-objects/Rut';

/**
 * ==========================================================================
 * ValidateRut — Use Case
 * ==========================================================================
 *
 * Validates a Chilean RUT using the domain value object (Mod-11 algorithm).
 * This is the authoritative server-side validation — clients may also
 * validate for UX, but server validation is the security gate.
 *
 * ==========================================================================
 */
@Injectable()
export class ValidateRutUseCase {
  execute(rawRut: string): { valid: boolean; formatted?: string; error?: string } {
    try {
      const rut = Rut.create(rawRut);
      return {
        valid: true,
        formatted: rut.toFullString(),
      };
    } catch (error: unknown) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'RUT inválido.',
      };
    }
  }
}
