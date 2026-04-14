import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  HttpCode,
  HttpStatus,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
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
  // Dev-mode hardcoded tenant
  private readonly DEV_TENANT = 'tnt_demo01';
  private readonly DEV_USER = 'user_dev';

  constructor(
    private readonly listUseCase: ListCrmRecordsUseCase,
    private readonly createUseCase: CreateCrmRecordUseCase,
    private readonly updateUseCase: UpdateCrmRecordUseCase,
    private readonly deleteUseCase: DeleteCrmRecordUseCase,
  ) {}

  /**
   * GET /api/crm/:objectType?page=1&limit=25&sort=create_date&order=desc&search=...
   */
  @Get(':objectType')
  async list(
    @Param('objectType') objectType: string,
    @Query() query: ListCrmRecordsQueryDto,
  ) {
    this.validateObjectType(objectType);
    return this.listUseCase.execute(this.DEV_TENANT, objectType, query);
  }

  /**
   * POST /api/crm/:objectType
   * Body: { properties: { ... }, associations?: [...] }
   */
  @Post(':objectType')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param('objectType') objectType: string,
    @Body() dto: CreateCrmRecordDto,
  ) {
    this.validateObjectType(objectType);
    dto.objectType = objectType;

    const result = await this.createUseCase.execute(this.DEV_TENANT, dto, this.DEV_USER);

    if (result.isFail()) {
      throw new BadRequestException(result.error);
    }

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

  /**
   * GET /api/crm/:objectType/:id
   */
  @Get(':objectType/:id')
  async getById(
    @Param('objectType') objectType: string,
    @Param('id') id: string,
  ) {
    this.validateObjectType(objectType);

    // Use the list use case with a filter is overkill; add direct findById later
    // For now, return from the list
    const result = await this.listUseCase.execute(this.DEV_TENANT, objectType, {
      page: 1,
      limit: 1000,
    });

    const record = result.results.find((r) => r.id === id);
    if (!record) {
      throw new NotFoundException(`${objectType} record ${id} not found`);
    }

    return record;
  }

  /**
   * PATCH /api/crm/:objectType/:id
   * Body: { properties: { field: value, ... } }
   */
  @Patch(':objectType/:id')
  async update(
    @Param('objectType') objectType: string,
    @Param('id') id: string,
    @Body() dto: UpdateCrmRecordDto,
  ) {
    this.validateObjectType(objectType);

    const result = await this.updateUseCase.execute(this.DEV_TENANT, id, dto, this.DEV_USER);

    if (result.isFail()) {
      throw new NotFoundException(result.error);
    }

    return result.value;
  }

  /**
   * DELETE /api/crm/:objectType/:id
   */
  @Delete(':objectType/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('objectType') objectType: string,
    @Param('id') id: string,
  ) {
    this.validateObjectType(objectType);

    const result = await this.deleteUseCase.execute(this.DEV_TENANT, id);

    if (result.isFail()) {
      throw new NotFoundException(result.error);
    }
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
