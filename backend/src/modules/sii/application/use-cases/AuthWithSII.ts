import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { Rut } from '../../domain/value-objects/Rut';
import { ISiiRepository, SII_REPOSITORY } from '../../domain/repositories/ISiiRepository';
import { AuthWithSiiDto, AuthWithSiiResponseDto } from '../dtos/SiiDto';

/**
 * ==========================================================================
 * AuthWithSII — Use Case
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
    // CORRECCIÓN: Enviamos el RUT completo para no perder el dígito verificador
    const encryptedToken = await this.siiRepo.authenticateWithClaveTributaria(
      rut.toFullString(), 
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