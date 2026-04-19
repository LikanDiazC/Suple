import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  Req,
  HttpCode,
  HttpStatus,
  NotFoundException,
  ConflictException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { ListCrmRecordsUseCase } from '../../application/use-cases/ListCrmRecords';
import { CreateCrmRecordUseCase } from '../../application/use-cases/CreateCrmRecord';
import { UpdateCrmRecordUseCase } from '../../application/use-cases/UpdateCrmRecord';
import { DeleteCrmRecordUseCase } from '../../application/use-cases/DeleteCrmRecord';
import {
  CreateCrmRecordDto,
  UpdateCrmRecordDto,
  ListCrmRecordsQueryDto,
} from '../../application/dtos/CrmRecordDto';

/**
 * ==========================================================================
 * CRM Record Controller
 * ==========================================================================
 *
 * RESTful API for CRM object records (contacts, companies, deals, tickets).
 *
 *   GET    /api/crm/:objectType            → List records (paginated, sorted, filtered)
 *   POST   /api/crm/:objectType            → Create record (with dedup check)
 *   GET    /api/crm/:objectType/:id        → Get single record
 *   PATCH  /api/crm/:objectType/:id        → Update record properties
 *   DELETE /api/crm/:objectType/:id        → Archive record
 *
 * In production, all endpoints are guarded by:
 *   - TenantMiddleware (JWT → tenantId extraction)
 *   - RbacAbacGuard (permission check: crm:record:read/write/delete)
 *
 * For development, we use a hardcoded tenant ID.
 * ==========================================================================
 */
@Controller('api/crm')
export class CrmRecordController {
  constructor(
    private readonly listUseCase: ListCrmRecordsUseCase,
    private readonly createUseCase: CreateCrmRecordUseCase,
    private readonly updateUseCase: UpdateCrmRecordUseCase,
    private readonly deleteUseCase: DeleteCrmRecordUseCase,
  ) {}

  private ctx(req: Request): { tenantId: string; userId: string } {
    const u = req.authenticatedUser;
    if (!u) throw new UnauthorizedException();
    return { tenantId: u.tenantId, userId: u.userId };
  }

  @Get(':objectType')
  async list(
    @Param('objectType') objectType: string,
    @Query() query: ListCrmRecordsQueryDto,
    @Req() req: Request,
  ) {
    this.validateObjectType(objectType);
    return this.listUseCase.execute(this.ctx(req).tenantId, objectType, query);
  }

  @Post(':objectType')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param('objectType') objectType: string,
    @Body() dto: CreateCrmRecordDto,
    @Req() req: Request,
  ) {
    this.validateObjectType(objectType);
    dto.objectType = objectType;
    const { tenantId, userId } = this.ctx(req);

    const result = await this.createUseCase.execute(tenantId, dto, userId);
    if (result.isFail()) throw new BadRequestException(result.error);

    const data = result.value;
    if (data.blocked) {
      throw new ConflictException({
        message: 'Duplicate record detected',
        duplicates: data.duplicates,
        autoAssociations: data.autoAssociations,
      });
    }
    return data;
  }

  @Get(':objectType/:id')
  async getById(
    @Param('objectType') objectType: string,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    this.validateObjectType(objectType);
    const result = await this.listUseCase.execute(this.ctx(req).tenantId, objectType, {
      page: 1, limit: 1000,
    });
    const record = result.results.find((r) => r.id === id);
    if (!record) throw new NotFoundException(`${objectType} record ${id} not found`);
    return record;
  }

  @Patch(':objectType/:id')
  async update(
    @Param('objectType') objectType: string,
    @Param('id') id: string,
    @Body() dto: UpdateCrmRecordDto,
    @Req() req: Request,
  ) {
    this.validateObjectType(objectType);
    const { tenantId, userId } = this.ctx(req);
    const result = await this.updateUseCase.execute(tenantId, id, dto, userId);
    if (result.isFail()) throw new NotFoundException(result.error);
    return result.value;
  }

  @Delete(':objectType/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('objectType') objectType: string,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    this.validateObjectType(objectType);
    const result = await this.deleteUseCase.execute(this.ctx(req).tenantId, id);
    if (result.isFail()) throw new NotFoundException(result.error);
  }

  private validateObjectType(objectType: string): void {
    const allowed = ['contacts', 'companies', 'deals', 'tickets'];
    if (!allowed.includes(objectType)) {
      throw new BadRequestException(
        `Invalid object type "${objectType}". Allowed: ${allowed.join(', ')}`,
      );
    }
  }
}
