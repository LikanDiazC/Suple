import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { Rut } from '../../domain/value-objects/Rut';
import { ISiiRepository, SII_REPOSITORY } from '../../domain/repositories/ISiiRepository';
import { AuthWithSiiDto, AuthWithSiiResponseDto } from '../dtos/SiiDto';

/**
 * ==========================================================================
 * AuthWithSII — Use Case
 * ==========================================================================
 *
 * Authenticates a taxpayer with the SII using Clave Tributaria.
 *
 * SECURITY:
 *  1. Validates RUT with Mod-11 before attempting auth (saves SII API calls).
 *  2. Credentials (password) are passed directly to the SII proxy client
 *     and NEVER stored in memory beyond this function scope.
 *  3. Returns an encrypted, short-lived session token.
 *  4. Rate limiting is enforced at the controller layer (not here).
 *
 * ==========================================================================
 */
@Injectable()
export class AuthWithSIIUseCase {
  constructor(
    @Inject(SII_REPOSITORY)
    private readonly siiRepo: ISiiRepository,
  ) {}

  async execute(dto: AuthWithSiiDto): Promise<AuthWithSiiResponseDto> {
    // 1. Validate RUT (domain rule — Mod-11)
    let rut: Rut;
    try {
      rut = Rut.create(dto.rut);
    } catch (error: unknown) {
      throw new UnauthorizedException(
        error instanceof Error ? error.message : 'RUT inválido.'
      );
    }

    // 2. Attempt SII authentication via proxy (credentials never stored)
    const encryptedToken = await this.siiRepo.authenticateWithClaveTributaria(
      rut.body,
      dto.password,
    );

    // 3. Session expires in 30 minutes (SII standard)
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    // 4. Clear password reference (belt-and-suspenders)
    const result: AuthWithSiiResponseDto = {
      sessionToken: encryptedToken,
      expiresAt,
      rutMasked: rut.toString(), // shows XX.XXX.XXX-* (masked)
    };

    // Explicitly null out dto.password from scope
    (dto as { password?: string }).password = undefined;

    return result;
  }
}
