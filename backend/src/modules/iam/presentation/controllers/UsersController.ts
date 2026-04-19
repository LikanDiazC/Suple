import { Body, Controller, Get, Param, Patch, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { Inject } from '@nestjs/common';
import { IUserRepository, USER_REPOSITORY } from '../../domain/repositories/IUserRepository';
import { JwtAuthGuard } from '../../infrastructure/guards/JwtAuthGuard';

@Controller('api/iam')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
  ) {}

  @Get('users')
  async listUsers() {
    return this.users.listByTenant();
  }

  @Patch('users/:id/manager')
  async setManager(
    @Param('id') userId: string,
    @Body() body: { managerId: string | null },
    @Req() req: Request,
  ) {
    if (!req.authenticatedUser) throw new UnauthorizedException();
    await this.users.setManager(userId, body.managerId ?? null);
    return { ok: true };
  }
}
