import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards, BadRequestException } from '@nestjs/common';
import { CreateContactUseCase } from '../../application/use-cases/CreateContact';
import { CreateContactDto, CreateContactResultDto } from '../../application/dtos/ContactDto';
import { RbacAbacGuard, RequirePermissions } from '../../../iam/infrastructure/guards/RbacGuard';
import { TenantContext } from '../../../../shared/decorators/TenantScoped';
import { AuthenticatedUser } from '../../../iam/infrastructure/middleware/TenantMiddleware';

/**
 * Presentation layer controller for CRM Contact operations.
 * Demonstrates the full vertical slice from HTTP to domain logic:
 *   Controller -> UseCase -> DomainService -> Repository (port)
 *
 * Security:
 *   - TenantMiddleware (global): JWT validation + tenant extraction.
 *   - RbacAbacGuard: Permission check per endpoint.
 *   - @TenantContext: Injects the verified user context.
 */
@Controller('api/crm/contacts')
@UseGuards(RbacAbacGuard)
export class ContactController {
  constructor(private readonly createContact: CreateContactUseCase) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('crm:contact:write')
  async create(
    @TenantContext() ctx: AuthenticatedUser,
    @Body() dto: CreateContactDto,
  ): Promise<CreateContactResultDto> {
    const result = await this.createContact.execute(ctx.tenantId, dto);

    if (result.isFail()) {
      throw new BadRequestException(result.error);
    }

    return result.value;
  }
}
