import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserOrmEntity, UserRoleOrmEntity } from './infrastructure/persistence/UserOrmEntity';
import { TenantOrmEntity } from './infrastructure/persistence/TenantOrmEntity';
import { RoleOrmEntity } from './infrastructure/persistence/RoleOrmEntity';
import { TypeOrmUserRepository } from './infrastructure/persistence/TypeOrmUserRepository';
import { USER_REPOSITORY } from './domain/repositories/IUserRepository';
import { JwtService } from './infrastructure/services/JwtService';
import { LoginUseCase } from './application/use-cases/LoginUseCase';
import { ChangePasswordUseCase } from './application/use-cases/ChangePasswordUseCase';
import { InviteUserUseCase } from './application/use-cases/InviteUserUseCase';
import { AuthController } from './presentation/controllers/AuthController';
import { UsersController } from './presentation/controllers/UsersController';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserOrmEntity, UserRoleOrmEntity, TenantOrmEntity, RoleOrmEntity]),
  ],
  controllers: [AuthController, UsersController],
  providers: [
    JwtService,
    { provide: USER_REPOSITORY, useClass: TypeOrmUserRepository },
    LoginUseCase,
    ChangePasswordUseCase,
    InviteUserUseCase,
  ],
  exports: [USER_REPOSITORY, JwtService],
})
export class IamModule {}
